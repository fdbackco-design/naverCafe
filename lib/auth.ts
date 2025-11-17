import { cookies } from 'next/headers'
import { prisma } from './prisma'
import jwt from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production'

export interface SessionUser {
  id: string
  displayName: string | null
  avatarUrl: string | null
}

export async function getSession(): Promise<SessionUser | null> {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get('auth-token')?.value

    if (!token) {
      return null
    }

    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string }
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        displayName: true,
        avatarUrl: true,
      },
    })

    return user
  } catch (error) {
    return null
  }
}

export async function createSession(userId: string): Promise<string> {
  const token = jwt.sign({ userId }, JWT_SECRET, { expiresIn: '7d' })
  return token
}

export async function getNaverAccessToken(userId: string): Promise<string | null> {
  const naverAccount = await prisma.naverAccount.findUnique({
    where: { userId },
  })

  if (!naverAccount) {
    return null
  }

  // 토큰 만료 체크 및 갱신 로직 (필요시 구현)
  if (naverAccount.expiresAt < new Date()) {
    // TODO: refresh token으로 재발급 로직 구현
    return null
  }

  return naverAccount.accessToken
}

