'use client'

import { useState, useEffect } from 'react'
import { isSettingsUnlocked, verifyPassword, unlockSettings } from '@/lib/auth'
import { Lock } from 'lucide-react'

export function SettingsGuard({ children }: { children: React.ReactNode }) {
  const [unlocked, setUnlocked] = useState(false)
  const [ready, setReady] = useState(false)
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    setUnlocked(isSettingsUnlocked())
    setReady(true)
  }, [])

  if (!ready) return null

  if (!unlocked) {
    return (
      <div className="max-w-sm mx-auto mt-20">
        <div className="bg-white rounded-2xl shadow-lg p-8">
          <div className="text-center mb-6">
            <div className="w-12 h-12 bg-brand-50 rounded-full flex items-center justify-center mx-auto mb-3">
              <Lock size={20} className="text-brand-600" />
            </div>
            <h2 className="text-base font-semibold text-gray-900">설정 접근 확인</h2>
            <p className="text-sm text-gray-500 mt-1">비밀번호를 입력해주세요</p>
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault()
              if (verifyPassword(password)) {
                unlockSettings()
                setUnlocked(true)
              } else {
                setError('비밀번호가 올바르지 않습니다.')
                setPassword('')
              }
            }}
            className="space-y-4"
          >
            <input
              type="password"
              value={password}
              onChange={(e) => { setPassword(e.target.value); setError('') }}
              className="input-field"
              placeholder="비밀번호 입력"
              autoFocus
              autoComplete="current-password"
            />
            {error && (
              <p className="text-xs text-red-500 bg-red-50 px-3 py-2 rounded-lg">{error}</p>
            )}
            <button type="submit" className="btn-primary w-full justify-center">
              확인
            </button>
          </form>
        </div>
      </div>
    )
  }

  return <>{children}</>
}
