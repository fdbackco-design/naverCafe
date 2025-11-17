'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

export default function LoginPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const errorParam = searchParams.get('error')
    if (errorParam) {
      const errorMessages: Record<string, string> = {
        oauth_error: 'OAuth 인증 중 오류가 발생했습니다.',
        missing_params: '필수 파라미터가 누락되었습니다.',
        invalid_state: '보안 검증에 실패했습니다.',
        config_error: '서버 설정 오류가 발생했습니다.',
        server_error: '서버 오류가 발생했습니다.',
      }
      setError(errorMessages[errorParam] || '알 수 없는 오류가 발생했습니다.')
    }
  }, [searchParams])

  const handleNaverLogin = () => {
    window.location.href = '/api/auth/naver'
  }

  return (
    <div className="container" style={{ maxWidth: '400px', marginTop: '100px' }}>
      <div className="card">
        <h1 style={{ marginBottom: '30px', textAlign: 'center' }}>
          네이버 카페 글 다중 등록 도구
        </h1>

        {error && <div className="error">{error}</div>}

        <button
          className="btn btn-primary"
          onClick={handleNaverLogin}
          style={{ width: '100%', padding: '15px', fontSize: '16px' }}
        >
          네이버로 로그인
        </button>

        <p
          style={{
            marginTop: '20px',
            fontSize: '12px',
            color: '#666',
            textAlign: 'center',
          }}
        >
          네이버 계정으로 로그인하여 서비스를 이용하세요.
        </p>
      </div>
    </div>
  )
}

