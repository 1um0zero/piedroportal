'use client'

import { useState, useRef } from 'react'
import { updateProfileAction, uploadAvatarAction } from '@/app/actions/profile'
import { useRouter } from '@/i18n/navigation'

type Props = {
  email: string
  initialName: string
  initialGender: string
  initialAvatar: string
}

const GENDERS = [
  { value: '', label: '— Prefer not to say —' },
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' },
  { value: 'other', label: 'Other' },
]

export default function ProfileForm({ email, initialName, initialGender, initialAvatar }: Props) {
  const router     = useRouter()
  const fileRef    = useRef<HTMLInputElement>(null)
  const cameraRef  = useRef<HTMLInputElement>(null)
  const [name, setName]     = useState(initialName)
  const [gender, setGender] = useState(initialGender)
  const [avatar, setAvatar] = useState(initialAvatar)
  const [preview, setPreview] = useState(initialAvatar)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [msg, setMsg]   = useState('')
  const [isErr, setErr] = useState(false)

  const initials = name.trim()
    ? name.trim().split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()
    : email[0]?.toUpperCase() ?? '?'

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true); setMsg(''); setErr(false)
    const result = await updateProfileAction({ full_name: name, gender })
    setSaving(false)
    if (result.ok) { setMsg('Profile saved.'); router.refresh() }
    else { setMsg(result.error ?? 'Error'); setErr(true) }
  }

  async function handleAvatar(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    // Local preview immediately
    setPreview(URL.createObjectURL(file))
    setUploading(true); setMsg(''); setErr(false)

    const fd = new FormData()
    fd.append('avatar', file)
    const result = await uploadAvatarAction(fd)
    setUploading(false)

    if (result.url) { setAvatar(result.url); setMsg('Photo updated.'); router.refresh() }
    else { setMsg(result.error ?? 'Upload failed'); setErr(true); setPreview(avatar) }
  }

  return (
    <form onSubmit={handleSave} className="space-y-7">

      {/* Avatar */}
      <div className="flex items-center gap-6">
        <button type="button" onClick={() => fileRef.current?.click()}
          className="relative group w-24 h-24 rounded-full overflow-hidden shrink-0
                     ring-2 ring-stone-200 hover:ring-gold transition-all">
          {preview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={preview} alt="Avatar" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-gold/10 flex items-center justify-center">
              <span className="text-2xl font-bold text-gold">{initials}</span>
            </div>
          )}
          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100
                          flex items-center justify-center transition-opacity">
            {uploading ? (
              <div className="w-6 h-6 border-2 border-white/40 border-t-white rounded-full animate-spin" />
            ) : (
              <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round"
                  d="M6.827 6.175A2.31 2.31 0 0 1 5.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 0 0-1.134-.175 2.31 2.31 0 0 1-1.64-1.055l-.822-1.316a2.192 2.192 0 0 0-1.736-1.039 48.774 48.774 0 0 0-5.232 0 2.192 2.192 0 0 0-1.736 1.039l-.821 1.316Z"/>
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 1 1-9 0 4.5 4.5 0 0 1 9 0ZM18.75 10.5h.008v.008h-.008V10.5Z"/>
              </svg>
            )}
          </div>
        </button>
        <div>
          <p className="text-sm font-medium text-stone-700">Profile photo</p>
          <p className="text-xs text-stone-400 mt-0.5">JPG or PNG, max 2MB</p>
          <div className="flex gap-2 mt-2">
            <button type="button" onClick={() => cameraRef.current?.click()}
              className="inline-flex items-center gap-1 text-xs font-medium text-stone-600
                         bg-stone-100 hover:bg-stone-200 px-2.5 py-1.5 rounded-lg transition-colors">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round"
                  d="M6.827 6.175A2.31 2.31 0 0 1 5.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 0 0-1.134-.175 2.31 2.31 0 0 1-1.64-1.055l-.822-1.316a2.192 2.192 0 0 0-1.736-1.039 48.774 48.774 0 0 0-5.232 0 2.192 2.192 0 0 0-1.736 1.039l-.821 1.316Z"/>
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 1 1-9 0 4.5 4.5 0 0 1 9 0ZM18.75 10.5h.008v.008h-.008V10.5Z"/>
              </svg>
              Camera
            </button>
            <button type="button" onClick={() => fileRef.current?.click()}
              className="inline-flex items-center gap-1 text-xs font-medium text-stone-600
                         bg-stone-100 hover:bg-stone-200 px-2.5 py-1.5 rounded-lg transition-colors">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round"
                  d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 0 0 1.5-1.5V6a1.5 1.5 0 0 0-1.5-1.5H3.75A1.5 1.5 0 0 0 2.25 6v12a1.5 1.5 0 0 0 1.5 1.5Zm10.5-11.25h.008v.008h-.008V8.25Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z"/>
              </svg>
              Gallery
            </button>
          </div>
        </div>
        {/* Camera input — opens camera app on mobile */}
        <input ref={cameraRef} type="file" accept="image/*" capture="user" className="hidden" onChange={handleAvatar} />
        {/* Gallery input — opens file picker */}
        <input ref={fileRef}   type="file" accept="image/*" className="hidden" onChange={handleAvatar} />
      </div>

      {/* Email (read-only) */}
      <div className="space-y-1.5">
        <label className="text-xs font-bold text-stone-600 uppercase tracking-wide">Email</label>
        <p className="h-9 px-3 flex items-center text-sm text-stone-500 bg-stone-100 border border-stone-200 rounded-lg">
          {email}
        </p>
      </div>

      {/* Full name */}
      <div className="space-y-1.5">
        <label className="text-xs font-bold text-stone-600 uppercase tracking-wide">
          Full name <span className="text-red-400">*</span>
        </label>
        <input
          value={name}
          onChange={e => setName(e.target.value)}
          required
          placeholder="Your full name"
          className="w-full h-10 px-3 text-sm bg-stone-50 border border-stone-200 rounded-lg
                     focus:outline-none focus:ring-2 focus:ring-gold/30 focus:border-gold transition-colors"
        />
      </div>

      {/* Gender */}
      <div className="space-y-1.5">
        <label className="text-xs font-bold text-stone-600 uppercase tracking-wide">Gender</label>
        <div className="flex flex-wrap gap-2">
          {GENDERS.map(g => (
            <button key={g.value} type="button"
              onClick={() => setGender(g.value)}
              className={`px-4 py-2 text-xs font-semibold rounded-lg border transition-all
                ${gender === g.value
                  ? 'bg-gold/10 border-gold text-gold'
                  : 'bg-white border-stone-200 text-stone-500 hover:border-stone-400'}`}>
              {g.label}
            </button>
          ))}
        </div>
      </div>

      {/* Feedback */}
      {msg && (
        <p className={`text-sm font-medium ${isErr ? 'text-red-500' : 'text-green-600'}`}>{msg}</p>
      )}

      <button type="submit" disabled={saving || !name.trim()}
        className="w-full h-11 bg-gold text-white font-semibold text-sm rounded-xl
                   hover:bg-gold-dark transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
        {saving && <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />}
        {saving ? 'Saving…' : 'Save Profile'}
      </button>
    </form>
  )
}
