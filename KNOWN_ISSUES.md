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

### 3. 클로드 대화 내 코드 블록 및 특수 영역 캡처 누락
**Status**: 🔴 Known Issue - 핵심 버그 (우선 수정 필요)

**증상**:
- Claude.ai 대화에서 범위 선택 시 **코드 블록, 표, 리스트 등 특수 포맷 영역이 누락**됨
- 일반 텍스트만 캡처되고, `<div>`로 감싸진 특별한 영역은 건너뜀
- 예시:
  ```
  [사용자 질문] ✅ 캡처됨
  [AI 응답 - 일반 텍스트] ✅ 캡처됨
  [AI 응답 - 코드 블록] ❌ 누락
  [AI 응답 - 계속되는 일반 텍스트] ✅ 캡처됨
  ```

**구체적 문제**:
- Claude.ai는 코드 블록, 표, 리스트 등을 별도의 `<div>` 컨테이너로 렌더링
- 현재 Range API 기반 `extractTextFromRanges()` 메서드가 이런 중첩된 구조를 건너뜀
- `cloneContents()` 또는 `toString()`이 형제 요소 간 모든 내용을 포함하지 못함

**원인 분석**:
1. **Range API의 제한**:
   - 시작 Range와 끝 Range 사이의 모든 형제 요소를 자동으로 포함하지 않음
   - 특정 노드 타입(특히 별도 `<div>` 블록)을 건너뛰는 경향

2. **Claude DOM 구조**:
   ```html
   <div class="message">
     <p>일반 텍스트</p>           ← 캡처됨
     <div class="code-block">     ← 누락됨 (별도 div)
       <pre><code>...</code></pre>
     </div>
     <p>계속되는 텍스트</p>        ← 캡처됨
   </div>
   ```

3. **시도했던 해결 방법들**:
   - ✅ `cloneContents()` 사용 → 코드 블록 누락
   - ✅ 공통 조상 찾기 + 자식 수집 → 불완전한 결과
   - ✅ 형제 순회 (`nextElementSibling`) → 일부 개선, 여전히 누락
   - ❌ 모든 방법 실패

**해결 방안 (우선순위 순)**:

1. **TreeWalker API 사용** (권장):
   ```javascript
   // 시작~끝 사이의 모든 노드를 순회
   const walker = document.createTreeWalker(
     commonAncestor,
     NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT,
     {
       acceptNode: (node) => {
         // 시작~끝 Range 사이에 있는 노드만 수집
         return NodeFilter.FILTER_ACCEPT;
       }
     }
   );
   ```

2. **수동 DOM Traversal**:
   - 시작 Range의 container부터 끝 Range의 container까지 모든 노드 순회
   - 각 노드의 `textContent` 또는 `innerText` 수집
   - 코드 블록(`<pre>`, `<code>`), 표(`<table>`), 리스트(`<ul>`, `<ol>`) 특별 처리

3. **메시지 단위 수집** (대안):
   - Range 방식 포기하고 메시지 컨테이너 직접 탐색
   - 시작 메시지 찾기 → 끝 메시지 찾기 → 중간 모든 메시지 수집
   - 각 메시지의 전체 내용(코드 포함) 추출

4. **플랫폼별 커스텀 추출 로직**:
   - Claude: 코드 블록 selector `.language-*`, 표 selector `table`
   - ChatGPT: 코드 블록 selector `.bg-black`
   - 각 플랫폼의 특수 요소를 명시적으로 수집

**테스트 시나리오**:
- [ ] 일반 텍스트만 있는 대화
- [ ] 코드 블록 포함 대화
- [ ] 표(table) 포함 대화
- [ ] 리스트(ul/ol) 포함 대화
- [ ] 위 모든 요소 혼합된 대화

**우선순위**: 🔴 High (핵심 기능 버그, 사용자 데이터 손실)

---

## 🟢 Resolved Issues

_(해결된 이슈는 여기에 기록)_

---

## 📝 Issue 보고

새로운 이슈 발견 시:
1. 이 파일에 추가
2. Status 설정: 🔴 Active / 🟡 In Progress / 🟢 Resolved
3. 재현 방법, 예상 원인, 해결 방안 작성

