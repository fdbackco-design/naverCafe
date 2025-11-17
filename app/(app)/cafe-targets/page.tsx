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

  const handleEdit = (target: CafeTarget) => {
    setEditing(target)
    setFormData({
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
              카페명 *
              <input
                type="text"
                value={formData.cafeName}
                onChange={(e) =>
                  setFormData({ ...formData, cafeName: e.target.value })
                }
                required
              />
            </label>
            <label>
              클럽 ID (clubId) *
              <input
                type="text"
                value={formData.clubId}
                onChange={(e) =>
                  setFormData({ ...formData, clubId: e.target.value })
                }
                required
                placeholder="예: 12345678"
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
                placeholder="예: 1"
              />
            </label>
            <label>
              설명
              <input
                type="text"
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                placeholder="선택사항"
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

