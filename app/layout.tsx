import type { Metadata } from 'next'
import './globals.css'
import { Sidebar } from '@/components/layout/Sidebar'
import { Header } from '@/components/layout/Header'
import { AuthGuard } from '@/components/auth/AuthGuard'

export const metadata: Metadata = {
  title: 'HR PL Assistant',
  description: 'HR 시스템 구축 PM/PL을 위한 문서 자동화 도구',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body>
        <AuthGuard>
          <div className="flex h-screen overflow-hidden">
            <Sidebar />
            <div className="flex flex-col flex-1 overflow-hidden">
              <Header />
              <main className="flex-1 overflow-auto p-6">
                {children}
              </main>
            </div>
          </div>
        </AuthGuard>
      </body>
    </html>
  )
}
