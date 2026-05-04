'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ClipboardList, FileText, Layout, Monitor, RefreshCw, BarChart2 } from 'lucide-react'
import { useStore } from '@/lib/store'
import { clsx } from 'clsx'

const NAV_ITEMS = [
  { href: '/minutes', icon: ClipboardList, label: '회의록', key: 'minutes' as const, mvp: true, hidden: true },
  { href: '/requirements', icon: FileText, label: '요구사항 정의서', key: 'requirements' as const, mvp: true, hidden: true },
  { href: '/test-cases', icon: Layout, label: '화면 미리보기', key: null, mvp: true },
  { href: '/screen-spec', icon: Monitor, label: '화면 정의서', key: null, mvp: true },
  { href: '/migration', icon: RefreshCw, label: '마이그레이션 설계서', key: null, mvp: true, hidden: true },
  { href: '/req-summary', icon: BarChart2, label: '요구사항 취합·종합의견', key: null, mvp: true },
]

const FLOW_STEPS = [
  { label: '회의록', key: 'minutes' as const },
  { label: '요구사항', key: 'requirements' as const },
  { label: '화면미리보기', key: 'testCases' as const },
]

export function Sidebar() {
  const pathname = usePathname()
  const documents = useStore((s) => s.documents)

  return (
    <aside className="w-60 border-r border-gray-200 bg-white flex flex-col flex-shrink-0">
      <nav className="flex-1 px-3 py-4">
        <p className="section-title px-3 mb-3">문서 생성</p>
        <ul className="space-y-1">
          {NAV_ITEMS.filter(item => !item.hidden).map((item) => {
            const Icon = item.icon
            const isActive = pathname === item.href
            const disabled = !item.mvp

            if (disabled) {
              return (
                <li key={item.label}>
                  <span
                    title="v1.0에서 제공 예정"
                    className="flex items-center gap-3 px-3 py-2 text-sm text-gray-400 rounded-lg cursor-not-allowed"
                  >
                    <Icon size={16} />
                    {item.label}
                    <span className="ml-auto text-xs bg-gray-100 text-gray-400 px-1.5 py-0.5 rounded">
                      v1.0
                    </span>
                  </span>
                </li>
              )
            }

            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={clsx(
                    'flex items-center gap-3 px-3 py-2 text-sm rounded-lg transition-colors',
                    isActive
                      ? 'bg-brand-50 text-brand-700 font-medium'
                      : 'text-gray-700 hover:bg-gray-100'
                  )}
                >
                  <Icon size={16} />
                  {item.label}
                  {item.key && documents[item.key] && (
                    <span className="ml-auto text-xs text-green-600">✓</span>
                  )}
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>

      <div className="px-3 py-4 border-t border-gray-100">
        <p className="section-title px-3 mb-3">현재 세션</p>
        <ul className="space-y-1 px-3">
          {FLOW_STEPS.map((step, idx) => {
            const done = !!documents[step.key]
            return (
              <li key={step.key} className="flex items-center gap-2 text-sm">
                <span
                  className={clsx(
                    'w-5 h-5 rounded-full flex items-center justify-center text-xs flex-shrink-0',
                    done
                      ? 'bg-green-100 text-green-600'
                      : 'bg-gray-100 text-gray-400'
                  )}
                >
                  {done ? '✓' : idx + 1}
                </span>
                <span className={done ? 'text-gray-700' : 'text-gray-400'}>
                  {step.label}
                </span>
              </li>
            )
          })}
        </ul>
      </div>
    </aside>
  )
}
