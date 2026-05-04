'use client'

import Link from 'next/link'
import { Settings } from 'lucide-react'
import { useStore } from '@/lib/store'

export function Header() {
  const projectName = useStore((s) => s.settings.projectName)

  return (
    <header className="h-14 border-b border-gray-200 bg-white flex items-center justify-between px-6 flex-shrink-0">
      <Link href="/" className="flex items-center gap-2 font-bold text-brand-600 text-lg">
        <span className="text-xl">◈</span>
        HR PL Assistant
      </Link>

      <div className="flex items-center gap-3">
        <span className="text-sm text-gray-500">
          프로젝트:{' '}
          <Link href="/settings" className="font-medium text-gray-700 hover:text-brand-600">
            {projectName || '미설정 ▾'}
          </Link>
        </span>
        <Link
          href="/settings"
          className="p-2 rounded-lg text-gray-500 hover:text-brand-600 hover:bg-brand-50 transition-colors"
        >
          <Settings size={18} />
        </Link>
      </div>
    </header>
  )
}
