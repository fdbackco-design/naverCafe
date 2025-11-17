import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

/**
 * 카페 타겟 수정
 * PATCH /api/cafe/targets/[id]
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getSession()
    if (!user) {
      return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 })
    }

    const body = await request.json()
    const { cafeName, clubId, menuId, description, isActive } = body

    // 소유권 확인
    const existing = await prisma.cafeTarget.findFirst({
      where: { id: params.id, userId: user.id },
    })

    if (!existing) {
      return NextResponse.json(
        { error: '카페 타겟을 찾을 수 없습니다.' },
        { status: 404 }
      )
    }

    const target = await prisma.cafeTarget.update({
      where: { id: params.id },
      data: {
        ...(cafeName && { cafeName }),
        ...(clubId && { clubId: String(clubId) }),
        ...(menuId && { menuId: String(menuId) }),
        ...(description !== undefined && { description }),
        ...(isActive !== undefined && { isActive }),
      },
    })

    return NextResponse.json({ target })
  } catch (error) {
    console.error('카페 타겟 수정 오류:', error)
    return NextResponse.json(
      { error: '카페 타겟 수정에 실패했습니다.' },
      { status: 500 }
    )
  }
}

/**
 * 카페 타겟 삭제
 * DELETE /api/cafe/targets/[id]
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getSession()
    if (!user) {
      return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 })
    }

    // 소유권 확인
    const existing = await prisma.cafeTarget.findFirst({
      where: { id: params.id, userId: user.id },
    })

    if (!existing) {
      return NextResponse.json(
        { error: '카페 타겟을 찾을 수 없습니다.' },
        { status: 404 }
      )
    }

    await prisma.cafeTarget.delete({
      where: { id: params.id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('카페 타겟 삭제 오류:', error)
    return NextResponse.json(
      { error: '카페 타겟 삭제에 실패했습니다.' },
      { status: 500 }
    )
  }
}

