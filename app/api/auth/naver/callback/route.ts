import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { getNaverToken, getNaverUserInfo } from '@/lib/naver'
import { prisma } from '@/lib/prisma'
import { createSession } from '@/lib/auth'

/**
 * 네이버 OAuth 콜백 처리
 * GET /api/auth/naver/callback?code=...&state=...
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const code = searchParams.get('code')
    const state = searchParams.get('state')
    const error = searchParams.get('error')

    if (error) {
      return NextResponse.redirect(new URL('/login?error=oauth_error', request.url))
    }

    if (!code || !state) {
      return NextResponse.redirect(new URL('/login?error=missing_params', request.url))
    }

    // State 검증
    const cookieStore = await cookies()
    const savedState = cookieStore.get('oauth-state')?.value
    if (savedState !== state) {
      return NextResponse.redirect(new URL('/login?error=invalid_state', request.url))
    }

    const clientId = process.env.NAVER_CLIENT_ID
    const clientSecret = process.env.NAVER_CLIENT_SECRET
    const redirectUri = process.env.NAVER_REDIRECT_URI

    if (!clientId || !clientSecret || !redirectUri) {
      return NextResponse.redirect(new URL('/login?error=config_error', request.url))
    }

    // 토큰 발급
    const tokenData = await getNaverToken(code, clientId, clientSecret, redirectUri)

    // 사용자 정보 조회
    const naverUser = await getNaverUserInfo(tokenData.access_token)

    // 만료 시간 계산
    const expiresAt = new Date()
    expiresAt.setSeconds(expiresAt.getSeconds() + tokenData.expires_in)

    // User 및 NaverAccount upsert
    const user = await prisma.user.upsert({
      where: { id: naverUser.id },
      update: {
        displayName: naverUser.nickname || null,
        avatarUrl: naverUser.profile_image || null,
        updatedAt: new Date(),
      },
      create: {
        id: naverUser.id,
        displayName: naverUser.nickname || null,
        avatarUrl: naverUser.profile_image || null,
      },
    })

    await prisma.naverAccount.upsert({
      where: { userId: user.id },
      update: {
        accessToken: tokenData.access_token,
        refreshToken: tokenData.refresh_token,
        expiresAt,
        updatedAt: new Date(),
      },
      create: {
        userId: user.id,
        naverUserId: naverUser.id,
        accessToken: tokenData.access_token,
        refreshToken: tokenData.refresh_token,
        expiresAt,
      },
    })

    // 세션 생성
    const sessionToken = await createSession(user.id)

    // 쿠키 설정 및 리디렉트
    const response = NextResponse.redirect(new URL('/dashboard', request.url))
    response.cookies.set('auth-token', sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7일
    })
    response.cookies.delete('oauth-state')

    return response
  } catch (error) {
    console.error('OAuth 콜백 오류:', error)
    return NextResponse.redirect(new URL('/login?error=server_error', request.url))
  }
}

