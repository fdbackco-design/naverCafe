/**
 * 네이버 카페 API 호출 유틸리티
 * 모든 네이버 API 호출은 서버 사이드에서만 수행
 */

import iconv from 'iconv-lite'

const NAVER_API_BASE = 'https://openapi.naver.com'

/**
 * 네이버 카페가 기대하는 방식으로 인코딩
 * - 문자열을 MS949(CP949) 바이트로 변환
 * - 그 바이트 배열을 x-www-form-urlencoded 규칙으로 퍼센트 인코딩
 *   (Java URLEncoder(..., "MS949")와 동일한 방식)
 */
export function encodeForNaverCafe(value: string): string {
  // 1) 먼저 브라우저/Node 표준 UTF-8 URL 인코딩 (URLEncoder(..., "UTF-8")에 해당)
  const utf8Encoded = encodeURIComponent(value)
  // 예: "테스트" -> "%ED%85%8C%EC%8A%A4%ED%8A%B8"

  // 2) 이 문자열을 MS949 바이트로 보고 다시 URLEncoder (MS949)
  const buf = iconv.encode(utf8Encoded, 'euckr') // or 'cp949'

  let out = ''
  for (let i = 0; i < buf.length; i++) {
    const ch = buf[i]

    // Java URLEncoder 규칙:
    // 알파벳, 숫자, - _ . * 그대로
    if (
      (ch >= 0x30 && ch <= 0x39) || // 0-9
      (ch >= 0x41 && ch <= 0x5a) || // A-Z
      (ch >= 0x61 && ch <= 0x7a) || // a-z
      ch === 0x2d || // -
      ch === 0x2e || // .
      ch === 0x5f || // _
      ch === 0x2a // *
    ) {
      out += String.fromCharCode(ch)
    } else if (ch === 0x20) {
      // 공백 → +
      out += '+'
    } else {
      // 그 외는 %HH
      out += '%' + ch.toString(16).toUpperCase().padStart(2, '0')
    }
  }

  return out
}

export interface NaverCafePostOptions {
  openyn?: boolean
  searchopen?: boolean
  replyyn?: boolean
  scrapyn?: boolean
  metoo?: boolean
  autosourcing?: boolean
  rclick?: boolean
  ccl?: boolean
}

export interface NaverCafePostRequest {
  clubId: string
  menuId: string
  subject: string
  content: string
  options?: NaverCafePostOptions
}

export interface NaverCafePostResponse {
  result: {
    articleId: number
    articleUrl: string
    cafeUrl: string
    status: string
  }
}


/**
 * 네이버 카페에 글 작성
 */
export async function postToNaverCafe(
  accessToken: string,
  request: NaverCafePostRequest
): Promise<NaverCafePostResponse> {
  const { clubId, menuId, subject, content, options } = request

  const defaultOptions: Required<NaverCafePostOptions> = {
    openyn: true,
    searchopen: true,
    replyyn: true,
    scrapyn: true,
    metoo: true,
    autosourcing: true,
    rclick: true,
    ccl: true,
  }

  const finalOptions = { ...defaultOptions, ...options }

  // ✅ 여기서 MS949 기준 인코딩
  const encodedSubject = encodeForNaverCafe(subject)
  const encodedContent = encodeForNaverCafe(content)

  if (process.env.NODE_ENV === 'development') {
    console.log('원본 제목:', subject)
    console.log('MS949+URL 인코딩된 제목:', encodedSubject)
    console.log('원본 내용 (앞 50자):', content.substring(0, 50))
    console.log('MS949+URL 인코딩된 내용 (앞 100자):', encodedContent.substring(0, 100))
  }

  // ✅ form body 직접 구성 (URLSearchParams 사용 X)
  const bodyParts: string[] = []
  bodyParts.push(`subject=${encodedSubject}`)
  bodyParts.push(`content=${encodedContent}`)

  // 옵션은 네이버 문서 기준: true/false 텍스트
  // (Y/N도 동작하는 경우가 있지만, 공식 문서대로 가는 게 안전)
  const boolToStr = (v: boolean) => (v ? 'true' : 'false')

  bodyParts.push(`openyn=${boolToStr(finalOptions.openyn)}`)
  bodyParts.push(`searchopen=${boolToStr(finalOptions.searchopen)}`)
  bodyParts.push(`replyyn=${boolToStr(finalOptions.replyyn)}`)
  bodyParts.push(`scrapyn=${boolToStr(finalOptions.scrapyn)}`)
  bodyParts.push(`metoo=${boolToStr(finalOptions.metoo)}`)
  bodyParts.push(`autosourcing=${boolToStr(finalOptions.autosourcing)}`)
  bodyParts.push(`rclick=${boolToStr(finalOptions.rclick)}`)
  bodyParts.push(`ccl=${boolToStr(finalOptions.ccl)}`)

  const bodyString = bodyParts.join('&')

  const url = `${NAVER_API_BASE}/v1/cafe/${clubId}/menu/${menuId}/articles`

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: bodyString,
  })

  const responseText = await response.text()

  if (!response.ok) {
    throw new Error(`네이버 API HTTP 오류: ${response.status} - ${responseText}`)
  }

  let data: any
  try {
    data = JSON.parse(responseText)
  } catch {
    console.error('네이버 API 응답 파싱 실패:', responseText)
    throw new Error(`네이버 API 응답 파싱 실패: ${responseText}`)
  }

  console.log('네이버 API 응답:', JSON.stringify(data, null, 2))

  if (data.message && data.message.error) {
    const error = data.message.error
    const errorMsg = error.msg || error.message || '알 수 없는 오류'
    const errorCode = error.code || 'UNKNOWN'
    throw new Error(`네이버 API 오류 [${errorCode}]: ${errorMsg}`)
  }

  if (data.result) {
    return data
  } else if (data.message && data.message.result) {
    return { result: data.message.result }
  } else if (data.articleId) {
    return {
      result: {
        articleId: data.articleId,
        articleUrl: data.articleUrl || '',
        cafeUrl: data.cafeUrl || '',
        status: data.status || 'success',
      },
    }
  } else {
    console.error('예상치 못한 네이버 API 응답 구조:', data)
    throw new Error(`예상치 못한 네이버 API 응답 구조: ${JSON.stringify(data)}`)
  }
}

/**
 * 네이버 OAuth 토큰 발급
 */
export async function getNaverToken(
  code: string,
  clientId: string,
  clientSecret: string,
  redirectUri: string
): Promise<{
  access_token: string
  refresh_token: string
  expires_in: number
  token_type: string
}> {
  const params = new URLSearchParams()
  params.append('grant_type', 'authorization_code')
  params.append('client_id', clientId)
  params.append('client_secret', clientSecret)
  params.append('redirect_uri', redirectUri)
  params.append('code', code)

  const response = await fetch('https://nid.naver.com/oauth2.0/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: params.toString(),
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`네이버 토큰 발급 실패: ${response.status} - ${errorText}`)
  }

  return await response.json()
}

/**
 * 네이버 사용자 정보 조회
 */
export async function getNaverUserInfo(accessToken: string): Promise<{
  id: string
  nickname?: string
  profile_image?: string
  email?: string
}> {
  const response = await fetch('https://openapi.naver.com/v1/nid/me', {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
    },
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`네이버 사용자 정보 조회 실패: ${response.status} - ${errorText}`)
  }

  const data = await response.json()
  return data.response
}

