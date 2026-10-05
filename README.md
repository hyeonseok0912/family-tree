# 밀성 손씨 교동파 족보

Next.js Pages Router·React·PostgreSQL 기반 구성원 목록과 가계도 관리 웹사이트입니다.

## 실행

Node.js 22를 사용합니다. `.env.example`을 참고하여 `.env.local`에 DB 연결 주소를 설정합니다.

```powershell
npm ci
npm run dev
```

기본 주소: `http://localhost:3000`.

현재 DB 마이그레이션과 초기 관리자 생성은 완료되어 있습니다. 초기 로그인 정보는 Git에서 제외한 `.private/initial-admin.txt`에 있으며 첫 로그인 후 비밀번호를 변경해야 합니다. 새 DB 설치 방법은 운영 문서를 확인하세요.

## 구현한 기능

- 서버 세션 로그인·마지막 ID 기억·가입 승인·상위/하위 관리자·소유권과 개별 권한.
- 구성원 등록·수정·삭제·복원·동명이인 확인·관계 보존 병합과 변경 전후 작업 이력.
- 부모 순환 방지·후손 세대 재계산·배우자 ID와 어머니 관계 유지.
- 연도/날짜 직접 입력·달력·미상·기존 1월 1일 검토.
- 상세·관계·검색에서 가계도 이동·강조, 모바일 카드 목록·키보드 접근성.
- 가계도 PNG·여러 페이지 PDF, PWA 설치 안내·오프라인 안내.
- DB 변경 전 백업·수동/정기 백업·데이터 복구, 모바일 WebView 프로젝트 소스.

## 문서와 검증

- [단계별 변경 내용과 완료/미검증 범위](IMPLEMENTATION_STEPS.md)
- [실행·DB 설치·백업·복구](OPERATIONS.md)
- [사용자 테스트 순서](TEST_GUIDE.md)
- [Android/iPhone 앱 소스와 빌드 방법](mobile/README.md)
- [이전 개발 기록](docs/PROJECT_HISTORY.md)

```powershell
npm test
npm run test:db
npm run lint
npm run verify:build
npm run test:http
```

실제 브라우저 시각 확인·기기 설치·네이티브 패키지 빌드는 별도 확인이 필요합니다. 원격 사이트 및 앱 스토어에 자동 배포하지 않습니다.
