# BRIDGE Notes - Known Issues

## 🔴 Active Issues

### 1. 키보드 스크롤 기능 미작동 (범위 선택 모드)
**Status**: 🔴 Known Issue - 차후 업데이트 예정

**증상**:
- 범위 선택 모드에서 `Cmd+↑/↓` (Mac) 또는 `Ctrl+↑/↓` (Windows/Linux) 키보드 스크롤이 작동하지 않음
- ESC 키 취소는 정상 작동

**시도한 해결 방법**:
1. ✅ `window.addEventListener("keydown", ..., true)` - 실패
2. ✅ `document.addEventListener("keydown", ..., true)` 추가 - 실패
3. ✅ `document.body.setAttribute("tabindex", "-1")` + `body.focus()` - 실패

**원인 추정**:
- Content script 컨텍스트에서 웹페이지의 키보드 이벤트 캡처 제한
- 브라우저 기본 키보드 단축키(Cmd+↑/↓)와 충돌 가능성
- AI 채팅 사이트(Claude.ai, ChatGPT 등)의 자체 키보드 이벤트 핸들러와 충돌

**차후 해결 방안**:
1. **대안 단축키 사용**: `Alt+↑/↓` 또는 `Shift+↑/↓` 시도
2. **Inject Script 방식**: Content script 대신 페이지 컨텍스트에 직접 스크립트 주입
3. **UI 버튼 추가**: 키보드 대신 "위로 스크롤" / "아래로 스크롤" 버튼 추가
4. **브라우저 API 활용**: Chrome Extension API의 `chrome.commands` 사용

**우선순위**: Low (대체 수단 존재: 마우스 스크롤, 범위 재선택)

---

### 2. 다크모드 어조 아이콘 배경 (확인 필요)
**Status**: 🟡 수정 완료 - 사용자 확인 대기

**증상**:
- 다크모드에서 첫 화면 어조 선택 버튼(😊 개인화, 🎩 전문화)의 이모지 아이콘 배경이 투명하지 않아 보임

**적용된 수정**:
- `empty-state.css:70` - `.empty-tone-btn .tone-icon { background: transparent; }`
- `dark-mode.css:133` - `body.dark-mode .tone-icon { background: transparent; }`

**확인 방법**:
1. 브라우저 하드 리프레시: `Cmd+Shift+R` (Mac) / `Ctrl+Shift+R` (Windows)
2. 확장프로그램 완전 재로드: `chrome://extensions/` → 새로고침 버튼
3. 확장프로그램 껐다 켜기

**우선순위**: Medium (시각적 이슈, 기능에는 영향 없음)

---

### 3. Lucide Icons 로딩 실패 (Chrome Extension MV3)
**Status**: 🔴 Known Issue - 우회 완료 (Emoji 사용)

**증상**:
- Lucide Icons CDN 및 로컬 파일 모두 Chrome Extension에서 로딩 실패
- `typeof lucide` → `'undefined'`
- 아이콘이 전혀 표시되지 않음

**시도한 해결 방법**:
1. ✅ CDN 스크립트 로딩 → CSP 차단
2. ✅ 로컬 파일 다운로드 + `<script src="scripts/lucide.min.js">` → 로딩 실패
3. ✅ 별도 `lucide-init.js` 파일 생성 + DOMContentLoaded → 여전히 undefined
4. ✅ ES6 module import 시도 → 호환성 문제
5. ❌ 모든 방법 실패

**원인**:
- Manifest V3의 엄격한 CSP (Content Security Policy)
- Chrome Extension 환경에서 UMD 번들 로딩 제한
- Service Worker 컨텍스트와 Side Panel 컨텍스트 간 스크립트 공유 문제

**우회 방법** (현재 적용):
- Emoji 아이콘 사용 (📋, 💎, 😊, 🎩, 📭, 📄, 🔄, 🗑️, ⚙️ 등)
- 벡터 아이콘만큼 깔끔하지는 않지만 모든 환경에서 정상 작동

**Git 이력**:
- 커밋 `85d035e`: Lucide 마이그레이션 시도 전 마지막 안정 버전
- Rollback 완료: Emoji 아이콘으로 복구

**우선순위**: Medium (우회 완료, 기능에는 영향 없음)

---

### 5. 백엔드 서버 부재 (Mock 시스템 운영 중)
**Status**: 🟡 알려진 제약사항 - 런칭 전 필수 구현

**현재 상황**:
- Google OAuth 로그인: ✅ 작동 (Chrome Identity API)
- 플랜 선택/표시: ✅ 작동 (Chrome Storage 기반)
- 플랜 동기화: ✅ 작동 (Settings/Pricing/시작세션 모두 동기화)
- 실제 결제: ❌ 미구현 (버튼만 있음)
- 사용량 차감: ❌ 미구현 (메서드는 있으나 호출 안 됨)
- 데이터 영속성: ❌ 로컬만 (확장 삭제 시 소실)

**제약사항**:
1. **보안 취약**: 사용자가 개발자 도구로 Chrome Storage 수정 가능
2. **데이터 소실**: 확장프로그램 삭제/재설치 시 플랜 정보 손실
3. **멀티 디바이스 미지원**: 다른 기기에서 로그인해도 플랜 정보 없음
4. **결제 검증 불가**: 실제 결제 없이 플랜 "구매" 가능

**Mock 시스템 파일**:
- `scripts/components/Pricing.js`: 플랜 선택 UI + Chrome Storage 저장
- `scripts/components/Settings.js`: Google 로그인 + 플랜 표시
- `scripts/sidepanel.js`: 시작 세션 사용량 표시

**런칭 전 필수 구현**:
- 백엔드 API 서버 (사용자 DB, 플랜 관리, 사용량 추적)
- 결제 게이트웨이 연동 (토스페이먼츠/카카오페이)
- n8n Webhook과 백엔드 연동 (사용량 차감)

**우선순위**: 🔴 Critical (런칭 필수 조건)

---

## 🟢 Resolved Issues

### ✅ 클로드 대화 내 코드 블록 및 특수 영역 캡처 누락
**Status**: 🟢 Resolved - 2025-12-13

**해결 방법**:
- TreeWalker API를 사용하여 `extractTextFromRange()` 메서드 전면 재구현
- 코드 블록, 테이블, 리스트, 인용문을 마크다운 형식으로 캡처

**구현 내용**:
1. `extractTextFromRange()` - TreeWalker 기반 노드 순회
2. `extractFormattedContent()` - 특수 요소 감지 및 라우팅
3. `extractCodeBlock()` - 코드 블록 → 마크다운 코드 펜스 (언어 감지 포함)
4. `extractTable()` - HTML 테이블 → 마크다운 테이블 형식
5. `extractList()` - 중첩 리스트 지원 (UL/OL 모두)
6. `extractBlockquote()` - 인용문 → `>` 프리픽스 형식

**커밋**: `32b0880` - Fix: Implement TreeWalker API for code block/table/list capture

---

## 📝 Issue 보고

새로운 이슈 발견 시:
1. 이 파일에 추가
2. Status 설정: 🔴 Active / 🟡 In Progress / 🟢 Resolved
3. 재현 방법, 예상 원인, 해결 방안 작성

