# Family Tree Web App
# URL : https://miryangson.onrender.com

Next.js 기반 족보 시각화 및 구성원 관리 웹 애플리케이션입니다. 구성원 추가/수정/조회, 트리 시각화, 관리자 기능, 반응형 UI를 포함한 족보 프로젝트입니다.

## 🛠 기술 스택

| 영역        | 기술/도구                  |
|-------------|----------------------------|
| Frontend    | React, Next.js (Page Router) |
| Backend     | Next.js API Routes (Node.js) |
| Database    | PostgreSQL (Neon)    |
| Chart       | react-google-charts (OrgChart) |
| Styling     | CSS Modules                 |

---

## 📌 주요 기능

- 구성원 CRUD (이름, 한자, 성별, 출생/사망일, 부모, 배우자 등)
- 구성원 상세 보기 및 편집
- 구성원 트리뷰 시각화 (OrgChart)
- 특정 구성원 포커싱 및 강조
- 부모 선택 시 세대 자동 계산
- 트리 뷰에서 마우스 드래그 이동 및 줌 기능
- 형제/자식 목록 토글 보기
- 관리자 로그인 시 UI 제어
- 반응형 트리뷰 및 스크롤 최적화
- 트리 / 구성원 PDF 또는 이미지 다운로드 기능

---

## 📅 개발 로그

### 2025.04.16~ – 프로젝트 시작
- Next.js + PostgreSQL 환경 세팅
- 구성원 리스트(TableList), 트리뷰(TreeView), 상세 보기 초기 구조 생성

- 구성원 추가/수정/조회 기능 구현
- API 및 프론트 폼 유효성 검사 추가
- 부모 선택 시 세대 자동 계산 커스텀 훅 (`useParentSelection`) 제작

- react-google-charts의 OrgChart를 활용한 족보 트리 구현
- 드래그 이동, 줌 인/아웃, 포커스 이동 기능 추가
- 클릭 시 구성원 상세 정보 모달 띄우기 구현

- 중간 스크롤 제거, window + treeWrapper만 스크롤 사용하도록 구조 리팩토링
- 내부 드래그 vs 외부 스크롤 충돌 이슈 해결
- 모바일 대응: 트리뷰 auto height 및 중심 이동 보정 추가

### 2025.06.16~ – 상세 보기 기능 강화
- 형제/자식 보기 토글 추가
- 상세 보기 내 구성원 간 탐색, 뒤로가기 스택 구현
- `ModalDetail` 구성 정보 테이블화, 가독성 개선
- `hanja` 컬럼 추가: 이름과 한자 분리
- ModalNew, ModalEdit, ModalDetail 등 모든 컴포넌트 및 API 연동 반영
- ChartRenderer에서 `이름 / (한자) / 세대` 형태로 표현

### 2025.06.23~ – 코드 구조 리팩토링
- API 호출 유틸 함수 `utils/api.js` 분리
- 공통 입력 필드 `FormField.js`, 부모 선택 드롭다운 `ParentSelector.js` 재사용화
- 중복 코드 제거 및 관리 용이성 향상
- `.env.local` 및 `db_pg.js` 설정 수정 (`ssl.rejectUnauthorized: false`)
- DB 연결 문제 해결 및 API 정상 작동 확인

- 트리 노드 클릭 시 화면 중앙 포커싱 + 스크롤 위치 조정
- 한자 존재 시 3단 레이아웃 구성 (`이름`, `(한자)`, `세대`)
- 이름에 한자가 함께 들어있던 문제 해결 → 한자 분리 입력 필드 도입
- index.html 변경 및 css 수정
- DB 구조 경량화를 위한 테이블 구조 튜닝 및 데이터 튜닝
- 테이블 변경에 따른 api와 컴포넌트 변경

---

## ✨ 향후 계획

- 구성원 메타 정보 표기 (`updated_at`, `updated_by`)
- 루트 조상 수동 설정 기능 (트리 시작점)
- 유사어 검색 기능 (이름 철자 유사 매칭)
- 트리뷰 확대 시 성별 아이콘, 색상 표시 등 시각적 개선

---

## 🧪 관리자 기능

- 로그인 ID: ``
- 비밀번호: ``
- 로그인 시 구성원 추가/수정 버튼 활성화
- 세션 상태에 따라 상단 우측 UI가 동적으로 변경


