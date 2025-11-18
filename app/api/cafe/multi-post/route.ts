import { NextRequest, NextResponse } from 'next/server'
import { getSession, getNaverAccessToken } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { postToNaverCafe } from '@/lib/naver'

interface ImageData {
  data: string // base64 인코딩된 이미지 데이터
  filename: string
  contentType?: string
}

interface MultiPostRequest {
  targets: Array<{ clubId: string; menuId: string }>
  subject: string
  content: string
  images?: ImageData[]
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

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

// ✅ 999 에러(연속 등록)시 10초 대기 후 1회 재시도
async function postWithRetryOnce(args: {
  accessToken: string
  clubId: string
  menuId: string
  subject: string
  content: string
  images?: {
    buffer: Buffer
    filename: string
    contentType?: string
  }[]
  options?: any
}) {
  try {
    // 1차 시도
    return await postToNaverCafe(args.accessToken, {
      clubId: args.clubId,
      menuId: args.menuId,
      subject: args.subject,
      content: args.content,
      images: args.images,
      options: args.options,
    })
  } catch (err: any) {
    const msg = String(err?.message || '')

    // 네이버 연속 등록 제한(999) 관련 메시지 검사
    const isRapidPostError =
      msg.includes('게시글을 연속으로 등록할 수 없습니다') ||
      msg.includes('"code":"999"') ||
      msg.includes('[999]')

    if (!isRapidPostError) {
      // 다른 에러면 그대로 던짐
      throw err
    }

    console.warn(
      '네이버 연속 등록 제한(999) 감지 → 10초 대기 후 재시도:',
      msg
    )

    // 🔁 10초 대기 후 1회 재시도
    await sleep(10000)

    return await postToNaverCafe(args.accessToken, {
      clubId: args.clubId,
      menuId: args.menuId,
      subject: args.subject,
      content: args.content,
      images: args.images,
      options: args.options,
    })
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

    const accessToken = await getNaverAccessToken(user.id)
    if (!accessToken) {
      return NextResponse.json(
        { error: '네이버 인증 정보가 없습니다. 다시 로그인해주세요.' },
        { status: 401 }
      )
    }

    const body: MultiPostRequest = await request.json()
    const { targets, subject, content, images, options } = body

    const imageBuffers = images
      ? images.map((img) => {
          const base64Data = img.data.includes(',')
            ? img.data.split(',')[1]
            : img.data
          return {
            buffer: Buffer.from(base64Data, 'base64'),
            filename: img.filename,
            contentType: img.contentType || 'image/jpeg',
          }
        })
      : undefined

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

    const results: any[] = []

    // ✅ 각 타겟에 대해 순차적으로 글 작성 + (성공/실패 상관없이) 게시판 간 10초 간격
    for (let i = 0; i < targets.length; i++) {
      const target = targets[i]

      try {
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
        } else {
          // ✅ 네이버 API 호출 (999 에러 시 10초 후 1회 재시도)
          const response = await postWithRetryOnce({
            accessToken,
            clubId: target.clubId,
            menuId: target.menuId,
            subject,
            content,
            images: imageBuffers,
            options,
          })

          const result = response.result
          if (!result || !result.articleId) {
            throw new Error(
              `네이버 API 응답에 articleId가 없습니다: ${JSON.stringify(
                response
              )}`
            )
          }

          await prisma.cafePost.create({
            data: {
              userId: user.id,
              clubId: target.clubId,
              menuId: target.menuId,
              subject,
              content: content.substring(0, 500),
              articleId: String(result.articleId),
              articleUrl: result.articleUrl || null,
              cafeUrl: result.cafeUrl || null,
            },
          })

          results.push({
            clubId: target.clubId,
            menuId: target.menuId,
            ok: true,
            articleId: result.articleId,
            articleUrl: result.articleUrl || null,
            cafeUrl: result.cafeUrl || null,
          })
        }
      } catch (error: any) {
        console.error(`카페 ${target.clubId}/${target.menuId} 글 작성 실패:`, error)
        results.push({
          clubId: target.clubId,
          menuId: target.menuId,
          ok: false,
          error: error.message || '알 수 없는 오류',
        })
      }

      // ✅ 게시판 간 10초 간격 (마지막은 생략)
      if (i < targets.length - 1) {
        console.log('다음 게시판으로 넘어가기 전 10초 대기…')
        await sleep(10000)
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