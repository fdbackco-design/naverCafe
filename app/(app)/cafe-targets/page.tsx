'use client'

import { useEffect, useState } from 'react'

interface CafeTarget {
  id: string
  cafeName: string
  clubId: string
  menuId: string
  description: string | null
  isActive: boolean
  createdAt: string
}

export default function CafeTargetsPage() {
  const [targets, setTargets] = useState<CafeTarget[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<CafeTarget | null>(null)
  const [formData, setFormData] = useState({
    cafeUrl: '',
    cafeName: '',
    clubId: '',
    menuId: '',
    description: '',
    isActive: true,
  })

  useEffect(() => {
    loadTargets()
  }, [])

  const loadTargets = async () => {
    try {
      const res = await fetch('/api/cafe/targets')
      const data = await res.json()
      setTargets(data.targets || [])
    } catch (error) {
      console.error('카페 타겟 로드 실패:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const url = editing
        ? `/api/cafe/targets/${editing.id}`
        : '/api/cafe/targets'
      const method = editing ? 'PATCH' : 'POST'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      if (res.ok) {
        setShowForm(false)
        setEditing(null)
        setFormData({
          cafeUrl: '',
          cafeName: '',
          clubId: '',
          menuId: '',
          description: '',
          isActive: true,
        })
        loadTargets()
      } else {
        alert('저장에 실패했습니다.')
      }
    } catch (error) {
      console.error('저장 실패:', error)
      alert('저장에 실패했습니다.')
    }
  }

  /**
   * 네이버 카페 URL에서 클럽 ID와 메뉴 ID 추출
   * 예: https://cafe.naver.com/f-e/cafes/17614417/menus/30?viewType=L
   * -> clubId: 17614417, menuId: 30
   */
  const parseCafeUrl = (url: string): { clubId: string; menuId: string } | null => {
    if (!url || url.trim() === '') {
      return null
    }

    try {
      // 다양한 URL 패턴 지원
      // 1. https://cafe.naver.com/f-e/cafes/17614417/menus/30
      // 2. https://cafe.naver.com/cafes/17614417/menus/30
      // 3. https://cafe.naver.com/카페명/17614417/30
      // 4. ?clubid=17614417&menuid=30
      
      // 패턴 1, 2: cafes/17614417/menus/30
      const cafesMenusMatch = url.match(/cafes\/(\d+)\/menus\/(\d+)/)
      if (cafesMenusMatch) {
        return {
          clubId: cafesMenusMatch[1],
          menuId: cafesMenusMatch[2],
        }
      }

      // 패턴 3: /17614417/30 (직접 숫자 패턴)
      const directMatch = url.match(/\/(\d{6,})\/(\d+)(?:\?|$)/)
      if (directMatch) {
        return {
          clubId: directMatch[1],
          menuId: directMatch[2],
        }
      }

      // 패턴 4: 쿼리 파라미터
      const clubIdMatch = url.match(/[?&]clubid=(\d+)/i)
      const menuIdMatch = url.match(/[?&]menuid=(\d+)/i)
      if (clubIdMatch) {
        return {
          clubId: clubIdMatch[1],
          menuId: menuIdMatch ? menuIdMatch[1] : '',
        }
      }

      return null
    } catch (error) {
      console.error('URL 파싱 오류:', error)
      return null
    }
  }

  const handleUrlChange = (url: string) => {
    setFormData({ ...formData, cafeUrl: url })
    
    const parsed = parseCafeUrl(url)
    if (parsed) {
      setFormData((prev) => ({
        ...prev,
        cafeUrl: url,
        clubId: parsed.clubId,
        menuId: parsed.menuId,
      }))
    }
  }

  const handleEdit = (target: CafeTarget) => {
    setEditing(target)
    setFormData({
      cafeUrl: '', // 수정 시에는 URL 입력 필드 비움
      cafeName: target.cafeName,
      clubId: target.clubId,
      menuId: target.menuId,
      description: target.description || '',
      isActive: target.isActive,
    })
    setShowForm(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('정말 삭제하시겠습니까?')) return

    try {
      const res = await fetch(`/api/cafe/targets/${id}`, { method: 'DELETE' })
      if (res.ok) {
        loadTargets()
      } else {
        alert('삭제에 실패했습니다.')
      }
    } catch (error) {
      console.error('삭제 실패:', error)
      alert('삭제에 실패했습니다.')
    }
  }

  const handleToggleActive = async (target: CafeTarget) => {
    try {
      const res = await fetch(`/api/cafe/targets/${target.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !target.isActive }),
      })
      if (res.ok) {
        loadTargets()
      }
    } catch (error) {
      console.error('상태 변경 실패:', error)
    }
  }

  if (loading) {
    return <div className="loading">로딩 중...</div>
  }

  return (
    <div>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '20px',
        }}
      >
        <h1>카페/게시판 관리</h1>
        <button
          className="btn btn-primary"
          onClick={() => {
            setShowForm(!showForm)
            setEditing(null)
            setFormData({
              cafeUrl: '',
              cafeName: '',
              clubId: '',
              menuId: '',
              description: '',
              isActive: true,
            })
          }}
        >
          {showForm ? '취소' : '+ 새 카페 추가'}
        </button>
      </div>

      {showForm && (
        <div className="card">
          <h2 style={{ marginBottom: '20px' }}>
            {editing ? '카페 수정' : '새 카페 추가'}
          </h2>
          <form onSubmit={handleSubmit}>
            <label>
              네이버 카페 URL *
              <input
                type="url"
                value={formData.cafeUrl}
                onChange={(e) => handleUrlChange(e.target.value)}
                placeholder="https://cafe.naver.com/f-e/cafes/17614417/menus/30"
                required={!editing}
                style={{ marginBottom: '10px' }}
              />
              <p style={{ fontSize: '12px', color: '#666', marginTop: '5px', marginBottom: '10px' }}>
                네이버 카페 게시판 URL을 입력하면 클럽 ID와 메뉴 ID가 자동으로 추출됩니다.
              </p>
            </label>
            <label>
              카페명 *
              <input
                type="text"
                value={formData.cafeName}
                onChange={(e) =>
                  setFormData({ ...formData, cafeName: e.target.value })
                }
                required
                placeholder="예: 노인장기요양기관 실무카페"
              />
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
              <label>
                클럽 ID (clubId) *
                <input
                  type="text"
                  value={formData.clubId}
                  onChange={(e) =>
                    setFormData({ ...formData, clubId: e.target.value })
                  }
                  required
                  placeholder="자동 추출됨"
                  readOnly={!!formData.cafeUrl && !editing}
                  style={{
                    backgroundColor: formData.cafeUrl && !editing ? '#f5f5f5' : 'white',
                    cursor: formData.cafeUrl && !editing ? 'not-allowed' : 'text',
                  }}
                />
              </label>
              <label>
                메뉴 ID (menuId) *
                <input
                  type="text"
                  value={formData.menuId}
                  onChange={(e) =>
                    setFormData({ ...formData, menuId: e.target.value })
                  }
                  required
                  placeholder="자동 추출됨"
                  readOnly={!!formData.cafeUrl && !editing}
                  style={{
                    backgroundColor: formData.cafeUrl && !editing ? '#f5f5f5' : 'white',
                    cursor: formData.cafeUrl && !editing ? 'not-allowed' : 'text',
                  }}
                />
              </label>
            </div>
            <label>
              설명
              <input
                type="text"
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                placeholder="선택사항 (예: 자유게시판)"
              />
            </label>
            <div className="checkbox-item">
              <input
                type="checkbox"
                id="isActive"
                checked={formData.isActive}
                onChange={(e) =>
                  setFormData({ ...formData, isActive: e.target.checked })
                }
              />
              <label htmlFor="isActive" style={{ margin: 0 }}>
                활성화
              </label>
            </div>
            <div style={{ marginTop: '20px' }}>
              <button type="submit" className="btn btn-primary">
                {editing ? '수정' : '추가'}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="card">
        <h2 style={{ marginBottom: '20px' }}>등록된 카페 목록</h2>
        {targets.length === 0 ? (
          <p style={{ color: '#666', textAlign: 'center', padding: '40px' }}>
            등록된 카페가 없습니다.
          </p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>카페명</th>
                <th>클럽 ID</th>
                <th>메뉴 ID</th>
                <th>설명</th>
                <th>상태</th>
                <th>등록일</th>
                <th>작업</th>
              </tr>
            </thead>
            <tbody>
              {targets.map((target) => (
                <tr key={target.id}>
                  <td>{target.cafeName}</td>
                  <td>{target.clubId}</td>
                  <td>{target.menuId}</td>
                  <td>{target.description || '-'}</td>
                  <td>
                    <button
                      className="btn"
                      style={{
                        padding: '5px 10px',
                        fontSize: '12px',
                        backgroundColor: target.isActive ? '#d4edda' : '#f8d7da',
                        color: target.isActive ? '#155724' : '#721c24',
                      }}
                      onClick={() => handleToggleActive(target)}
                    >
                      {target.isActive ? '활성' : '비활성'}
                    </button>
                  </td>
                  <td>{new Date(target.createdAt).toLocaleDateString('ko-KR')}</td>
                  <td>
                    <div style={{ display: 'flex', gap: '5px' }}>
                      <button
                        className="btn btn-secondary"
                        style={{ padding: '5px 10px', fontSize: '12px' }}
                        onClick={() => handleEdit(target)}
                      >
                        수정
                      </button>
                      <button
                        className="btn btn-danger"
                        style={{ padding: '5px 10px', fontSize: '12px' }}
                        onClick={() => handleDelete(target.id)}
                      >
                        삭제
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

