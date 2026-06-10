import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { getUserCompanyIds } from '@/lib/user-companies'

// Lazily construct the client — the SDK throws at construction if the key is
// missing, which would 500 the whole route (incl. the GET health check).
let _client: Anthropic | null = null
function getClient(): Anthropic {
  if (!_client) _client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  return _client
}

// ── System prompt ──────────────────────────────────────────────────────────────
const SYSTEM = `You are the Piedro Portal assistant — a B2B ordering portal for Piedro International, a Dutch orthopaedic footwear company.

## What is Piedro Portal
A portal for orthopaedic clinicians and distributors to order custom Piedro footwear. Each order is for a specific patient and includes the shoe model, construction, width, size, and optional additions (modifications to the last).

## Navigation
- **Gallery** — browse Piedro models by section (Kids / Men / Women). Filters: Construction, Closure, Type, Colour, Width, Size. Click a model to see details. Click "Order this model" to start an order.
  - **Search box** matches the model number (style_name). It is a "contains" match: typing "27" finds any model whose number contains 27 (anywhere), NOT only those starting with 27. Use "*" as a wildcard to anchor: "2*" = starts with 2, "*K" = ends with K (the VELCRO variants), "27*9" = starts 27 and ends 9. Do NOT tell the user that typing "2" filters to "starts with 2" — that is false; they must type "2*".
- **My Orders (users)** — list of all orders placed by the company. Shows status, PDF link, repeat button.
- **Dashboard (users)** — KPIs: total, pending, in production, delivered. Top models, monthly trend.
- **Dashboard (admins)** — all companies: best clients, top models, additions heatmap, country chart.
- **Orders (admins)** — all orders from all companies.

## Order form — 3 tabs
**Tab 1 — Customer & Product**
- Customer: company (auto-filled), clinician name, patient name/number, customer reference (required)
- Unit: PAIR (L=R), LEFT only, RIGHT only, L≠R (independent left and right), Different sizes
- Quantity, Construction (select style), Width (select width), Size (EU, type or pick)

**Tab 2 — Additions (optional)**
Sections: Additions (mm modifications to the last), Upper Adaptions, Sole & Heel, Others.
Each field has a checkbox — check to activate and enter the value. Fields with 3D models show a rotating shoe.
In L≠R mode, two independent columns appear (Left / Right).

**Tab 3 — Confirmation**
Reviews all data. Submit Order (generates PDF + sends email). Save Draft (keeps for later). Discard (deletes draft).

## Order statuses
draft → submitted → approved → in_production → shipped → delivered (or cancelled)

## Key concepts
- **colour_id** — full product reference, format "1700.0393.01" (shown in gallery and orders)
- **style_name** — base model number e.g. "3310". K suffix = VELCRO variant (3310K ↔ 3310)
- **Additions** — millimetre modifications applied to the shoe last. Common ones: Toe Box, Hallux Valgus, Bunionette, Hammer Toe, Heel Depth, etc. Each has a 3D model preview.
- **Wishlist** — activate "Wishlist" button in gallery to show heart icons on cards, then select favourites.
- **Repeat order** — in My Orders, click the ↺ icon to duplicate any order as a draft. Opens the pre-filled form for editing.

## What I can do for you
- Answer questions about navigating the portal
- Explain the order process step by step
- Search your company's orders by reference, patient, or model
- Duplicate an existing order with modifications (different size, different patient, etc.)
- Check the status of an order
- Show your most ordered models
- Help troubleshoot any step in the ordering process

## Response style
- Be concise and practical — clinicians are busy
- Respond in the same language the user writes in (EN/NL/FR/DE/PT)
- For actions (duplicating orders, etc.), confirm what you did and what the next step is
- When showing order data, use a clean structured format`

