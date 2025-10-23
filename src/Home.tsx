import { Link } from 'react-router-dom'

export default function Home() {
  return (
    <section className="space-y-4">
      <h1 className="text-2xl font-semibold">Добре дошли в Bet-wise</h1>
      <p className="text-gray-700">Платформа за информационни и аналитични прогнози за спортни събития.</p>
      <div className="flex gap-3">
        <Link to="/register" className="inline-flex items-center rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700">
          Регистрация
        </Link>
        <Link to="/legal" className="inline-flex items-center rounded-md border px-4 py-2 hover:bg-gray-100">
          Правни документи
        </Link>
      </div>
    </section>
  )
}