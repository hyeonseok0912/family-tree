# 실행·DB 관리

## 로컬 실행

Node.js 22에서 검증했습니다. `.env.example`을 참고해 `.env.local`에 실제 `DATABASE_URL`을 설정합니다. 연결 주소에 SSL 설정이 있으면 PostgreSQL 드라이버가 이를 사용합니다. 비밀번호·DB 주소·백업을 Git에 올리지 않습니다.

```powershell
npm ci
npm run dev
```

기본 주소는 `http://localhost:3000`입니다. 이미 서버가 실행 중이면 하나만 유지하세요. 의존성을 업데이트한 뒤에는 기존 서버를 Ctrl+C로 종료하고 다시 실행합니다.

## DB 설치 및 변경

```powershell
npm run db:migrate
```

매번 데이터 스냅샷을 먼저 만든 뒤 트랜잭션에서 SQL을 적용합니다. 실패하면 구조 변경을 롤백합니다. 기존 161명의 구성원을 유지한 채 관리자·권한·삭제·병합·날짜 필드를 추가했습니다. 부모 순환과 세대 불일치는 현재 데이터 점검에서 발견되지 않았습니다.

빈 DB에는 `000-core-schema.sql`부터 기본 테이블을 설치합니다. 기존 DB에는 `CREATE TABLE IF NOT EXISTS`로 기존 테이블을 유지합니다. 기존 데이터의 등록자는 추측하여 배정하지 않습니다. 상위 관리자가 계정 탭에서 구성원 ID별 등록자를 지정할 수 있습니다.

관리자 계정이 하나도 없는 새 DB에서만 아래 명령을 실행합니다.

```powershell
npm run db:bootstrap
```

초기 계정은 `admin`, 임시 비밀번호는 `.private/initial-admin.txt`에 저장됩니다. 이 DB에는 이미 초기 계정이 있으므로 다시 bootstrap하지 않습니다. 최초 로그인 후 관리자 계정 탭에서 비밀번호를 변경해야 저장할 수 있습니다.

## 백업

```powershell
npm run db:backup
```

`backups/snapshot-시간값.json`에 모든 public 테이블의 데이터, 열 정보, 제약조건 정보를 저장합니다. 로그인 해시·세션 등도 포함될 수 있으므로 백업 파일은 비공개로 보관하세요. 이 JSON은 같은 스키마에 데이터를 복원하는 용도이며, 함수·뷰·전체 인덱스·역할까지 복구하는 PostgreSQL 전체 dump는 아닙니다.

현재 Windows 작업 스케줄러에 `FamilyTreeDailyBackup`을 등록했습니다. 매일 로컬 시간 03:00에 실행하며 로그인한 사용자 세션과 켜진 PC·네트워크가 필요합니다. 수동 실행 결과 0과 새 백업 파일 생성을 확인했습니다. 자동으로 과거 백업을 삭제하지 않습니다.

```powershell
schtasks /Query /TN FamilyTreeDailyBackup /V /FO LIST
schtasks /Run /TN FamilyTreeDailyBackup
```

다른 PC에는 `scripts/install-backup-task.ps1`을 실행하여 등록합니다.

GitHub의 `database-backup.yml`도 마련했습니다. 저장소 Secret `DATABASE_URL`을 설정한 뒤 실행하면 PostgreSQL 17 클라이언트로 전체 dump를 생성해 30일간 artifact로 보관합니다. 현재 DB의 서버 주요 버전은 17입니다. 이후 서버 버전을 올리면 백업 클라이언트도 함께 올려야 합니다. 이 워크플로의 원격 등록·Secret 설정·실제 실행은 아직 하지 않았습니다.

## JSON 데이터 복구

복구는 전체 데이터를 교체합니다. 웹사이트의 쓰기를 중단하고 복구할 백업과 대상 DB 주소를 먼저 확인하세요.

```powershell
node scripts/database.cjs restore "C:\family-tree\backups\snapshot-원하는값.json" --confirm-replace-all-data
```

복구 전 현재 데이터도 백업합니다. 테이블 목록과 열이 다르면 중단합니다. 트랜잭션 안에서 외래키를 일시 지연시켜 데이터와 순환 참조를 복원한 뒤 제약조건 설정과 자동 ID를 복구합니다. 기존 로그인 세션은 모두 해제합니다. 임시 DB에서 실제 복구를 검증했으며 운영 DB 복구는 실행하지 않았습니다.

