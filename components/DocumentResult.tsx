'use client'

import { useState } from 'react'
import { Pencil, Download, ArrowRight, Loader2, Check } from 'lucide-react'
import { exportToDocx } from '@/lib/docx-export'

interface Action {
  label: string
  icon?: React.ReactNode
  onClick: () => void
  variant?: 'primary' | 'secondary'
}

interface Props {
  content: string
  filename: string
  isLoading?: boolean
  onChange?: (val: string) => void
  extraActions?: Action[]
}

export function DocumentResult({ content, filename, isLoading, onChange, extraActions }: Props) {
  const [editing, setEditing] = useState(false)
  const [downloaded, setDownloaded] = useState(false)

  async function handleDownload() {
    await exportToDocx(content, filename)
    setDownloaded(true)
    setTimeout(() => setDownloaded(false), 2000)
  }

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center h-full text-gray-400">
        <div className="text-center space-y-3">
          <Loader2 size={32} className="animate-spin mx-auto text-brand-500" />
          <p className="text-sm">AI가 문서를 생성하고 있습니다...</p>
        </div>
      </div>
    )
  }

  if (!content) {
    return (
      <div className="flex-1 flex items-center justify-center h-full text-gray-400">
        <div className="text-center space-y-2">
          <p className="text-4xl">📄</p>
          <p className="text-sm">생성 버튼을 누르면 문서가 여기에 표시됩니다</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full gap-3">
      {/* 결과 영역 */}
      <div className="flex-1 overflow-auto">
        {editing ? (
          <textarea
            value={content}
            onChange={(e) => onChange?.(e.target.value)}
            className="w-full h-full min-h-[400px] input-field font-mono text-xs resize-none"
          />
        ) : (
          <div className="prose prose-sm max-w-none text-sm leading-relaxed whitespace-pre-wrap font-mono bg-gray-50 rounded-lg p-4 h-full overflow-auto">
            {content}
          </div>
        )}
      </div>

      {/* 액션 버튼 */}
      <div className="flex flex-wrap gap-2 pt-2 border-t border-gray-100">
        <button
          onClick={() => setEditing((v) => !v)}
          className="btn-secondary text-xs py-1.5"
        >
          <Pencil size={13} />
          {editing ? '미리보기' : '편집'}
        </button>

        <button
          onClick={handleDownload}
          className="btn-secondary text-xs py-1.5"
        >
          {downloaded ? <Check size={13} className="text-green-600" /> : <Download size={13} />}
          {downloaded ? '다운로드 완료' : 'Word 다운로드'}
        </button>

        {extraActions?.map((action) => (
          <button
            key={action.label}
            onClick={action.onClick}
            className={action.variant === 'primary' ? 'btn-primary text-xs py-1.5 ml-auto' : 'btn-secondary text-xs py-1.5'}
          >
            {action.icon}
            {action.label}
            {action.variant === 'primary' && <ArrowRight size={13} />}
          </button>
        ))}
      </div>
    </div>
  )
}
