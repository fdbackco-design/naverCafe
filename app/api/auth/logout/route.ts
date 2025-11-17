import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'

/**
 * 로그아웃
 * POST /api/auth/logout
 */
export async function POST() {
  const response = NextResponse.json({ success: true })
  response.cookies.delete('auth-token')
  return response
}

