# 기존 웹사이트를 여는 모바일 앱

웹사이트의 Next.js·PostgreSQL 로직을 유지하고 앱은 사이트를 여는 역할을 합니다. Android는 [WebView 공식 문서](https://developer.android.com/develop/ui/views/layout/webapps/webview), iPhone은 [WKWebView 공식 문서](https://developer.apple.com/documentation/webkit/wkwebview)를 기준으로 구현했습니다.

## 현재 상태

- 웹 PWA: manifest, 홈 화면 아이콘, 설치 안내, 오프라인 안내 구현.
- Android: Gradle 프로젝트, Java Activity, 인터넷 권한, HTTPS 사이트 제한, 외부 링크 브라우저 이동, 로그인 쿠키, 뒤로가기, 연결 재시도, PNG/PDF 다운로드 구현.
- iPhone: Xcode 프로젝트, SwiftUI/WKWebView, 로그인 쿠키, 스와이프 뒤로가기, 외부 링크 이동, 연결 재시도, PNG/PDF 공유 구현.
- 이 Windows 환경에는 JDK·Android SDK가 없고 Xcode는 실행할 수 없어 APK/IPA 빌드와 기기 테스트는 아직 수행하지 않았습니다. 스토어에 배포하지 않았습니다.

## PWA 확인

`npm run build` 후 `npm start`로 실행합니다. 서비스 워커는 개발 서버에서는 등록하지 않습니다. HTTPS 배포 주소나 localhost에서 확인할 수 있습니다. Android 브라우저 메뉴의 설치, iPhone Safari의 공유 → 홈 화면에 추가를 사용합니다.

계정·세션·족보 API 응답은 오프라인 캐시에 저장하지 않습니다. 인터넷이 끊기면 안내 화면이 표시됩니다.

## Android 빌드

1. Android Studio에서 `mobile/android` 폴더를 엽니다.
2. JDK 17, Android SDK 35, Gradle 8.9로 동기화합니다. Android Gradle Plugin은 8.7.3입니다. Gradle wrapper 파일은 이 환경에서 생성하지 않았으므로 IDE의 Gradle 설치 설정을 사용한 뒤 `gradle wrapper --gradle-version 8.9`로 생성할 수 있습니다.
3. `gradle.properties`의 `SITE_URL`을 실제 HTTPS 배포 주소로 지정합니다. 현재는 기존 운영 워크플로에 사용한 `https://milseongson.onrender.com`입니다. 이 로컬 개발 내용이 그 서버에 자동 배포되지는 않습니다.
4. Build → Build APK로 디버그 APK를 생성합니다. Android 10 이상 기기를 대상으로 합니다.
5. 출시 전 applicationId와 버전, 아이콘, 실제 URL을 확인하고 사용자 소유 서명 키로 release 빌드합니다.

로컬 PC의 localhost 주소는 휴대폰의 localhost와 다릅니다. 개발 테스트는 HTTPS 테스트 서버를 사용하세요. SSL 오류를 무시하거나 전체 HTTP 허용으로 변경하지 않습니다.

## iPhone 빌드

1. Mac의 Xcode에서 `mobile/ios/FamilyTree.xcodeproj`를 엽니다.
2. `FamilyTreeApp.swift`의 `site`를 실제 HTTPS 배포 주소로 지정합니다.
3. Signing & Capabilities에서 사용자 Apple 계정과 Team, 고유 Bundle Identifier를 지정합니다.
4. iOS 16 이상 시뮬레이터 및 실제 기기에서 실행합니다. 출시용 아이콘·서명 설정을 완성한 뒤 Archive합니다.

## 기기에서 확인할 항목

- 로그인 → 앱 종료 → 재실행 시 세션 유지, 로그아웃 시 수정 차단.
- 회원가입·승인·비밀번호 변경 및 계정 관리 확인창.
- 가계도 확대·스크롤·노드 선택, 상세에서 관계 인물 이동.
- PNG/PDF: Android 다운로드 폴더 저장, iPhone 공유 시트 저장.
- 네트워크 끊김 → 안내 → 재연결, 외부 링크는 별도 브라우저에서 열기.

패키지 서명과 스토어 등록은 사용자 계정 및 준비가 필요한 별도 배포 작업입니다.
