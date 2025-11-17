import { NextResponse } from 'next/server'

/**
 * 네이버 OAuth 로그인 시작
 * GET /api/auth/naver
 */
export async function GET() {
  const clientId = process.env.NAVER_CLIENT_ID
  const redirectUri = process.env.NAVER_REDIRECT_URI

  if (!clientId || !redirectUri) {
    return NextResponse.json(
      { error: '네이버 OAuth 설정이 없습니다.' },
      { status: 500 }
    )
  }

  const state = Math.random().toString(36).substring(2, 15)
  // 네이버 카페 API 사용을 위한 스코프 (필요시 조정)
  // 네이버 개발자 센터에서 확인한 정확한 스코프 이름을 사용하세요
  const scope = 'cafe_write' // 또는 네이버 문서에 명시된 정확한 스코프
  const naverAuthUrl = `https://nid.naver.com/oauth2.0/authorize?response_type=code&client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${state}&scope=${scope}`

  const response = NextResponse.redirect(naverAuthUrl)
  response.cookies.set('oauth-state', state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 600, // 10분
  })

  return response
}

