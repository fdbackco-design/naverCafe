import { NextRequest, NextResponse } from 'next/server'
import { getSession, getNaverAccessToken } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { postToNaverCafe } from '@/lib/naver'

interface MultiPostRequest {
  targets: Array<{ clubId: string; menuId: string }>
  subject: string
  content: string
  options?: {
    openyn?: boolean
    searchopen?: boolean
    replyyn?: boolean
    scrapyn?: boolean
    metoo?: boolean
    autosourcing?: boolean
    rclick?: boolean
    ccl?: boolean
  }
}

/**
 * 다중 카페에 글 작성
 * POST /api/cafe/multi-post
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getSession()
    if (!user) {
      return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 })
    }

    // 네이버 액세스 토큰 조회
    const accessToken = await getNaverAccessToken(user.id)
    if (!accessToken) {
      return NextResponse.json(
        { error: '네이버 인증 정보가 없습니다. 다시 로그인해주세요.' },
        { status: 401 }
      )
    }

    const body: MultiPostRequest = await request.json()
    const { targets, subject, content, options } = body

    if (!targets || !Array.isArray(targets) || targets.length === 0) {
      return NextResponse.json(
        { error: '최소 하나의 타겟이 필요합니다.' },
        { status: 400 }
      )
    }

    if (!subject || !content) {
      return NextResponse.json(
        { error: '제목과 본문은 필수입니다.' },
        { status: 400 }
      )
    }

    const results = []

    // 각 타겟에 대해 순차적으로 글 작성
    for (const target of targets) {
      try {
        // 카페 타겟 정보 조회 (로깅용)
        const cafeTarget = await prisma.cafeTarget.findFirst({
          where: {
            userId: user.id,
            clubId: target.clubId,
            menuId: target.menuId,
            isActive: true,
          },
        })

        if (!cafeTarget) {
          results.push({
            clubId: target.clubId,
            menuId: target.menuId,
            ok: false,
            error: '등록되지 않은 카페/게시판입니다.',
          })
          continue
        }

        // 네이버 API 호출
        const response = await postToNaverCafe(accessToken, {
          clubId: target.clubId,
          menuId: target.menuId,
          subject,
          content,
          options,
        })

        // 성공 시 DB에 기록
        await prisma.cafePost.create({
          data: {
            userId: user.id,
            clubId: target.clubId,
            menuId: target.menuId,
            subject,
            content: content.substring(0, 500), // 요약만 저장
            articleId: String(response.result.articleId),
            articleUrl: response.result.articleUrl,
            cafeUrl: response.result.cafeUrl,
          },
        })

        results.push({
          clubId: target.clubId,
          menuId: target.menuId,
          ok: true,
          articleId: response.result.articleId,
          articleUrl: response.result.articleUrl,
          cafeUrl: response.result.cafeUrl,
        })
      } catch (error: any) {
        console.error(`카페 ${target.clubId}/${target.menuId} 글 작성 실패:`, error)
        results.push({
          clubId: target.clubId,
          menuId: target.menuId,
          ok: false,
          error: error.message || '알 수 없는 오류',
        })
      }
    }

    return NextResponse.json({ results })
  } catch (error: any) {
    console.error('다중 글 작성 오류:', error)
    return NextResponse.json(
      { error: error.message || '다중 글 작성에 실패했습니다.' },
      { status: 500 }
    )
  }
}

