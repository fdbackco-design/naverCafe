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

interface ImagePreview {
  id: string
  file: File
  preview: string // base64 data URL
  filename: string
}

export default function MultiPostPage() {
  const [targets, setTargets] = useState<CafeTarget[]>([])
  const [selectedTargets, setSelectedTargets] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [posting, setPosting] = useState(false)
  const [results, setResults] = useState<PostResult[] | null>(null)
  const [images, setImages] = useState<ImagePreview[]>([])
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

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files) return

    Array.from(files).forEach((file) => {
      // 이미지 파일만 허용
      if (!file.type.startsWith('image/')) {
        alert(`${file.name}은(는) 이미지 파일이 아닙니다.`)
        return
      }

      // 파일 크기 제한 (10MB)
      if (file.size > 10 * 1024 * 1024) {
        alert(`${file.name}의 크기가 너무 큽니다. (최대 10MB)`)
        return
      }

      const reader = new FileReader()
      reader.onload = (e) => {
        const preview = e.target?.result as string
        setImages((prev) => [
          ...prev,
          {
            id: Math.random().toString(36).substring(2, 15),
            file,
            preview,
            filename: file.name,
          },
        ])
      }
      reader.readAsDataURL(file)
    })

    // 같은 파일을 다시 선택할 수 있도록 input 초기화
    e.target.value = ''
  }

  const removeImage = (id: string) => {
    setImages((prev) => prev.filter((img) => img.id !== id))
  }

  const getContentType = (filename: string): string => {
    const ext = filename.split('.').pop()?.toLowerCase()
    const typeMap: Record<string, string> = {
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      png: 'image/png',
      gif: 'image/gif',
      webp: 'image/webp',
    }
    return typeMap[ext || ''] || 'image/jpeg'
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
      
      // 이미지를 base64 형식으로 변환
      const imageData = images.map((img) => ({
        data: img.preview, // 이미 base64 data URL 형식
        filename: img.filename,
        contentType: getContentType(img.filename),
      }))

      const requestBody = {
        targets: selected.map((t) => ({
          clubId: t.clubId,
          menuId: t.menuId,
        })),
        subject: formData.subject,
        content: formData.content,
        images: imageData.length > 0 ? imageData : undefined,
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
        setSelectedTargets(new Set())
        setImages([])
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
          <h2 style={{ marginBottom: '20px' }}>이미지 첨부</h2>
          <div style={{ marginBottom: '15px' }}>
            <label
              htmlFor="image-upload"
              className="btn btn-secondary"
              style={{
                display: 'inline-block',
                cursor: 'pointer',
                padding: '10px 20px',
              }}
            >
              이미지 선택
            </label>
            <input
              id="image-upload"
              type="file"
              accept="image/*"
              multiple
              onChange={handleImageSelect}
              style={{ display: 'none' }}
            />
            <span style={{ marginLeft: '15px', color: '#666', fontSize: '14px' }}>
              {images.length > 0 && `${images.length}개 이미지 선택됨`}
            </span>
          </div>

          {images.length > 0 && (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
                gap: '15px',
                marginTop: '20px',
              }}
            >
              {images.map((img) => (
                <div
                  key={img.id}
                  style={{
                    position: 'relative',
                    border: '1px solid #ddd',
                    borderRadius: '4px',
                    overflow: 'hidden',
                  }}
                >
                  <img
                    src={img.preview}
                    alt={img.filename}
                    style={{
                      width: '100%',
                      height: '150px',
                      objectFit: 'cover',
                      display: 'block',
                    }}
                  />
                  <div
                    style={{
                      padding: '8px',
                      fontSize: '12px',
                      color: '#666',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {img.filename}
                  </div>
                  <button
                    type="button"
                    onClick={() => removeImage(img.id)}
                    className="btn btn-danger"
                    style={{
                      position: 'absolute',
                      top: '5px',
                      right: '5px',
                      padding: '5px 10px',
                      fontSize: '12px',
                      borderRadius: '4px',
                    }}
                  >
                    삭제
                  </button>
                </div>
              ))}
            </div>
          )}

          <p style={{ marginTop: '15px', fontSize: '12px', color: '#666' }}>
            • 여러 이미지를 선택할 수 있습니다.
            <br />
            • 각 이미지는 최대 10MB까지 업로드 가능합니다.
            <br />
            • 지원 형식: JPG, PNG, GIF, WebP
          </p>
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

