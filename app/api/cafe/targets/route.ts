import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

/**
 * 카페 타겟 목록 조회
 * GET /api/cafe/targets
 */
export async function GET() {
  try {
    const user = await getSession()
    if (!user) {
      return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 })
    }

    const targets = await prisma.cafeTarget.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({ targets })
  } catch (error) {
    console.error('카페 타겟 조회 오류:', error)
    return NextResponse.json(
      { error: '카페 타겟 조회에 실패했습니다.' },
      { status: 500 }
    )
  }
}

/**
 * 카페 타겟 생성
 * POST /api/cafe/targets
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getSession()
    if (!user) {
      return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 })
    }

    const body = await request.json()
    const { cafeName, clubId, menuId, description, isActive } = body

    if (!cafeName || !clubId || !menuId) {
      return NextResponse.json(
        { error: '카페명, 클럽ID, 메뉴ID는 필수입니다.' },
        { status: 400 }
      )
    }

    const target = await prisma.cafeTarget.create({
      data: {
        userId: user.id,
        cafeName,
        clubId: String(clubId),
        menuId: String(menuId),
        description: description || null,
        isActive: isActive !== undefined ? isActive : true,
      },
    })

    return NextResponse.json({ target }, { status: 201 })
  } catch (error) {
    console.error('카페 타겟 생성 오류:', error)
    return NextResponse.json(
      { error: '카페 타겟 생성에 실패했습니다.' },
      { status: 500 }
    )
  }
}