// ── Tool definitions ───────────────────────────────────────────────────────────
const tools: Anthropic.Tool[] = [
  {
    name: 'search_orders',
    description: 'Search the user\'s company orders by reference, patient name, or product model code. Returns a list of matching orders.',
    input_schema: {
      type: 'object' as const,
      properties: {
        q: { type: 'string', description: 'Search text — matches reference_customer, patient_name, or product colour_id' },
      },
      required: ['q'],
    },
  },
  {
    name: 'get_order',
    description: 'Get full details of a specific order by its ID or reference number.',
    input_schema: {
      type: 'object' as const,
      properties: {
        reference: { type: 'string', description: 'Customer reference number (reference_customer field)' },
      },
      required: ['reference'],
    },
  },
  {
    name: 'get_my_orders',
    description: 'List recent orders for this company with status summary.',
    input_schema: {
      type: 'object' as const,
      properties: {
        status: { type: 'string', description: 'Filter by status: draft, submitted, approved, in_production, shipped, delivered (optional)' },
        limit: { type: 'number', description: 'Max number of orders to return (default 10)' },
      },
      required: [],
    },
  },
  {
    name: 'duplicate_order',
    description: 'Duplicate an existing order as a new draft. Optionally change the size, patient name, or reference. Returns the URL to open the draft form.',
    input_schema: {
      type: 'object' as const,
      properties: {
        order_id: { type: 'string', description: 'ID of the order to duplicate' },
        new_size_left: { type: 'number', description: 'Override left size (EU, optional)' },
        new_size_right: { type: 'number', description: 'Override right size (EU, optional)' },
        new_patient: { type: 'string', description: 'Override patient name (optional)' },
        new_reference: { type: 'string', description: 'Override customer reference (optional)' },
      },
      required: ['order_id'],
    },
  },
  {
    name: 'get_top_models',
    description: 'Show the most ordered product models for this company.',
    input_schema: {
      type: 'object' as const,
      properties: {
        limit: { type: 'number', description: 'Number of models to return (default 5)' },
      },
      required: [],
    },
  },
]

// ── Tool executor ──────────────────────────────────────────────────────────────
async function executeTool(
  name: string,
  input: Record<string, unknown>,
  companyIds: string[],
  userId: string,
) {
  const service = createServiceClient()

  switch (name) {
    case 'search_orders': {
      const q = String(input.q ?? '').toLowerCase()
      const { data } = await service
        .from('orders')
        .select('id, status, reference_customer, patient_name, unit, created_at, products(colour_id, color_name, style_name)')
        .in('company_id', companyIds)
        .order('created_at', { ascending: false })
        .limit(50)
      const orders = (data ?? []).filter((o: Record<string, unknown>) => {
        const ref = String(o.reference_customer ?? '').toLowerCase()
        const pat = String(o.patient_name ?? '').toLowerCase()
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const prod = (Array.isArray(o.products) ? o.products[0] : o.products) as any
        const model = String(prod?.colour_id ?? '').toLowerCase()
        return ref.includes(q) || pat.includes(q) || model.includes(q)
      })
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return orders.slice(0, 10).map((o: any) => {
        const prod = Array.isArray(o.products) ? o.products[0] : o.products
        return { id: o.id, reference: o.reference_customer, patient: o.patient_name, status: o.status, model: prod?.colour_id, date: o.created_at?.slice(0, 10) }
      })
    }

    case 'get_order': {
      const ref = String(input.reference ?? '')
      const { data } = await service
        .from('orders')
        .select('id, status, unit, quantity, reference_customer, patient_name, clinician, construction_left, construction_right, width_left, width_right, size_left, size_right, comments, created_at, products(colour_id, color_name, closure, style_name)')
        .in('company_id', companyIds)
        .ilike('reference_customer', `%${ref}%`)
        .limit(1)
        .single()
      if (!data) return { error: `Order with reference "${ref}" not found` }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const prod = (Array.isArray((data as any).products) ? (data as any).products[0] : (data as any).products) as any
      return {
        id: data.id, reference: data.reference_customer, patient: data.patient_name,
        clinician: data.clinician, status: data.status, unit: data.unit, quantity: data.quantity,
        model: prod?.colour_id, color: prod?.color_name, closure: prod?.closure,
        construction_left: data.construction_left, construction_right: data.construction_right,
        width_left: data.width_left, width_right: data.width_right,
        size_left: data.size_left, size_right: data.size_right,
        comments: data.comments, date: data.created_at?.slice(0, 10),
      }
    }

    case 'get_my_orders': {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let q: any = service
        .from('orders')
        .select('id, status, reference_customer, patient_name, unit, created_at, size_left, size_right, products(colour_id, style_name)')
        .in('company_id', companyIds)
        .order('created_at', { ascending: false })
        .limit(Number(input.limit ?? 10))
      if (input.status) q = q.eq('status', input.status)
      const { data } = await q
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return (data ?? []).map((o: any) => {
        const prod = Array.isArray(o.products) ? o.products[0] : o.products
        return { id: o.id, reference: o.reference_customer, patient: o.patient_name, status: o.status, model: prod?.colour_id, unit: o.unit, size_l: o.size_left, size_r: o.size_right, date: o.created_at?.slice(0, 10) }
      })
    }

    case 'duplicate_order': {
      const orderId = String(input.order_id)
      const { data: src } = await service
        .from('orders')
        .select('*')
        .eq('id', orderId)
        .in('company_id', companyIds)
        .single()
      if (!src) return { error: 'Order not found or not accessible' }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const newRow: any = {
        company_id: src.company_id,
        product_id: src.product_id,
        unit: src.unit,
        clinician: src.clinician,
        patient_name: input.new_patient ? String(input.new_patient) : src.patient_name,
        reference_customer: input.new_reference ? String(input.new_reference) : src.reference_customer,
        quantity: src.quantity,
        construction_left: src.construction_left,
        construction_right: src.construction_right,
        width_left: src.width_left,
        width_right: src.width_right,
        size_left: input.new_size_left != null ? Number(input.new_size_left) : src.size_left,
        size_right: input.new_size_right != null ? Number(input.new_size_right) : src.size_right,
        additions: src.additions,
        comments: src.comments,
        status: 'draft',
        user_id: userId,
      }

      const { data: copy, error } = await service
        .from('orders')
        .insert(newRow)
        .select('id, product_id')
        .single()

      if (error || !copy) return { error: error?.message ?? 'Failed to duplicate' }

      const editUrl = `/gallery/${copy.product_id}/order?draft=${copy.id}`
      return {
        success: true,
        draft_id: copy.id,
        edit_url: editUrl,
        message: `Draft created. Open the form to review and submit: ${editUrl}`,
      }
    }

    case 'get_top_models': {
      const limit = Number(input.limit ?? 5)
      const { data } = await service
        .from('orders')
        .select('products(colour_id, color_name, style_name)')
        .in('company_id', companyIds)
        .neq('status', 'draft')
      const counts = new Map<string, { count: number; color: string }>()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ;(data ?? []).forEach((o: any) => {
        const prod = Array.isArray(o.products) ? o.products[0] : o.products
        if (!prod) return
        const k = prod.colour_id
        const cur = counts.get(k) ?? { count: 0, color: prod.color_name ?? '' }
        counts.set(k, { count: cur.count + 1, color: cur.color })
      })
      return [...counts.entries()]
        .map(([model, v]) => ({ model, color: v.color, orders: v.count }))
        .sort((a, b) => b.orders - a.orders)
        .slice(0, limit)
    }

    default:
      return { error: 'Unknown tool' }
  }
}

