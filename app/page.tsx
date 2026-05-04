'use client'

import Link from 'next/link'
import { Layout, Monitor, BarChart2 } from 'lucide-react'
import { clsx } from 'clsx'

const TOOLS = [
  {
    href: '/test-cases',
    icon: Layout,
    label: '화면 미리보기',
    desc: '신청서(AppDet) · 그리드(IBSheet) 화면 구조를 실시간으로 미리 확인하고 이미지로 저장',
    key: null,
    mvp: true,
    color: 'text-green-600',
    bg: 'bg-green-50',
  },
  {
    href: '/screen-spec',
    icon: Monitor,
    label: '화면 정의서',
    desc: '요구사항 기반 프로그램 화면 설계서 자동 생성',
    key: null,
    mvp: true,
    color: 'text-sky-600',
    bg: 'bg-sky-50',
  },
  {
    href: '/req-summary',
    icon: BarChart2,
    label: '요구사항 취합·종합의견',
    desc: '각사별 특화내용 취합 → 종합의견 → PPTX 생성',
    key: null,
    mvp: true,
    color: 'text-indigo-600',
    bg: 'bg-indigo-50',
  },
]

export default function HomePage() {
  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">안녕하세요 👋</h1>
        <p className="text-gray-500 mt-1">오늘도 HR 문서 작업을 도와드릴게요.</p>
      </div>

      {/* 도구 카드 그리드 */}
      <div>
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">
          문서 생성 도구
        </h2>
        <div className="grid grid-cols-3 gap-4 auto-rows-fr">
          {TOOLS.map((tool) => {
            const Icon = tool.icon

            if (!tool.mvp) {
              return (
                <div
                  key={tool.label}
                  className="card p-5 opacity-60 cursor-not-allowed"
                  title="v1.0에서 제공 예정"
                >
                  <div className={clsx('w-10 h-10 rounded-lg flex items-center justify-center mb-3', tool.bg)}>
                    <Icon size={20} className={tool.color} />
                  </div>
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-medium text-gray-400 text-sm">{tool.label}</h3>
                    <span className="text-xs bg-gray-100 text-gray-400 px-1.5 py-0.5 rounded">v1.0</span>
                  </div>
                  <p className="text-xs text-gray-400">{tool.desc}</p>
                </div>
              )
            }

            return (
              <Link key={tool.href} href={tool.href} className="card p-5 hover:shadow-md transition-shadow group">
                <div className={clsx('w-10 h-10 rounded-lg flex items-center justify-center mb-3', tool.bg)}>
                  <Icon size={20} className={tool.color} />
                </div>
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-medium text-gray-900 text-sm group-hover:text-brand-600 transition-colors">
                    {tool.label}
                  </h3>
                </div>
                <p className="text-xs text-gray-500">{tool.desc}</p>
              </Link>
            )
          })}
        </div>
      </div>
    </div>
  )
}
