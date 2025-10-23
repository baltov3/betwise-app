import { FormEvent, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'

type LegalType = 'TERMS' | 'PRIVACY' | 'AGE' | 'REFERRAL' | 'COOKIES' | 'REFUND'
type LegalDoc = { type: LegalType; title: string; version: string; effectiveAt: string; url: string }

export default function Register() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [agreeAll, setAgreeAll] = useState(false)
  const [isAdult, setIsAdult] = useState(false)
  const [docs, setDocs] = useState<Record<LegalType, string> | null>(null) // type -> version
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function loadDocs() {
      try {
        setLoading(true)
        setError(null)
        const res = await fetch('/api/legal-documents')
        if (!res.ok) throw new Error('Неуспешно зареждане на правните документи')
        const data: LegalDoc[] = await res.json()
        const map = data.reduce((acc, d) => {
          acc[d.type] = d.version
          return acc
        }, {} as Record<LegalType, string>)
        // Уверяваме се, че всички типове присъстват
        const required: LegalType[] = ['TERMS', 'PRIVACY', 'AGE', 'REFERRAL', 'COOKIES', 'REFUND']
        for (const t of required) if (!map[t]) throw new Error(`Липсва активна версия за ${t}`)
        setDocs(map)
      } catch (e: any) {
        setError(e.message || 'Грешка при зареждане')
      } finally {
        setLoading(false)
      }
    }
    loadDocs()
  }, [])

  const canSubmit = useMemo(() => {
    return !!email && !!password && agreeAll && isAdult && !!docs && !loading && !error
  }, [email, password, agreeAll, isAdult, docs, loading, error])

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    if (!canSubmit || !docs) return
    const body = {
      email,
      password,
      ageConfirmed: true,
      consents: {
        TERMS: docs.TERMS,
        PRIVACY: docs.PRIVACY,
        AGE: docs.AGE,
        REFERRAL: docs.REFERRAL,
        COOKIES: docs.COOKIES,
        REFUND: docs.REFUND,
      },
    }
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      alert(err?.message || 'Регистрацията е неуспешна')
      return
    }
    alert('Регистрацията е успешна')
  }

  return (
    <section className="max-w-md space-y-6">
      <h1 className="text-2xl font-semibold">Създаване на акаунт</h1>

      {loading && <p>Зареждане на правните документи…</p>}
      {error && <p className="text-red-600">{error}</p>}

      <form onSubmit={onSubmit} className="space-y-4">
        <div className="space-y-1">
          <label className="block text-sm font-medium">Имейл</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full rounded-md border px-3 py-2 outline-none focus:ring"
            placeholder="you@example.com"
          />
        </div>

        <div className="space-y-1">
          <label className="block text-sm font-medium">Парола</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="w-full rounded-md border px-3 py-2 outline-none focus:ring"
            placeholder="********"
          />
        </div>

        <div className="flex items-start gap-2">
          <input
            id="agreeAll"
            type="checkbox"
            checked={agreeAll}
            onChange={(e) => setAgreeAll(e.target.checked)}
            className="mt-1"
            required
          />
          <label htmlFor="agreeAll" className="text-sm text-gray-800">
            Съгласен/на съм с{' '}
            <Link to="/legal" className="text-blue-600 hover:underline" target="_blank" rel="noopener noreferrer">
              Правните документи
            </Link>
            {' '}(Общи условия, Поверителност, Възрастово ограничение, Партньорска програма, Бисквитки, Отказ и възстановяване).
          </label>
        </div>

        <div className="flex items-start gap-2">
          <input
            id="isAdult"
            type="checkbox"
            checked={isAdult}
            onChange={(e) => setIsAdult(e.target.checked)}
            className="mt-1"
            required
          />
          <label htmlFor="isAdult" className="text-sm text-gray-800">Потвърждавам, че съм навършил/а 18 години.</label>
        </div>

        <button
          type="submit"
          disabled={!canSubmit}
          className={`w-full rounded-md px-4 py-2 text-white ${!canSubmit ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'}`}
        >
          Регистрация
        </button>
      </form>
    </section>
  )
}