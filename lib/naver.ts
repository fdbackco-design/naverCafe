/**
 * 네이버 카페 API 호출 유틸리티
 * 모든 네이버 API 호출은 서버 사이드에서만 수행
 */

import iconv from 'iconv-lite'
//import FormData from 'form-data'

const NAVER_API_BASE = 'https://openapi.naver.com'

/**
 * x-www-form-urlencoded 용 인코딩
 * - Java: URLEncoder.encode(URLEncoder.encode(str, "UTF-8"), "MS949")
 * - 여기서는 MS949 한 번만 쓰던 버전도 동작했지만,
 *   공식 문서 기준 double-encoding 형태를 최대한 근사.
 */
export function encodeForNaverCafe(value: string): string {
  // 1) UTF-8 URLEncoder에 해당하는 1차 인코딩 (공백 -> + 포함)
  let utf8Once = encodeURIComponent(value)
  utf8Once = utf8Once.replace(/%20/g, '+')

  // 2) 이 문자열을 "MS949"로 보고 다시 URLEncoder
  const buf = iconv.encode(utf8Once, 'euckr') // or 'cp949'

  let out = ''
  for (let i = 0; i < buf.length; i++) {
    const ch = buf[i]

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
      out += '+'
    } else {
      out += '%' + ch.toString(16).toUpperCase().padStart(2, '0')
    }
  }

  return out
}

/**
 * multipart/form-data 용 인코딩
 * - 공식 Node 예제 수준으로: UTF-8 한 번만 인코딩
 * - 굳이 공백을 +로 바꾸지 않고, encodeURI와 동일한 동작으로 맞춤
 */
export function encodeForNaverMultipart(value: string): string {
  return encodeURIComponent(value)
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

export interface NaverCafeImage {
  buffer: Buffer
  filename: string
  contentType?: string
}

export interface NaverCafePostRequest {
  clubId: string
  menuId: string
  subject: string
  content: string
  images?: NaverCafeImage[]
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
 * - images가 있으면 multipart/form-data
 * - 없으면 application/x-www-form-urlencoded
 */
export async function postToNaverCafe(
  accessToken: string,
  request: NaverCafePostRequest
): Promise<NaverCafePostResponse> {
  const { clubId, menuId, subject, content, images, options } = request

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

  const url = `${NAVER_API_BASE}/v1/cafe/${clubId}/menu/${menuId}/articles`

  // ✅ 1) 이미지가 있는 경우: multipart/form-data (웹 표준 FormData 사용)
  if (images && images.length > 0) {
    // ➜ Next.js / Node 18+ 에서 제공하는 Web FormData 사용
    const formData = new FormData()

    // 네이버 공식 예제처럼 UTF-8 한 번만 URL 인코딩
    const encodedSubject = encodeForNaverMultipart(subject)
    const encodedContent = encodeForNaverMultipart(content)

    if (process.env.NODE_ENV === 'development') {
      console.log('【MULTIPART】원본 제목:', subject)
      console.log('【MULTIPART】UTF-8 인코딩 제목:', encodedSubject)
      console.log('【MULTIPART】원본 내용 (앞 50자):', content.substring(0, 50))
      console.log('【MULTIPART】UTF-8 인코딩 내용 (앞 100자):', encodedContent.substring(0, 100))
      console.log(`이미지 첨부 개수: ${images.length}`)
    }

    // ✅ 텍스트 필드
    formData.append('subject', encodedSubject)
    formData.append('content', encodedContent)

    // ⚠️ 옵션은 일단 빼고 최소한의 필드만 보냄 (공식 예제도 subject/content/image만 사용)
    // 필요하면 나중에 하나씩 추가

    // ✅ 이미지 필드: "image" 이름을 여러 번 반복 (공식 문서 권장 패턴)
    images.forEach((image, idx) => {
      const blob = new Blob([image.buffer as any], {
        type: image.contentType || 'image/jpeg',
      })
    
      formData.append('image', blob, image.filename || `image_${idx}.jpg`)
    })

    // ✅ Content-Type 은 fetch가 자동으로 설정하게 둔다! (boundary 포함)
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        // ❌ 여기서 Content-Type 절대 직접 지정하지 않음
        // ❌ formData.getHeaders() 같은 것도 사용하지 않음
      },
      body: formData,
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

    console.log('네이버 API 응답 (multipart):', JSON.stringify(data, null, 2))

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

  // ✅ 2) 이미지가 없는 경우: x-www-form-urlencoded + UTF-8 → MS949 재인코딩
  const encodedSubject = encodeForNaverCafe(subject)
  const encodedContent = encodeForNaverCafe(content)

  if (process.env.NODE_ENV === 'development') {
    console.log('【FORM】원본 제목:', subject)
    console.log('【FORM】MS949+URL 인코딩된 제목:', encodedSubject)
    console.log('【FORM】원본 내용 (앞 50자):', content.substring(0, 50))
    console.log('【FORM】MS949+URL 인코딩된 내용 (앞 100자):', encodedContent.substring(0, 100))
  }

  const bodyParts: string[] = []
  bodyParts.push(`subject=${encodedSubject}`)
  bodyParts.push(`content=${encodedContent}`)

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

  console.log('네이버 API 응답 (form):', JSON.stringify(data, null, 2))

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
      Authorization: `Bearer ${accessToken}`,
    },
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`네이버 사용자 정보 조회 실패: ${response.status} - ${errorText}`)
  }

  const data = await response.json()
  return data.response
}