'use client'

import { useCallback, useRef, useState } from 'react'
import { useTranslations } from 'next-intl'

/**
 * Minimal rich-text editor for e-mail composing (contenteditable).
 *
 * Paste/drop just works — including images and logos copied from Word, web
 * pages or the file system. E-mail clients block base64 images, so every
 * pasted data:/blob: image is transparently uploaded to the public
 * `email-assets` bucket and its src swapped for the hosted URL.
 *
 * Uncontrolled: `initialHtml` seeds the content; remount (change `key`) to
 * reset. Every input reports the current HTML via `onChange`.
 */
export default function RichTextEditor({ initialHtml, onChange, minHeight = 180, placeholder }: {
  initialHtml?: string
  onChange: (html: string) => void
  minHeight?: number
  placeholder?: string
}) {
  const t = useTranslations('adminEmail')
  const ref = useRef<HTMLDivElement>(null)
  const [uploading, setUploading] = useState(0)
  const [empty, setEmpty] = useState(!initialHtml)

  const emit = useCallback(() => {
    const el = ref.current
    if (!el) return
    setEmpty(!el.textContent?.trim() && !el.querySelector('img'))
    onChange(el.innerHTML)
  }, [onChange])

  const uploadFile = useCallback(async (file: File | Blob): Promise<string | null> => {
    setUploading(n => n + 1)
    try {
      const fd = new FormData()
      fd.append('file', file instanceof File ? file : new File([file], 'pasted.png'))
      const res = await fetch('/api/admin/email/upload-image', { method: 'POST', body: fd })
      const json = await res.json().catch(() => ({}))
      return res.ok ? (json.url as string) : null
    } catch {
      return null
    } finally {
      setUploading(n => n - 1)
    }
  }, [])

  /** Replace any data:/blob: images (from rich paste) with hosted URLs. */
  const hostInlineImages = useCallback(async () => {
    const el = ref.current
    if (!el) return
    const imgs = Array.from(el.querySelectorAll('img')).filter(i => /^(data:|blob:)/.test(i.src))
    for (const img of imgs) {
      try {
        const blob = await (await fetch(img.src)).blob()
        const url = await uploadFile(blob)
        if (url) img.src = url
        else img.remove() // never leave a base64 image in the body
      } catch {
        img.remove()
      }
    }
    if (imgs.length) emit()
  }, [uploadFile, emit])

  const insertImages = useCallback(async (files: File[]) => {
    for (const f of files) {
      const url = await uploadFile(f)
      if (url && ref.current) {
        ref.current.focus()
        document.execCommand('insertHTML', false,
          `<img src="${url}" style="max-width:100%;height:auto" alt=""/>`)
      }
    }
    emit()
  }, [uploadFile, emit])

  function onPaste(e: React.ClipboardEvent) {
    const files = Array.from(e.clipboardData.files).filter(f => f.type.startsWith('image/'))
    if (files.length && !e.clipboardData.getData('text/html')) {
      // Pure image paste (screenshot, copied file) — insert ourselves.
      e.preventDefault()
      void insertImages(files)
      return
    }
    // Rich paste: let the browser insert it, then host any inline images.
    setTimeout(() => { void hostInlineImages(); emit() }, 0)
  }

  function onDrop(e: React.DragEvent) {
    const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/'))
    if (files.length) {
      e.preventDefault()
      void insertImages(files)
    } else {
      setTimeout(() => { void hostInlineImages(); emit() }, 0)
    }
  }

  const exec = (cmd: string, arg?: string) => {
    ref.current?.focus()
    document.execCommand(cmd, false, arg)
    emit()
  }

  const btn = 'px-2 py-1 rounded text-[13px] font-semibold text-stone-500 hover:text-stone-900 hover:bg-stone-100 transition-colors'

  return (
    <div className="border border-stone-200 rounded-lg focus-within:ring-2 focus-within:ring-gold/40 focus-within:border-gold">
      <div className="flex items-center gap-1 px-2 py-1.5 border-b border-stone-100">
        <button type="button" className={btn} title={t('tb_bold')} onMouseDown={e => { e.preventDefault(); exec('bold') }}><b>B</b></button>
        <button type="button" className={btn} title={t('tb_italic')} onMouseDown={e => { e.preventDefault(); exec('italic') }}><i>I</i></button>
        <button type="button" className={btn} title={t('tb_underline')} onMouseDown={e => { e.preventDefault(); exec('underline') }}><u>U</u></button>
        <button type="button" className={btn} title={t('tb_link')} onMouseDown={e => {
          e.preventDefault()
          const url = window.prompt(t('tb_link_prompt'), 'https://')
          if (url && url !== 'https://') exec('createLink', url)
        }}>🔗</button>
        <label className={`${btn} cursor-pointer`} title={t('tb_image')}>
          🖼️
          <input type="file" accept="image/*" multiple className="hidden"
            onChange={e => {
              const files = Array.from(e.target.files ?? [])
              e.target.value = ''
              if (files.length) void insertImages(files)
            }} />
        </label>
        <button type="button" className={btn} title={t('tb_clear')} onMouseDown={e => { e.preventDefault(); exec('removeFormat') }}>⌫</button>
        {uploading > 0 && (
          <span className="ml-auto text-[11px] font-medium text-gold-dark animate-pulse">{t('uploading_image')}</span>
        )}
      </div>
      <div className="relative">
        {empty && placeholder && (
          <p className="absolute top-2.5 left-3 text-sm text-stone-400 pointer-events-none">{placeholder}</p>
        )}
        <div
          ref={ref}
          contentEditable
          suppressContentEditableWarning
          className="px-3 py-2.5 text-sm text-stone-800 leading-relaxed focus:outline-none [&_img]:max-w-full [&_a]:text-gold-dark [&_a]:underline"
          style={{ minHeight }}
          onInput={emit}
          onPaste={onPaste}
          onDrop={onDrop}
          dangerouslySetInnerHTML={{ __html: initialHtml ?? '' }}
        />
      </div>
    </div>
  )
}
