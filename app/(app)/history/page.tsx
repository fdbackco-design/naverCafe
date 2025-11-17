'use client'

import { useEffect, useState } from 'react'

interface CafePost {
  id: string
  clubId: string
  menuId: string
  subject: string
  content: string
  articleId: string | null
  articleUrl: string | null
  cafeUrl: string | null
  createdAt: string
  cafeName: string
}

interface Pagination {
  page: number
  limit: number
  total: number
  totalPages: number
}

export default function HistoryPage() {
  const [posts, setPosts] = useState<CafePost[]>([])
  const [pagination, setPagination] = useState<Pagination | null>(null)
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [filters, setFilters] = useState({
    clubId: '',
    menuId: '',
    startDate: '',
    endDate: '',
  })

  useEffect(() => {
    loadPosts()
  }, [page, filters])

  const loadPosts = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20',
      })
      if (filters.clubId) params.append('clubId', filters.clubId)
      if (filters.menuId) params.append('menuId', filters.menuId)
      if (filters.startDate) params.append('startDate', filters.startDate)
      if (filters.endDate) params.append('endDate', filters.endDate)

      const res = await fetch(`/api/cafe/posts?${params.toString()}`)
      const data = await res.json()
      setPosts(data.posts || [])
      setPagination(data.pagination || null)
    } catch (error) {
      console.error('글 목록 로드 실패:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleFilterChange = (key: string, value: string) => {
    setFilters({ ...filters, [key]: value })
    setPage(1) // 필터 변경 시 첫 페이지로
  }

  if (loading && posts.length === 0) {
    return <div className="loading">로딩 중...</div>
  }

  return (
    <div>
      <h1 style={{ marginBottom: '30px' }}>발행 내역</h1>

      <div className="card">
        <h2 style={{ marginBottom: '20px' }}>필터</h2>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: '15px',
          }}
        >
          <label>
            클럽 ID
            <input
              type="text"
              value={filters.clubId}
              onChange={(e) => handleFilterChange('clubId', e.target.value)}
              placeholder="필터링..."
            />
          </label>
          <label>
            메뉴 ID
            <input
              type="text"
              value={filters.menuId}
              onChange={(e) => handleFilterChange('menuId', e.target.value)}
              placeholder="필터링..."
            />
          </label>
          <label>
            시작일
            <input
              type="date"
              value={filters.startDate}
              onChange={(e) => handleFilterChange('startDate', e.target.value)}
            />
          </label>
          <label>
            종료일
            <input
              type="date"
              value={filters.endDate}
              onChange={(e) => handleFilterChange('endDate', e.target.value)}
            />
          </label>
        </div>
      </div>

      <div className="card">
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '20px',
          }}
        >
          <h2>발행된 글 목록</h2>
          {pagination && (
            <span style={{ color: '#666' }}>
              총 {pagination.total}개 (페이지 {pagination.page}/{pagination.totalPages})
            </span>
          )}
        </div>

        {posts.length === 0 ? (
          <p style={{ color: '#666', textAlign: 'center', padding: '40px' }}>
            발행된 글이 없습니다.
          </p>
        ) : (
          <>
            <table>
              <thead>
                <tr>
                  <th>발행일시</th>
                  <th>카페명</th>
                  <th>클럽 ID</th>
                  <th>메뉴 ID</th>
                  <th>제목</th>
                  <th>게시글 ID</th>
                  <th>링크</th>
                </tr>
              </thead>
              <tbody>
                {posts.map((post) => (
                  <tr key={post.id}>
                    <td>
                      {new Date(post.createdAt).toLocaleString('ko-KR', {
                        year: 'numeric',
                        month: '2-digit',
                        day: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>
                    <td>{post.cafeName}</td>
                    <td>{post.clubId}</td>
                    <td>{post.menuId}</td>
                    <td style={{ maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {post.subject}
                    </td>
                    <td>{post.articleId || '-'}</td>
                    <td>
                      {post.articleUrl ? (
                        <a
                          href={post.articleUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{ color: '#03c75a' }}
                        >
                          보기
                        </a>
                      ) : (
                        '-'
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {pagination && pagination.totalPages > 1 && (
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'center',
                  gap: '10px',
                  marginTop: '20px',
                }}
              >
                <button
                  className="btn btn-secondary"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                >
                  이전
                </button>
                <span style={{ padding: '10px 20px', display: 'flex', alignItems: 'center' }}>
                  {page} / {pagination.totalPages}
                </span>
                <button
                  className="btn btn-secondary"
                  onClick={() =>
                    setPage((p) => Math.min(pagination.totalPages, p + 1))
                  }
                  disabled={page === pagination.totalPages}
                >
                  다음
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

