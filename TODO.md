# BRIDGE Notes - TODO List

## 🔴 High Priority

### 1. 클로드 대화 내 코드 블록 및 특수 영역 캡처 누락
**Status**: 🔴 Pending

**문제**:
- Claude.ai 대화에서 범위 선택 시 **코드 블록, 표, 리스트 등 특수 포맷 영역이 누락**됨
- 일반 텍스트만 캡처되고, `<div>`로 감싸진 특별한 영역(코드, 표 등)은 건너뜀
- 예시:
  ```
  [AI 응답 - 일반 텍스트] ✅ 캡처됨
  [AI 응답 - 코드 블록]   ❌ 누락
  [AI 응답 - 계속 텍스트] ✅ 캡처됨
  ```

**원인**:
- Claude는 코드 블록(`<pre><code>`), 표(`<table>`), 리스트(`<ul>`) 등을 별도 `<div>`로 렌더링
- 현재 Range API 기반 `extractTextFromRanges()`가 이런 중첩 구조를 건너뜀
- `cloneContents()`가 형제 요소 간 모든 내용을 포함하지 못함

**관련 파일**:
- `bridge_notes_extension/content.js:529-630` - `extractTextFromRanges()` 메서드

**해결 방안 (우선순위 순)**:

1. **TreeWalker API 사용** (권장):
   - 시작~끝 Range 사이의 모든 노드를 TreeWalker로 순회
   - 코드 블록, 표, 리스트 등 모든 요소 포함
   - 텍스트 노드와 요소 노드를 모두 수집

2. **수동 DOM Traversal**:
   - 시작 container부터 끝 container까지 모든 노드 순회
   - 특수 요소(`<pre>`, `<code>`, `<table>`, `<ul>`, `<ol>`) 별도 처리
   - `textContent` 또는 `innerText` 수집

3. **메시지 단위 수집** (대안):
   - Range 방식 대신 메시지 컨테이너 직접 탐색
   - 시작~끝 메시지 사이의 모든 메시지 수집
   - 각 메시지의 전체 HTML 내용 추출

**테스트 시나리오**:
- [ ] 일반 텍스트만 있는 대화
- [ ] 코드 블록 포함 대화 (JavaScript, Python 등)
- [ ] 표(table) 포함 대화
- [ ] 리스트(ul/ol) 포함 대화
- [ ] 위 모든 요소 혼합된 긴 대화

**우선순위**: 🔴 High (핵심 기능 버그, 사용자 데이터 손실)

---

### 2. 전문화 스크립트 `** n/6 **` 수정 및 언어화 프롬프팅
**Status**: 🔴 Pending

**문제**:
- ChatGPT 전문화(formal tone) 프롬프트에서 `** n/6 **` 같은 마크다운 문법이 결과에 그대로 노출됨
- 언어별 프롬프팅 필요 (한국어/영어)

**수정 필요 위치**:
- n8n Workflow - Step 4 (ChatGPT Tone Adjustment)
- Formal tone 프롬프트

**현재 프롬프트 문제점**:
```
당신은 전문적인 글쓰기 전문가입니다.

**제공된 노트를 전문적인 어조로 재작성해주세요.**

요구사항:
** 1/6 ** 정중하고 격식 있는 표현 사용
** 2/6 ** 명확하고 간결한 문장 구조
...
```

**수정 방향**:
1. `** n/6 **` 마크다운 제거 → 일반 번호 리스트 (1., 2., 3., ...)
2. 언어 감지 로직 추가 (한국어/영어 자동 판별)
3. 언어별 프롬프트 분리
4. 프롬프트 테스트 및 검증

**우선순위**: High (사용자 경험 저해)

---

## 🟡 Medium Priority

### 3. 오리지널텍스트 영역에서 AI/사용자 대화 구분 및 줄바꿈
**Status**: 🟡 Pending

**목표**:
- 원본 텍스트 표시 시 AI와 사용자 대화를 시각적으로 구분
- 각 대화마다 줄바꿈 추가하여 가독성 향상

**구현 방안**:
1. `extractTextFromRanges()`에서 메시지별 메타데이터 수집
2. AI/사용자 구분 로직 추가 (플랫폼별 selector)
3. ResultArea.js에서 표시 시 구분선 또는 스타일 적용
4. CSS로 AI/사용자 메시지 다른 스타일 적용

**관련 파일**:
- `bridge_notes_extension/content.js`
- `bridge_notes_extension/scripts/components/ResultArea.js`
- `bridge_notes_extension/styles/components/result-area.css`

**우선순위**: Medium (UX 개선)

---

### 4. 영어모드 지원 (UI 번역 + 언어 전환)
**Status**: 🟡 Pending

**목표**:
- 확장프로그램 UI를 영어로 번역
- 설정에서 한국어/영어 전환 가능

**구현 내용**:
1. i18n 구조 설계 (Chrome Extension i18n API 활용)
2. 모든 UI 텍스트 번역 파일 생성
   - `_locales/ko/messages.json`
   - `_locales/en/messages.json`
3. JavaScript에서 `chrome.i18n.getMessage()` 사용
4. HTML에서 `__MSG_message_name__` 사용
5. 설정 페이지에 언어 선택 드롭다운 추가

**관련 파일**:
- `bridge_notes_extension/manifest.json` - default_locale 설정
- `bridge_notes_extension/_locales/` - 번역 파일
- `bridge_notes_extension/sidepanel.html` - UI 텍스트
- `bridge_notes_extension/scripts/components/Settings.js` - 언어 설정

