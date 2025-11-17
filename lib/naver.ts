/**
 * 네이버 카페 API 호출 유틸리티
 * 모든 네이버 API 호출은 서버 사이드에서만 수행
 */

const NAVER_API_BASE = 'https://openapi.naver.com'

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

  // 기본 옵션 설정 (네이버 API 기본값 기준)
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

  // URL 인코딩 (네이버 API는 특정 인코딩을 요구할 수 있음)
  const params = new URLSearchParams()
  params.append('subject', subject)
  params.append('content', content)
  params.append('openyn', finalOptions.openyn ? 'Y' : 'N')
  params.append('searchopen', finalOptions.searchopen ? 'Y' : 'N')
  params.append('replyyn', finalOptions.replyyn ? 'Y' : 'N')
  params.append('scrapyn', finalOptions.scrapyn ? 'Y' : 'N')
  params.append('metoo', finalOptions.metoo ? 'Y' : 'N')
  params.append('autosourcing', finalOptions.autosourcing ? 'Y' : 'N')
  params.append('rclick', finalOptions.rclick ? 'Y' : 'N')
  params.append('ccl', finalOptions.ccl ? 'Y' : 'N')

  const url = `${NAVER_API_BASE}/v1/cafe/${clubId}/menu/${menuId}/articles`

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
    },
    body: params.toString(),
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`네이버 API 오류: ${response.status} - ${errorText}`)
  }

  const data = await response.json()
  return data
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