// ── Route handler ──────────────────────────────────────────────────────────────
export async function GET() {
  // Health check — confirms the route is reachable and the API key is configured
  const hasKey = !!process.env.ANTHROPIC_API_KEY
  return Response.json({ ok: true, hasKey })
}

export async function POST(request: Request) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return new Response(
      `data: ${JSON.stringify({ type: 'error', text: 'ANTHROPIC_API_KEY not configured in Vercel environment variables' })}\n\ndata: ${JSON.stringify({ type: 'done' })}\n\n`,
      { headers: { 'Content-Type': 'text/event-stream' } }
    )
  }
  const sb = await createClient()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) return new Response('Unauthorized', { status: 401 })

  // Company membership comes from user_companies (a user may belong to several)
  const companyIds = await getUserCompanyIds(user.id)
  if (companyIds.length === 0) return new Response('No company', { status: 403 })

  const { messages } = await request.json() as { messages: Anthropic.MessageParam[] }

  const encoder = new TextEncoder()
  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: string) => controller.enqueue(encoder.encode(`data: ${data}\n\n`))

      try {
        let currentMessages = [...messages]

        while (true) {
          const response = await getClient().messages.create({
            model: 'claude-haiku-4-5-20251001',  // falls back gracefully if not available
            max_tokens: 1024,
            system: SYSTEM,
            tools,
            messages: currentMessages,
          })

          if (response.stop_reason === 'tool_use') {
            const assistantMsg: Anthropic.MessageParam = { role: 'assistant', content: response.content }
            const toolResults: Anthropic.ToolResultBlockParam[] = []

            for (const block of response.content) {
              if (block.type === 'text' && block.text) {
                send(JSON.stringify({ type: 'text', text: block.text }))
              }
              if (block.type === 'tool_use') {
                const result = await executeTool(
                  block.name,
                  block.input as Record<string, unknown>,
                  companyIds,
                  user.id,
                )
                toolResults.push({ type: 'tool_result', tool_use_id: block.id, content: JSON.stringify(result) })
              }
            }

            currentMessages = [
              ...currentMessages,
              assistantMsg,
              { role: 'user', content: toolResults },
            ]
          } else {
            for (const block of response.content) {
              if (block.type === 'text') send(JSON.stringify({ type: 'text', text: block.text }))
            }
            break
          }
        }
      } catch (e) {
        send(JSON.stringify({ type: 'error', text: e instanceof Error ? e.message : 'Unknown error' }))
      } finally {
        send(JSON.stringify({ type: 'done' }))
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive' },
  })
}
