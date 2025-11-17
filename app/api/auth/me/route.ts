import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'

/**
 * 현재 로그인한 사용자 정보 조회
 * GET /api/auth/me
 */
export async function GET() {
  const user = await getSession()
  if (!user) {
    return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 })
  }
  return NextResponse.json({ user })
}

