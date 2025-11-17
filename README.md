# 네이버 카페 글 다중 등록 도구

Next.js + Supabase + 네이버 카페 API를 활용한 다중 카페 글 등록 서비스

## 🚀 시작하기

### 1. 환경 변수 설정

`.env.local` 파일을 생성하고 다음 변수들을 설정하세요:

```env
# Database
DATABASE_URL="postgresql://user:password@host:5432/database?schema=public"

# JWT Secret (랜덤 문자열 생성 권장)
JWT_SECRET="your-random-secret-key-here"

# Naver OAuth 2.0
NAVER_CLIENT_ID="your_naver_client_id"
NAVER_CLIENT_SECRET="your_naver_client_secret"
NAVER_REDIRECT_URI="http://localhost:3000/api/auth/naver/callback"
```

### 2. 의존성 설치

```bash
npm install
```

### 3. 데이터베이스 마이그레이션

```bash
# Prisma 클라이언트 생성
npx prisma generate

# 마이그레이션 실행
npx prisma migrate dev
```

### 4. 개발 서버 실행

```bash
npm run dev
```

브라우저에서 [http://localhost:3000](http://localhost:3000)을 열어 확인하세요.

## 📋 주요 기능

- **네이버 OAuth 2.0 로그인**: 네이버 계정으로 안전한 인증
- **카페/게시판 관리**: 여러 카페와 게시판을 등록하고 관리
- **다중 글 작성**: 한 번에 여러 카페/게시판에 글 등록
- **발행 내역 조회**: 작성한 글의 내역을 조회하고 필터링

## 🏗 프로젝트 구조

```
app/
  (public)/
    login/          # 로그인 페이지
  (app)/
    dashboard/      # 대시보드
    cafe-targets/   # 카페/게시판 관리
    multi-post/     # 다중 글 작성
    history/        # 발행 내역
  api/
    auth/           # 인증 API
    cafe/           # 카페 관련 API
lib/
  prisma.ts         # Prisma 클라이언트
  auth.ts           # 인증 유틸리티
  naver.ts          # 네이버 API 유틸리티
prisma/
  schema.prisma     # 데이터베이스 스키마
```

## 🔐 보안 주의사항

- 모든 네이버 API 호출은 서버 사이드에서만 수행됩니다
- 클라이언트에는 민감한 정보(access_token, refresh_token 등)가 노출되지 않습니다
- 환경 변수는 절대 Git에 커밋하지 마세요

## 📦 배포 (Vercel)

1. Vercel에 프로젝트를 연결합니다
2. 환경 변수를 Vercel 대시보드에서 설정합니다
3. `DATABASE_URL`은 Supabase에서 제공하는 연결 문자열을 사용합니다
4. `NAVER_REDIRECT_URI`는 프로덕션 도메인으로 변경합니다

빌드 시 Prisma 마이그레이션이 자동으로 실행됩니다 (`package.json`의 `build` 스크립트 참조).

## 🛠 개발 명령어

```bash
# 개발 서버 실행
npm run dev

# Prisma 클라이언트 생성
npm run db:generate

# 데이터베이스 마이그레이션
npm run db:migrate

# Prisma Studio 실행 (DB GUI)
npm run db:studio
```

## 📝 네이버 API 설정

1. [네이버 개발자 센터](https://developers.naver.com/)에서 애플리케이션을 등록합니다
2. OAuth 2.0 설정에서 리디렉션 URI를 등록합니다:
   - 개발: `http://localhost:3000/api/auth/naver/callback`
   - 프로덕션: `https://your-domain.vercel.app/api/auth/naver/callback`
3. Client ID와 Client Secret을 `.env.local`에 설정합니다

## ⚠️ 주의사항

- 네이버 카페 API는 정확한 `clubId`와 `menuId`가 필요합니다
- 카페/게시판 ID는 네이버 카페 URL에서 확인할 수 있습니다
- 토큰 만료 시 자동 갱신 로직은 추후 구현 예정입니다

