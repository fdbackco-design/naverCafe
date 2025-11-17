'use client'

import { useEffect, useState } from 'react'

interface CafeTarget {
  id: string
  cafeName: string
  clubId: string
  menuId: string
  isActive: boolean
}

interface PostResult {
  clubId: string
  menuId: string
  ok: boolean
  articleId?: number
  articleUrl?: string
  cafeUrl?: string
  error?: string
}

export default function MultiPostPage() {
  const [targets, setTargets] = useState<CafeTarget[]>([])
  const [selectedTargets, setSelectedTargets] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [posting, setPosting] = useState(false)
  const [results, setResults] = useState<PostResult[] | null>(null)
  const [formData, setFormData] = useState({
    subject: '',
    content: '',
    options: {
      openyn: true,
      searchopen: true,
      replyyn: true,
      scrapyn: true,
      metoo: true,
      autosourcing: true,
      rclick: true,
      ccl: true,
    },
  })

  useEffect(() => {
    loadTargets()
  }, [])

  const loadTargets = async () => {
    try {
      const res = await fetch('/api/cafe/targets')
      const data = await res.json()
      const activeTargets = (data.targets || []).filter(
        (t: CafeTarget) => t.isActive
      )
      setTargets(activeTargets)
    } catch (error) {
      console.error('카페 타겟 로드 실패:', error)
    } finally {
      setLoading(false)
    }
  }

  // 카페별로 그룹화
  const groupedTargets = targets.reduce((acc, target) => {
    if (!acc[target.cafeName]) {
      acc[target.cafeName] = []
    }
    acc[target.cafeName].push(target)
    return acc
  }, {} as Record<string, CafeTarget[]>)

  const toggleTarget = (id: string) => {
    const newSelected = new Set(selectedTargets)
    if (newSelected.has(id)) {
      newSelected.delete(id)
    } else {
      newSelected.add(id)
    }
    setSelectedTargets(newSelected)
  }

  const selectAll = () => {
    if (selectedTargets.size === targets.length) {
      setSelectedTargets(new Set())
    } else {
      setSelectedTargets(new Set(targets.map((t) => t.id)))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (selectedTargets.size === 0) {
      alert('최소 하나의 카페/게시판을 선택해주세요.')
      return
    }

    if (!formData.subject || !formData.content) {
      alert('제목과 본문을 입력해주세요.')
      return
    }

    setPosting(true)
    setResults(null)

    try {
      const selected = targets.filter((t) => selectedTargets.has(t.id))
      const requestBody = {
        targets: selected.map((t) => ({
          clubId: t.clubId,
          menuId: t.menuId,
        })),
        subject: formData.subject,
        content: formData.content,
        options: formData.options,
      }

      const res = await fetch('/api/cafe/multi-post', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      })

      const data = await res.json()
      setResults(data.results || [])

      // 성공한 경우 폼 초기화
      if (data.results?.some((r: PostResult) => r.ok)) {
        setFormData({
          subject: '',
          content: '',
          options: formData.options,
        })
        setSelectedTargets(new Set())
      }
    } catch (error) {
      console.error('글 작성 실패:', error)
      alert('글 작성 중 오류가 발생했습니다.')
    } finally {
      setPosting(false)
    }
  }

  if (loading) {
    return <div className="loading">로딩 중...</div>
  }

  return (
    <div>
      <h1 style={{ marginBottom: '30px' }}>다중 글 작성</h1>

      <div className="card">
        <h2 style={{ marginBottom: '20px' }}>카페/게시판 선택</h2>
        {targets.length === 0 ? (
          <p style={{ color: '#666', padding: '20px' }}>
            등록된 활성 카페가 없습니다.{' '}
            <a href="/cafe-targets" style={{ color: '#03c75a' }}>
              카페를 등록하세요
            </a>
          </p>
        ) : (
          <>
            <div style={{ marginBottom: '15px' }}>
              <button
                className="btn btn-secondary"
                onClick={selectAll}
                style={{ fontSize: '14px' }}
              >
                {selectedTargets.size === targets.length
                  ? '전체 해제'
                  : '전체 선택'}
              </button>
              <span style={{ marginLeft: '15px', color: '#666' }}>
                {selectedTargets.size}개 선택됨
              </span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {Object.entries(groupedTargets).map(([cafeName, cafeTargets]) => (
                <div key={cafeName} style={{ border: '1px solid #ddd', padding: '15px', borderRadius: '4px' }}>
                  <h3 style={{ marginBottom: '10px', fontSize: '16px' }}>
                    {cafeName}
                  </h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {cafeTargets.map((target) => (
                      <div
                        key={target.id}
                        className="checkbox-item"
                        style={{ marginLeft: '10px' }}
                      >
                        <input
                          type="checkbox"
                          id={target.id}
                          checked={selectedTargets.has(target.id)}
                          onChange={() => toggleTarget(target.id)}
                        />
                        <label
                          htmlFor={target.id}
                          style={{ margin: 0, cursor: 'pointer' }}
                        >
                          게시판 ID: {target.menuId} (클럽: {target.clubId})
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      <form onSubmit={handleSubmit}>
        <div className="card">
          <h2 style={{ marginBottom: '20px' }}>글 내용</h2>
          <label>
            제목 *
            <input
              type="text"
              value={formData.subject}
              onChange={(e) =>
                setFormData({ ...formData, subject: e.target.value })
              }
              required
              placeholder="게시글 제목을 입력하세요"
            />
          </label>
          <label>
            본문 *
            <textarea
              value={formData.content}
              onChange={(e) =>
                setFormData({ ...formData, content: e.target.value })
              }
              required
              placeholder="게시글 본문을 입력하세요. HTML 태그 사용 가능 (예: &lt;br&gt; 태그로 줄바꿈)"
            />
          </label>
        </div>

        <div className="card">
          <h2 style={{ marginBottom: '20px' }}>옵션</h2>
          <div className="checkbox-group">
            <div className="checkbox-item">
              <input
                type="checkbox"
                id="openyn"
                checked={formData.options.openyn}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    options: { ...formData.options, openyn: e.target.checked },
                  })
                }
              />
              <label htmlFor="openyn" style={{ margin: 0 }}>
                공개 (openyn)
              </label>
            </div>
            <div className="checkbox-item">
              <input
                type="checkbox"
                id="searchopen"
                checked={formData.options.searchopen}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    options: { ...formData.options, searchopen: e.target.checked },
                  })
                }
              />
              <label htmlFor="searchopen" style={{ margin: 0 }}>
                검색 허용 (searchopen)
              </label>
            </div>
            <div className="checkbox-item">
              <input
                type="checkbox"
                id="replyyn"
                checked={formData.options.replyyn}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    options: { ...formData.options, replyyn: e.target.checked },
                  })
                }
              />
              <label htmlFor="replyyn" style={{ margin: 0 }}>
                댓글 허용 (replyyn)
              </label>
            </div>
            <div className="checkbox-item">
              <input
                type="checkbox"
                id="scrapyn"
                checked={formData.options.scrapyn}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    options: { ...formData.options, scrapyn: e.target.checked },
                  })
                }
              />
              <label htmlFor="scrapyn" style={{ margin: 0 }}>
                스크랩 허용 (scrapyn)
              </label>
            </div>
            <div className="checkbox-item">
              <input
                type="checkbox"
                id="metoo"
                checked={formData.options.metoo}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    options: { ...formData.options, metoo: e.target.checked },
                  })
                }
              />
              <label htmlFor="metoo" style={{ margin: 0 }}>
                공감 허용 (metoo)
              </label>
            </div>
            <div className="checkbox-item">
              <input
                type="checkbox"
                id="autosourcing"
                checked={formData.options.autosourcing}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    options: { ...formData.options, autosourcing: e.target.checked },
                  })
                }
              />
              <label htmlFor="autosourcing" style={{ margin: 0 }}>
                자동 출처 (autosourcing)
              </label>
            </div>
            <div className="checkbox-item">
              <input
                type="checkbox"
                id="rclick"
                checked={formData.options.rclick}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    options: { ...formData.options, rclick: e.target.checked },
                  })
                }
              />
              <label htmlFor="rclick" style={{ margin: 0 }}>
                우클릭 허용 (rclick)
              </label>
            </div>
            <div className="checkbox-item">
              <input
                type="checkbox"
                id="ccl"
                checked={formData.options.ccl}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    options: { ...formData.options, ccl: e.target.checked },
                  })
                }
              />
              <label htmlFor="ccl" style={{ margin: 0 }}>
                CCL (ccl)
              </label>
            </div>
          </div>
        </div>

        <div style={{ marginTop: '20px', textAlign: 'right' }}>
          <button
            type="submit"
            className="btn btn-primary"
            disabled={posting || selectedTargets.size === 0}
            style={{ padding: '15px 30px', fontSize: '16px' }}
          >
            {posting
              ? '작성 중...'
              : `선택한 ${selectedTargets.size}개 카페/게시판에 글 작성`}
          </button>
        </div>
      </form>

      {results && (
        <div className="card" style={{ marginTop: '20px' }}>
          <h2 style={{ marginBottom: '20px' }}>작성 결과</h2>
          <table>
            <thead>
              <tr>
                <th>클럽 ID</th>
                <th>메뉴 ID</th>
                <th>상태</th>
                <th>게시글 ID</th>
                <th>링크</th>
                <th>오류</th>
              </tr>
            </thead>
            <tbody>
              {results.map((result, idx) => (
                <tr key={idx}>
                  <td>{result.clubId}</td>
                  <td>{result.menuId}</td>
                  <td>
                    <span
                      style={{
                        color: result.ok ? '#155724' : '#721c24',
                        fontWeight: 'bold',
                      }}
                    >
                      {result.ok ? '성공' : '실패'}
                    </span>
                  </td>
                  <td>{result.articleId || '-'}</td>
                  <td>
                    {result.articleUrl ? (
                      <a
                        href={result.articleUrl}
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
                  <td style={{ color: '#721c24' }}>
                    {result.error || '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

