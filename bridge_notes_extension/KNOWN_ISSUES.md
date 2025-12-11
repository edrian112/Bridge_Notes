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

## 🟢 Resolved Issues

_(해결된 이슈는 여기에 기록)_

---

## 📝 Issue 보고

새로운 이슈 발견 시:
1. 이 파일에 추가
2. Status 설정: 🔴 Active / 🟡 In Progress / 🟢 Resolved
3. 재현 방법, 예상 원인, 해결 방안 작성