**우선순위**: Medium (글로벌 사용자 지원)

---

### 5. 전체 캡처 기능 재구현
**Status**: 🟡 Deferred (KNOWN_ISSUES.md #3 참조)

**문제**:
- Floating 버튼 방식의 전체 캡처 기능 미작동
- 플랫폼별 메시지 탐지 불완전

**재구현 방향**:
1. 플랫폼별 DOM 구조 정밀 분석
2. Range API 대신 메시지 순회 방식으로 텍스트 추출
3. 각 플랫폼별 실제 테스트 케이스 작성
4. 안정적인 방식 확인 후 UI 복원

**우선순위**: Medium (대체 수단 존재: 범위 선택)

---

### 6. 키보드 스크롤 기능 구현
**Status**: 🟡 Deferred (KNOWN_ISSUES.md #1 참조)

**문제**:
- 범위 선택 모드에서 Cmd/Ctrl + 화살표 키 스크롤 미작동
- Content script 키보드 이벤트 캡처 제한

**재구현 방향**:
1. 대안 단축키 시도 (Alt+↑/↓, Shift+↑/↓)
2. Inject Script 방식으로 페이지 컨텍스트 접근
3. UI 버튼 추가 (위로/아래로 스크롤 버튼)
4. chrome.commands API 활용

**우선순위**: Low (마우스 스크롤로 대체 가능)

---

## 🟢 Low Priority

### 7. 구글 로그인 구현
**Status**: 🟢 Future Feature

**목표**:
- Google OAuth 2.0 인증 구현
- 사용자 계정 관리
- 플랜별 사용량 추적

**구현 필요 사항**:
1. **Backend API 필요**:
   - OAuth 토큰 검증 서버
   - 사용자 정보 저장 DB
   - 플랜 관리 시스템
   - 사용량 카운팅 API

2. **Frontend 구현**:
   - Google Sign-In 버튼
   - 로그인 상태 관리
   - 토큰 저장 및 갱신
   - 로그아웃 처리

3. **보안**:
   - HTTPS 필수
   - CORS 설정
   - 토큰 암호화 저장

**우선순위**: Low (백엔드 인프라 구축 필요)

---

## 📋 Backlog

### CSS 모듈화 개선
- 다크모드 아이콘 배경 이슈 확인 및 해결 (KNOWN_ISSUES.md #2)
- 컴포넌트별 스타일 최적화

### 성능 최적화
- 대용량 대화 내용 캡처 시 성능 개선
- 메모리 사용량 최적화

### 접근성 개선
- 키보드 네비게이션 지원
- 스크린 리더 호환성
- ARIA 레이블 추가

### 문서 개선
- README.md 업데이트 ✅ (2025-12-12 완료)
- CHANGELOG.md 생성 ✅ (2025-12-12 완료)
- n8n 워크플로우 설정 가이드 작성
- 로컬 개발 환경 설정 가이드 작성
- 프롬프트 관리 가이드 작성

### 모니터링 및 분석
- 에러 로깅 시스템 구축
- n8n 워크플로우 실패 알림
- API 응답 시간 추적
- 캐시 히트율 모니터링
- 사용자 사용 패턴 분석

### 테스트 자동화
- E2E 테스트 스크립트 작성
- CI/CD 파이프라인 구축
- 자동화된 회귀 테스트

---

## 📝 완료된 작업

### ✅ CSS 모듈화
- 2621줄 단일 파일 → 13개 모듈 파일로 분리
- base.css + 10개 컴포넌트 + dark-mode.css
- 유지보수성 및 가독성 향상

### ✅ Floating 전체 캡처 버튼 (비활성화)
- 범위 선택 모드에서만 표시되도록 구현
- 클릭 이벤트 처리 개선
- 미작동 이슈로 임시 비활성화 (재구현 대기)

### ✅ 히스토리 기능
- 처리된 노트 자동 저장 (최대 50개, LRU)
- 히스토리 탭에서 과거 노트 목록 확인
- 클릭 시 결과 탭 자동 전환
- 개별/전체 삭제 기능

### ✅ 캐싱 시스템
- Chrome Storage 기반 LRU 캐시
- SHA-256 해시 기반 캐시 키
- 7일 만료, 최대 10개 항목
- 캐시 히트 시 즉시 결과 표시

### ✅ Regenerate 최적화
- Step 3 (Claude draft) 결과 캐싱
- 75% 비용 절감, 90% 시간 단축
- 어조 변경 전용 액션으로 빠른 재생성

---

## 🎯 다음 작업 우선순위

1. **클로드 <div> 미포함 문제 해결** - 핵심 기능 버그 수정
2. **전문화 스크립트 수정** - 사용자 경험 개선
3. **AI/사용자 대화 구분** - 가독성 향상
4. **영어모드 지원** - 글로벌 확장

---

## 📌 Notes

- KNOWN_ISSUES.md: 미해결 이슈 상세 문서
- [PHASE2_PLAN.md](../docs/technical/PHASE2_PLAN.md): Phase 2 기능 계획
- [CSS_ARCHITECTURE.md](../docs/archive/CSS_ARCHITECTURE.md): CSS 구조 문서

**최종 업데이트**: 2025-12-12
**현재 버전**: v1.2.0
