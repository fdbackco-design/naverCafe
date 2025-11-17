'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'

interface User {
  id: string
  displayName: string | null
  avatarUrl: string | null
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/auth/me')
      .then((res) => res.json())
      .then((data) => {
        if (data.user) {
          setUser(data.user)
        } else {
          router.push('/login')
        }
      })
      .catch(() => {
        router.push('/login')
      })
      .finally(() => {
        setLoading(false)
      })
  }, [router])

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/login')
  }

  if (loading) {
    return (
      <div className="loading">
        <p>로딩 중...</p>
      </div>
    )
  }

  if (!user) {
    return null
  }

  const navItems = [
    { href: '/dashboard', label: '대시보드' },
    { href: '/cafe-targets', label: '카페 관리' },
    { href: '/multi-post', label: '글 작성' },
    { href: '/history', label: '발행 내역' },
  ]

  return (
    <div>
      <nav
        style={{
          background: 'white',
          borderBottom: '1px solid #ddd',
          padding: '15px 0',
          marginBottom: '20px',
        }}
      >
        <div className="container">
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
              <h2 style={{ fontSize: '18px', fontWeight: 'bold' }}>
                네이버 카페 도구
              </h2>
              <div style={{ display: 'flex', gap: '15px' }}>
                {navItems.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    style={{
                      padding: '8px 12px',
                      borderRadius: '4px',
                      color: pathname === item.href ? '#03c75a' : '#333',
                      fontWeight: pathname === item.href ? '600' : '400',
                      textDecoration: 'none',
                    }}
                  >
                    {item.label}
                  </Link>
                ))}
              </div>
            </div>
            <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
              <span style={{ fontSize: '14px', color: '#666' }}>
                {user.displayName || '사용자'}
              </span>
              <button className="btn btn-secondary" onClick={handleLogout}>
                로그아웃
              </button>
            </div>
          </div>
        </div>
      </nav>
      <div className="container">{children}</div>
    </div>
  )
}

