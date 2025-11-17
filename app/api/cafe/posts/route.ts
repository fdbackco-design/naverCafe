import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

/**
 * 내가 작성한 글 목록 조회
 * GET /api/cafe/posts?page=1&limit=20&clubId=...&menuId=...
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getSession()
    if (!user) {
      return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const clubId = searchParams.get('clubId')
    const menuId = searchParams.get('menuId')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    const skip = (page - 1) * limit

    const where: any = {
      userId: user.id,
    }

    if (clubId) {
      where.clubId = clubId
    }
    if (menuId) {
      where.menuId = menuId
    }
    if (startDate || endDate) {
      where.createdAt = {}
      if (startDate) {
        where.createdAt.gte = new Date(startDate)
      }
      if (endDate) {
        where.createdAt.lte = new Date(endDate)
      }
    }

    const [posts, total] = await Promise.all([
      prisma.cafePost.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          user: {
            select: {
              displayName: true,
            },
          },
        },
      }),
      prisma.cafePost.count({ where }),
    ])

    // 카페 타겟 정보와 조인 (카페명 표시용)
    const postsWithCafeName = await Promise.all(
      posts.map(async (post) => {
        const cafeTarget = await prisma.cafeTarget.findFirst({
          where: {
            userId: user.id,
            clubId: post.clubId,
            menuId: post.menuId,
          },
          select: {
            cafeName: true,
          },
        })

        return {
          ...post,
          cafeName: cafeTarget?.cafeName || '알 수 없음',
        }
      })
    )

    return NextResponse.json({
      posts: postsWithCafeName,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error('글 목록 조회 오류:', error)
    return NextResponse.json(
      { error: '글 목록 조회에 실패했습니다.' },
      { status: 500 }
    )
  }
}