스키마 자체를 잃었다면 전체 PostgreSQL dump와 `pg_restore`를 우선 사용하세요. JSON 백업은 백업 당시와 일치하는 스키마를 먼저 준비해야 합니다. 오래된 JSON이 새 스키마와 다르면 복구되지 않습니다.

## 운영 API

`/api/ping`과 `/api/cleanpinglog`는 인증이 필요합니다. 호스팅 환경의 `CRON_SECRET`과 GitHub Actions Secret `CRON_SECRET`에 같은 무작위 값을 설정합니다. `cleanpinglog`는 POST입니다. 실제 호스팅·GitHub 계정의 Secret은 이 작업에서 변경하지 않았습니다.

## 검증 명령

```powershell
npm test
npm run test:db
npm run lint
npm run verify:build
npm run test:http
```

DB 검증은 임시 스키마를 만들고 제거합니다. 기존 구성원은 변경하지 않습니다. HTTP 검증은 직전 성공한 격리 빌드와 포트 3101을 사용해 실제 서버 요청을 테스트합니다. 브라우저 화면 조작과 동일한 검증은 아닙니다.

검증 빌드는 `.verification`에 소스를 복사하므로 현재 개발 서버의 `.next`를 덮어쓰지 않습니다. 배포용 일반 빌드는 `npm run build`, 실행은 `npm start`입니다.

## 의존성과 Git

Next.js는 15.5.27, jsPDF는 4.2.1로 업데이트했습니다. PostCSS 보안 업데이트를 override로 고정하고 실제 빌드를 검증합니다. 사용되지 않던 MySQL·React Flow 의존성을 제거했습니다. npm audit의 운영 의존성과 개발 의존성 결과를 분리해 기록합니다.

`.next` 생성 파일 105개의 Git 추적을 해제했습니다. 디스크의 생성 파일은 유지하며 변경 사항에는 추적 해제만 staged되어 있습니다. 나머지 소스는 커밋하거나 배포하지 않았습니다.

## Neon 운영 DB 적용 (별도 연결 파일)

운영 DB를 로컬 개발 연결과 분리하기 위해 `.private/production-database-url.txt`에 새 production 연결 URL 한 줄을 직접 넣는다. `.private/`는 Git에서 제외된다. 채팅에 연결 비밀번호를 보내지 않는다. 이 파일은 일반 `.env.local`을 변경하지 않으며 운영 웹사이트의 Render 환경 변수도 직접 바꾸지 않는다.

```powershell
node scripts/database.cjs inspect --url-file .private/production-database-url.txt
node scripts/database.cjs backup --url-file .private/production-database-url.txt
node scripts/database.cjs migrate --url-file .private/production-database-url.txt
node scripts/database.cjs inspect --url-file .private/production-database-url.txt
```

첫 inspect에서 Neon production 호스트와 기존 구성원 수가 맞는지 확인한다. backup은 모든 public 테이블을 비공개 backups 폴더에 JSON 스냅샷으로 저장한다. migrate도 먼저 스냅샷을 만들고 모든 변경을 하나의 트랜잭션에서 적용한다. 운영 반영 중에는 사이트의 등록·수정·삭제 작업을 잠시 멈춘다. JSON 백업은 같은 스키마의 데이터 복구용으로, 전체 DDL·뷰·역할을 복구하는 pg_dump 대체가 아니다. 별도의 전체 복구본이 필요하면 Neon 제공 복구 기능과 pg_dump 백업을 함께 준비한다.

적용 뒤 inspect에 000-core-schema, 001-admin-system, 002-member-safety, 003-admin-lifecycle가 표시돼야 한다. 계정이 0개인 경우에만 초기 상위 관리자를 만든다.

```powershell
node scripts/database.cjs bootstrap --url-file .private/production-database-url.txt
```

명시적인 운영 연결 파일로 생성한 초기 계정은 `.private/production-initial-admin.txt`에 저장한다. 로컬 초기 계정 파일과 구분하며 최초 로그인 후 비밀번호를 변경한다. 이미 계정이 있으면 bootstrap을 실행하지 않는다. Git 반영 및 웹 배포 후 로그인·계정 권한·구성원 조회·저장을 확인한다.
