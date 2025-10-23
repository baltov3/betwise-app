import { Link, NavLink, Route, Routes } from 'react-router-dom'
import Home from './../Home'
import Register from './Register'
import LegalDocuments from './LegalDocuments'

export default function App() {
  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <header className="border-b bg-white">
        <nav className="mx-auto max-w-5xl px-4 py-3 flex items-center justify-between">
          <Link to="/" className="font-semibold text-lg">Bet-wise</Link>
          <div className="flex gap-4">
            <NavLink to="/" end className={({ isActive }) => `hover:underline ${isActive ? 'text-blue-600' : ''}`}>
              Начало
            </NavLink>
            <NavLink to="/register" className={({ isActive }) => `hover:underline ${isActive ? 'text-blue-600' : ''}`}>
              Регистрация
            </NavLink>
            <NavLink to="/legal" className={({ isActive }) => `hover:underline ${isActive ? 'text-blue-600' : ''}`}>
              Правни документи
            </NavLink>
          </div>
        </nav>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-6">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/register" element={<Register />} />
          <Route path="/legal" element={<LegalDocuments />} />
        </Routes>
      </main>

      <footer className="border-t bg-white">
        <div className="mx-auto max-w-5xl px-4 py-4 text-sm text-gray-600 flex items-center justify-between">
          <span>© {new Date().getFullYear()} Bet-wise</span>
          <Link to="/legal" className="hover:underline">Правни документи</Link>
        </div>
      </footer>
    </div>
  )
}