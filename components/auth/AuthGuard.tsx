'use client'

import { useState, useEffect } from 'react'
import { isAuthenticated, login, setSession } from '@/lib/auth'

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const [authed, setAuthed] = useState(false)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    setAuthed(isAuthenticated())
    setReady(true)
  }, [])

  if (!ready) return null

  if (!authed) return <LoginScreen onLogin={() => setAuthed(true)} />

  return <>{children}</>
}

function LoginScreen({ onLogin }: { onLogin: () => void }) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (login(username, password)) {
      setSession()
      onLogin()
    } else {
      setError('아이디 또는 비밀번호가 올바르지 않습니다.')
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="bg-white rounded-2xl shadow-lg p-8 w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="text-4xl text-brand-600 mb-2">◈</div>
          <h1 className="text-xl font-bold text-gray-900">HR PL Assistant</h1>
          <p className="text-sm text-gray-500 mt-1">로그인 후 사용하실 수 있습니다</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-medium text-gray-600 mb-1 block">아이디</label>
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="input-field"
              placeholder="아이디 입력"
              autoFocus
              autoComplete="username"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600 mb-1 block">비밀번호</label>
            <input
              type="password"
              value={password}
              onChange={(e) => { setPassword(e.target.value); setError('') }}
              className="input-field"
              placeholder="비밀번호 입력"
              autoComplete="current-password"
            />
          </div>

          {error && (
            <p className="text-xs text-red-500 bg-red-50 px-3 py-2 rounded-lg">{error}</p>
          )}

          <button type="submit" className="btn-primary w-full justify-center mt-2">
            로그인
          </button>
        </form>
      </div>
    </div>
  )
}
