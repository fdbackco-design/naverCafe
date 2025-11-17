import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: '네이버 카페 글 다중 등록 도구',
  description: '여러 네이버 카페에 한 번에 글을 등록하는 도구',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  )
}

