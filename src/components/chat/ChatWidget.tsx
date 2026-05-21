'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { useRouter } from '@/i18n/navigation'

type Role = 'user' | 'assistant'
type Message = { role: Role; content: string; pending?: boolean }

const STARTERS = [
  'How do I place a new order?',
  'Show my recent orders',
  'What additions are available?',
  'Duplicate my last order',
]

export function ChatWidget() {
  const [open, setOpen]       = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput]     = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef             = useRef<HTMLDivElement>(null)
  const inputRef              = useRef<HTMLInputElement>(null)
  const router                = useRouter()

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 100)
  }, [open])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const send = useCallback(async (text: string) => {
    if (!text.trim() || loading) return
    setInput('')

    const userMsg: Message = { role: 'user', content: text }
    const pendingMsg: Message = { role: 'assistant', content: '', pending: true }

    setMessages(prev => [...prev, userMsg, pendingMsg])
    setLoading(true)

    // Build messages array for API (exclude pending)
    const history = [...messages, userMsg].map(m => ({ role: m.role, content: m.content }))

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: history }),
      })

      if (!res.ok || !res.body) throw new Error('Chat request failed')

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''
      let assembled = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() ?? ''

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          try {
            const event = JSON.parse(line.slice(6))
            if (event.type === 'text') {
              assembled += event.text
              setMessages(prev => {
                const next = [...prev]
                next[next.length - 1] = { role: 'assistant', content: assembled, pending: true }
                return next
              })
            }
            if (event.type === 'done') {
              setMessages(prev => {
                const next = [...prev]
                next[next.length - 1] = { role: 'assistant', content: assembled || '(no response)' }
                return next
              })
            }
            if (event.type === 'error') {
              setMessages(prev => {
                const next = [...prev]
                next[next.length - 1] = { role: 'assistant', content: `⚠️ ${event.text}` }
                return next
              })
            }
            // If response contains a draft URL, navigate there
            if (event.type === 'text' && assembled.includes('/gallery/') && assembled.includes('/order?draft=')) {
              const match = assembled.match(/\/gallery\/[^/]+\/order\?draft=[a-z0-9-]+/)
              if (match) {
                setTimeout(() => {
                  if (confirm('Open the duplicate order form?')) router.push(match[0])
                }, 1500)
              }
            }
          } catch { /* ignore parse errors */ }
        }
      }
    } catch (e) {
      setMessages(prev => {
        const next = [...prev]
        next[next.length - 1] = { role: 'assistant', content: `Sorry, something went wrong: ${e instanceof Error ? e.message : String(e)}` }
        return next
      })
    } finally {
      setLoading(false)
      inputRef.current?.focus()
    }
  }, [messages, loading, router])

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => setOpen(o => !o)}
        className={`fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full shadow-xl
                    flex items-center justify-center transition-all duration-300
                    ${open ? 'bg-stone-800 rotate-45' : 'bg-gold hover:bg-gold-dark'}`}
        aria-label="Open assistant"
      >
        {open ? (
          <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
        ) : (
          <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
            <path strokeLinecap="round" strokeLinejoin="round"
              d="M8.625 12a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H8.25m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H12m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 0 1-2.555-.337A5.972 5.972 0 0 1 5.41 20.97a5.969 5.969 0 0 1-.474-.065 4.48 4.48 0 0 0 .978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25Z"/>
          </svg>
        )}
      </button>

      {/* Chat panel */}
      {open && (
        <div className="fixed bottom-24 right-6 z-50 w-96 max-w-[calc(100vw-3rem)]
                        bg-white rounded-2xl shadow-2xl shadow-stone-900/20 flex flex-col"
          style={{ height: 520, border: '1px solid rgba(0,0,0,0.08)' }}>

          {/* Header */}
          <div className="flex items-center gap-3 px-4 py-3 border-b border-stone-100 rounded-t-2xl bg-stone-50">
            <div className="w-8 h-8 rounded-full bg-gold flex items-center justify-center shrink-0">
              <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round"
                  d="M8.625 12a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H8.25m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H12m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 0 1-2.555-.337A5.972 5.972 0 0 1 5.41 20.97a5.969 5.969 0 0 1-.474-.065 4.48 4.48 0 0 0 .978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25Z"/>
              </svg>
            </div>
            <div>
              <p className="text-sm font-semibold text-stone-800">Piedro Assistant</p>
              <p className="text-[10px] text-stone-400">Orders · Navigation · Help</p>
            </div>
            <button onClick={() => setOpen(false)}
              className="ml-auto w-7 h-7 flex items-center justify-center rounded-lg text-stone-400 hover:text-stone-600 hover:bg-stone-100 transition-colors">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
            {messages.length === 0 ? (
              <div className="space-y-4">
                <p className="text-xs text-stone-500 text-center pt-2">
                  How can I help you today?
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {STARTERS.map(s => (
                    <button key={s} onClick={() => send(s)}
                      className="text-left p-2.5 text-xs text-stone-600 bg-stone-50 hover:bg-gold/10 hover:text-gold
                                 border border-stone-100 rounded-xl transition-colors leading-snug">
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              messages.map((m, i) => (
                <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[82%] px-3 py-2 rounded-2xl text-sm leading-relaxed
                    ${m.role === 'user'
                      ? 'bg-gold text-white rounded-br-sm'
                      : 'bg-stone-100 text-stone-800 rounded-bl-sm'}`}>
                    {m.pending && m.content === '' ? (
                      <span className="flex gap-1 items-center h-4">
                        {[0,1,2].map(i => (
                          <span key={i} className="w-1.5 h-1.5 rounded-full bg-stone-400 animate-bounce"
                            style={{ animationDelay: `${i * 150}ms` }} />
                        ))}
                      </span>
                    ) : (
                      <span className="whitespace-pre-wrap">{m.content}</span>
                    )}
                  </div>
                </div>
              ))
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="px-3 pb-3 pt-2 border-t border-stone-100">
            <form onSubmit={e => { e.preventDefault(); send(input) }}
              className="flex items-center gap-2 bg-stone-50 rounded-xl border border-stone-200
                         focus-within:border-gold focus-within:ring-2 focus-within:ring-gold/20 transition-all">
              <input
                ref={inputRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                placeholder="Ask me anything…"
                disabled={loading}
                className="flex-1 bg-transparent h-10 px-3 text-sm text-stone-800 placeholder:text-stone-400
                           focus:outline-none disabled:opacity-50"
              />
              <button type="submit" disabled={loading || !input.trim()}
                className="w-8 h-8 mr-1 rounded-lg bg-gold text-white flex items-center justify-center
                           disabled:opacity-40 hover:bg-gold-dark transition-colors shrink-0">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 12 3.269 3.125A59.769 59.769 0 0 1 21.485 12 59.768 59.768 0 0 1 3.27 20.875L5.999 12Zm0 0h7.5" />
                </svg>
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
