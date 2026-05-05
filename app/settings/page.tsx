'use client'

import { useState } from 'react'
import { Eye, EyeOff, Trash2, Check, LogOut } from 'lucide-react'
import { useStore } from '@/lib/store'
import { SettingsGuard } from '@/components/auth/SettingsGuard'
import { clearSession } from '@/lib/auth'

const SYSTEM_TYPES = ['ERP', '자체개발', '클라우드 SaaS', '기타']

export default function SettingsPage() {
  const { settings, documents, updateSettings, setDocument, clearAllDocuments } = useStore()

  const [form, setForm] = useState({ ...settings })
  const [showKey, setShowKey] = useState(false)
  const [saved, setSaved] = useState(false)
  const [confirmClear, setConfirmClear] = useState(false)

  function handleSave() {
    updateSettings(form)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  function handleClearAll() {
    if (!confirmClear) {
      setConfirmClear(true)
      setTimeout(() => setConfirmClear(false), 3000)
      return
    }
    clearAllDocuments()
    setConfirmClear(false)
  }

  const DOC_LABELS = [
    { key: 'minutes' as const, label: '회의록' },
    { key: 'requirements' as const, label: '요구사항 정의서' },
    { key: 'testCases' as const, label: '테스트 케이스' },
  ]

  return (
    <SettingsGuard>
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">⚙ 설정</h1>
        <button
          onClick={() => { clearSession(); window.location.href = '/' }}
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-red-600 transition-colors"
        >
          <LogOut size={15} />
          로그아웃
        </button>
      </div>

      {/* 프로젝트 기본 정보 */}
      <div className="card p-6 space-y-4">
        <h2 className="font-semibold text-gray-800">프로젝트 기본 정보</h2>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs text-gray-600 mb-1 block">프로젝트명</label>
            <input
              value={form.projectName}
              onChange={(e) => setForm({ ...form, projectName: e.target.value })}
              placeholder="예: ABC사 HR 시스템 구축"
              className="input-field"
            />
          </div>
          <div>
            <label className="text-xs text-gray-600 mb-1 block">고객사명</label>
            <input
              value={form.clientName}
              onChange={(e) => setForm({ ...form, clientName: e.target.value })}
              placeholder="예: ABC 주식회사"
              className="input-field"
            />
          </div>
          <div>
            <label className="text-xs text-gray-600 mb-1 block">PM / PL 성명</label>
            <input
              value={form.pmName}
              onChange={(e) => setForm({ ...form, pmName: e.target.value })}
              placeholder="예: 홍길동"
              className="input-field"
            />
          </div>
          <div>
            <label className="text-xs text-gray-600 mb-1 block">HR 시스템 유형</label>
            <select
              value={form.systemType}
              onChange={(e) => setForm({ ...form, systemType: e.target.value })}
              className="input-field"
            >
              {SYSTEM_TYPES.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs text-gray-600 mb-1 block">프로젝트 시작일</label>
            <input
              type="date"
              value={form.projectStart}
              onChange={(e) => setForm({ ...form, projectStart: e.target.value })}
              className="input-field"
            />
          </div>
          <div>
            <label className="text-xs text-gray-600 mb-1 block">프로젝트 종료일</label>
            <input
              type="date"
              value={form.projectEnd}
              onChange={(e) => setForm({ ...form, projectEnd: e.target.value })}
              className="input-field"
            />
          </div>
        </div>
      </div>

      {/* AI 설정 */}
      <div className="card p-6 space-y-4">
        <h2 className="font-semibold text-gray-800">AI 설정</h2>

        <div>
          <label className="text-xs text-gray-600 mb-1 block">
            Gemini API Key
            <span className="ml-2 text-xs font-normal text-green-600 bg-green-50 px-1.5 py-0.5 rounded">무료</span>
          </label>
          <div className="relative">
            <input
              type={showKey ? 'text' : 'password'}
              value={form.apiKey}
              onChange={(e) => setForm({ ...form, apiKey: e.target.value })}
              placeholder="AIza..."
              className="input-field pr-10"
            />
            <button
              type="button"
              onClick={() => setShowKey((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              {showKey ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
          </div>
          <p className="text-xs text-gray-500 mt-1.5">
            무료 발급: <span className="font-mono">aistudio.google.com</span> → Get API Key
          </p>
          <p className="text-xs text-amber-600 mt-0.5">
            ⚠ API Key는 브라우저 sessionStorage에만 저장되며 서버로 전송되지 않습니다.
          </p>
        </div>

        <div>
          <label className="text-xs text-gray-600 mb-1 block">
            Claude API Key
            <span className="ml-2 text-xs font-normal text-violet-600 bg-violet-50 px-1.5 py-0.5 rounded">화면정의서 자동생성</span>
          </label>
          <div className="relative">
            <input
              type={showKey ? 'text' : 'password'}
              value={form.claudeApiKey ?? ''}
              onChange={(e) => setForm({ ...form, claudeApiKey: e.target.value })}
              placeholder="sk-ant-..."
              className="input-field pr-10 font-mono text-sm"
            />
            <button type="button" onClick={() => setShowKey((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
              {showKey ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            발급: <span className="font-mono">console.anthropic.com</span> → API Keys
            <span className="ml-2 text-gray-400">| Claude 없으면 Gemini API Key로 자동 폴백</span>
          </p>
        </div>

        <div>
          <label className="text-xs text-gray-600 mb-1 block">
            노션 Integration Token
            <span className="ml-2 text-xs font-normal text-gray-400">(선택 — 노션 연동 시 필요)</span>
          </label>
          <div className="relative">
            <input
              type={showKey ? 'text' : 'password'}
              value={form.notionToken}
              onChange={(e) => setForm({ ...form, notionToken: e.target.value })}
              placeholder="secret_..."
              className="input-field pr-10 font-mono text-sm"
            />
            <button type="button" onClick={() => setShowKey((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
              {showKey ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
          </div>
          <p className="text-xs text-gray-500 mt-1.5">
            발급: <span className="font-mono">notion.so/my-integrations</span> → 새 통합 만들기 → 토큰 복사
          </p>
          <p className="text-xs text-gray-400 mt-0.5">
            ※ 연동 후 노션 페이지 우측 상단 ··· → 연결 → 해당 Integration 추가 필요
          </p>
        </div>

        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-xs text-gray-600">Gemini 모델</label>
            <button
              type="button"
              onClick={async () => {
                if (!form.apiKey) { alert('API Key를 먼저 입력해주세요.'); return }
                try {
                  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${form.apiKey}`)
                  const data = await res.json()
                  if (!res.ok) { alert('오류: ' + (data?.error?.message || res.status)); return }
                  const models: string[] = (data.models || [])
                    .filter((m: { supportedGenerationMethods?: string[] }) => m.supportedGenerationMethods?.includes('generateContent'))
                    .map((m: { name: string }) => m.name.replace('models/', ''))
                  alert('사용 가능한 모델:\n' + models.join('\n'))
                } catch (e) {
                  alert('조회 실패: ' + String(e))
                }
              }}
              className="text-xs text-brand-600 hover:underline"
            >
              사용 가능 모델 조회
            </button>
          </div>
          <input
            value={form.geminiModel}
            onChange={(e) => setForm({ ...form, geminiModel: e.target.value })}
            placeholder="예: gemini-1.5-flash"
            className="input-field font-mono text-sm"
          />
          <p className="text-xs text-gray-400 mt-1">모델명을 정확히 입력하세요. 위 [사용 가능 모델 조회]로 확인 후 복사 붙여넣기 하세요.</p>
        </div>

        <div>
          <label className="text-xs text-gray-600 mb-2 block">생성 언어</label>
          <div className="flex gap-4">
            {(['ko', 'en'] as const).map((lang) => (
              <label key={lang} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="language"
                  value={lang}
                  checked={form.language === lang}
                  onChange={() => setForm({ ...form, language: lang })}
                  className="accent-brand-600"
                />
                <span className="text-sm text-gray-700">
                  {lang === 'ko' ? '한국어' : 'English'}
                </span>
              </label>
            ))}
          </div>
        </div>
      </div>

      {/* 세션 관리 */}
      <div className="card p-6 space-y-4">
        <h2 className="font-semibold text-gray-800">세션 관리</h2>

        <div className="space-y-2">
          {DOC_LABELS.map(({ key, label }) => (
            <div key={key} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
              <span className="text-sm text-gray-700">{label}</span>
              <div className="flex items-center gap-3">
                {documents[key] ? (
                  <>
                    <span className="text-xs text-green-600 font-medium">저장됨 ✓</span>
                    <button
                      onClick={() => setDocument(key, null)}
                      className="text-xs text-red-500 hover:text-red-700 flex items-center gap-1"
                    >
                      <Trash2 size={12} /> 삭제
                    </button>
                  </>
                ) : (
                  <span className="text-xs text-gray-400">없음</span>
                )}
              </div>
            </div>
          ))}
        </div>

        <button
          onClick={handleClearAll}
          className={`btn-danger text-sm ${confirmClear ? 'bg-red-700' : ''}`}
        >
          <Trash2 size={14} />
          {confirmClear ? '한 번 더 클릭하면 초기화됩니다' : '전체 세션 초기화'}
        </button>
      </div>

      {/* 저장 버튼 */}
      <div className="flex justify-end gap-3">
        <button
          onClick={() => setForm({ ...settings })}
          className="btn-secondary"
        >
          취소
        </button>
        <button onClick={handleSave} className="btn-primary">
          {saved ? <Check size={15} /> : null}
          {saved ? '저장 완료' : '저장'}
        </button>
      </div>
    </div>
    </SettingsGuard>
  )
}
