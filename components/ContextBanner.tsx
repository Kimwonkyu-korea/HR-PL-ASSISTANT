'use client'

import { Info, X } from 'lucide-react'

interface Props {
  label: string
  onDismiss: () => void
}

export function ContextBanner({ label, onDismiss }: Props) {
  return (
    <div className="flex items-center gap-2 px-4 py-2.5 bg-brand-50 border border-brand-100 rounded-lg text-sm text-brand-700">
      <Info size={15} className="flex-shrink-0" />
      <span>{label}</span>
      <button
        onClick={onDismiss}
        className="ml-auto p-0.5 hover:bg-brand-100 rounded transition-colors"
      >
        <X size={14} />
      </button>
    </div>
  )
}
