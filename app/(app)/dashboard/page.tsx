'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

interface Stats {
  totalTargets: number
  activeTargets: number
  totalPosts: number
  recentPosts: number
}

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      fetch('/api/cafe/targets').then((res) => res.json()),
      fetch('/api/cafe/posts?limit=5').then((res) => res.json()),
    ])
      .then(([targetsData, postsData]) => {
        const targets = targetsData.targets || []
        setStats({
          totalTargets: targets.length,
          activeTargets: targets.filter((t: any) => t.isActive).length,
          totalPosts: postsData.pagination?.total || 0,
          recentPosts: postsData.posts?.length || 0,
        })
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return <div className="loading">로딩 중...</div>
  }

  return (
    <div>
      <h1 style={{ marginBottom: '30px' }}>대시보드</h1>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px' }}>
        <div className="card">
          <h3 style={{ fontSize: '14px', color: '#666', marginBottom: '10px' }}>
            등록된 카페
          </h3>
          <p style={{ fontSize: '32px', fontWeight: 'bold' }}>
            {stats?.totalTargets || 0}
          </p>
        </div>
        <div className="card">
          <h3 style={{ fontSize: '14px', color: '#666', marginBottom: '10px' }}>
            활성 카페
          </h3>
          <p style={{ fontSize: '32px', fontWeight: 'bold' }}>
            {stats?.activeTargets || 0}
          </p>
        </div>
        <div className="card">
          <h3 style={{ fontSize: '14px', color: '#666', marginBottom: '10px' }}>
            총 발행 글
          </h3>
          <p style={{ fontSize: '32px', fontWeight: 'bold' }}>
            {stats?.totalPosts || 0}
          </p>
        </div>
        <div className="card">
          <h3 style={{ fontSize: '14px', color: '#666', marginBottom: '10px' }}>
            최근 발행
          </h3>
          <p style={{ fontSize: '32px', fontWeight: 'bold' }}>
            {stats?.recentPosts || 0}
          </p>
        </div>
      </div>

      <div style={{ marginTop: '40px', display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '20px' }}>
        <div className="card">
          <h2 style={{ marginBottom: '15px' }}>빠른 시작</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <Link href="/cafe-targets">
              <button className="btn btn-primary" style={{ width: '100%' }}>
                카페/게시판 등록하기
              </button>
            </Link>
            <Link href="/multi-post">
              <button className="btn btn-primary" style={{ width: '100%' }}>
                글 작성하기
              </button>
            </Link>
          </div>
        </div>
        <div className="card">
          <h2 style={{ marginBottom: '15px' }}>최근 발행 내역</h2>
          <Link href="/history">
            <button className="btn btn-secondary" style={{ width: '100%' }}>
              전체 내역 보기
            </button>
          </Link>
        </div>
      </div>
    </div>
  )
}

