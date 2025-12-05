# Bridge Notes 프로젝트

**Version:** v1.0.0
**Last Updated:** 2024년 12월 6일

## 📋 목차

1. [프로젝트 개요](#프로젝트-개요)
2. [핵심 기능](#핵심-기능)
3. [기술 스펙](#기술-스펙)
4. [개발 순서 및 진행 상황](#개발-순서-및-진행-상황)
5. [Phase 1 완료 내역](#phase-1-완료-내역)
6. [Phase 1.5: 베타 테스트 및 검증](#phase-15-베타-테스트-및-검증)
7. [Phase 2 구현 계획](#phase-2-구현-계획)
8. [에러 처리 전략](#에러-처리-전략)
9. [향후 개선 계획](#향후-개선-계획)
10. [개발 환경 설정](#개발-환경-설정)

---

## 프로젝트 개요

**Bridge Notes**는 AI와의 대화에서 얻은 통찰을 두 번의 클릭만으로 캡처하고, AI가 게시글 초안을 생성해주는 Chrome 확장 프로그램입니다.

**핵심 철학:** AI가 모든 걸 자동으로 하는 게 아니라, **초안만 만들어주고 사용자가 검토/편집/최종 결정**합니다.

### 한 문장 정의

"AI 대화를 두 클릭으로 깔끔하게 캡처하는 도구"

**v1 MVP 정의:**

"AI 대화에서 나온 문장을 두 번 클릭으로 캡처해서, 즉시 재사용 가능한 문장(트윗/노트)으로 바꿔주는 도구"

**v1 철학:**

"AI가 자동으로 모든 걸 해주는 게 아니라, **자동 게시 직전 단계까지만** 책임진다. 사용자가 검토하고 편집할 수 있는 여지를 남기는 것이 핵심."

---

## 핵심 기능

- **두 클릭 범위 선택**: 메시지 div 단위로 자동 선택 ✅
- **자동 텍스트 추출**: 대화 형식 유지, 중복 제거, 불필요한 요소 필터링 ✅
- **AI 초안 생성**: 통찰/지식 추출 (Phase 2) - AI가 초안만 제공, 사용자가 편집
- **톤 조정**: 친근한 어투 / 정중한 어투 선택 (Phase 2) - 사용자 검토 후 적용
- **클립보드 복사**: 사용자가 검토/편집 완료 후 복사 (v1 MVP)
  - **복사 대상 선택**: "AI와의 대화" (원본) 또는 "AI 정리 결과" (최종본) 선택 가능 ✅
- **자동 게시**: 선택 기능 (Phase 3, v2) - 원하는 사용자만 활성화

**v1 MVP 범위: 캡처 → AI 초안 → 사용자 편집 → 복사**

---

## 기술 스펙

### 아키텍처 개요

```
┌─────────────────────────────────────┐
│         사용자의 브라우저              │
│                                     │
│  [Claude.ai / ChatGPT 대화]         │
│         ↓                           │
│  [Content Script - 텍스트 캡처]      │
│         ↓                           │
│  [Side Panel - 결과 표시/편집]       │
│         ↓                           │
└─────────────────────────────────────┘
         ↓ (HTTPS)
┌─────────────────────────────────────┐
│         n8n 워크플로우                │
│         (클라우드)                    │
│                                     │
│  1. Webhook으로 데이터 받기           │
│  2. Claude API 호출 (대화 정리)       │
│  3. ChatGPT API 호출 (어투 조정)      │
│  4. Twitter/Notion API 호출 (게시)   │
│                                     │
└─────────────────────────────────────┘
```

### 프론트엔드: Chrome Extension (Manifest V3)

#### 파일 구조

```
bridge_notes_front/
├── manifest.json                 # Manifest V3 설정
├── background.js                 # Service Worker (이벤트 중계)
├── content.js                    # Content Script (텍스트 캡처)
├── sidepanel.html                # Side Panel UI
├── scripts/
│   ├── sidepanel.js              # Side Panel 메인 로직
│   └── components/
│       ├── ToastMessage.js       # 토스트 알림 (4 types)
│       ├── ResultArea.js         # 결과 영역 (textarea + 복사)
│       ├── History.js            # 캡처 히스토리 (최근 10개)
│       ├── Settings.js           # 설정 (API 선택, 다크모드 등)
│       ├── Pricing.js            # 가격 정보
│       ├── TabNavigation.js      # 탭 네비게이션
│       └── ErrorHandler.js       # 에러 핸들링
├── styles/
│   ├── sidepanel.css             # Side Panel 스타일
│   └── styles.css                # Content Script 오버레이 스타일
└── icons/
    ├── icon16.png
    ├── icon48.png
    └── icon128.png
```

#### 핵심 기술 스택

**1. Side Panel API (Chrome 114+)**

```javascript
// manifest.json
{
  "side_panel": {
    "default_path": "sidepanel.html"
  },
  "permissions": ["sidePanel", "activeTab", "tabs", "storage", "clipboardWrite"]
}
```

**2. 두 클릭 범위 선택 모드**

- 시작 메시지 클릭 → 끝 메시지 클릭
- 메시지 div 전체 자동 선택
- 중간의 모든 메시지 포함
- 오버레이로 시각적 피드백

**3. 컴포넌트 기반 아키텍처**

```javascript
// scripts/sidepanel.js
class BridgeNotesSidePanel {
  constructor() {
    this.toast = new ToastMessage();
    this.resultArea = new ResultArea();
    this.history = new History();
    this.settings = new Settings();
    this.pricing = new Pricing();
    this.tabNav = new TabNavigation();
  }
}
```

**4. 탭 전환 대응 시스템**

```javascript
// 3-state system
// "ready": Content script 준비됨
// "not-ready": 페이지 새로고침 필요
// "unsupported": 지원하지 않는 사이트

// Ping check로 content script 상태 확인
await this.checkContentScriptReady(tabId);
```

**5. 중복 제거 알고리즘**

```javascript
// content.js
extractTextFromRange(range) {
  // 1. 숨겨진 요소 제거 (aria-hidden, display:none 등)
  this.removeHiddenElements(tempDiv);

  // 2. 텍스트 추출
  let text = tempDiv.innerText || tempDiv.textContent;

  // 3. 중복 라인 제거
  text = this.cleanDuplicateLines(text);

  return text;
}
```

**6. Chrome Storage API 활용**

```javascript
// 히스토리 저장
await chrome.storage.local.set({ history: items });

// 설정 저장
await chrome.storage.sync.set({ settings: data });
```

### 백엔드: n8n 워크플로우 (Phase 2)

#### 워크플로우 구조

```
[Webhook Trigger]
    ↓
    받은 데이터:
    - text: 캡처된 대화
    - action: "summarize" | "tone-adjust"
    - tone: "friendly" | "formal" (tone-adjust 시)
    ↓
[조건 분기 - Action]
    ├─ "summarize" → Claude API (대화 정리)
    └─ "tone-adjust" → ChatGPT API (어투 조정)
    ↓
[Response]
    정리된 결과 반환
```

#### 프롬프트 전략

**대화 정리 (Claude API):**

```
다음은 AI와 나눈 대화입니다.
이 대화에서 얻은 핵심 통찰이나 지식을 게시글 초안으로 정리해주세요.

게시글 초안은:
- 핵심 아이디어를 명확하게 전달
- 불필요한 대화 맥락 제거
- 읽기 쉬운 구조로 재구성
- 280자 기준 3-5개 스레드 형태

대화 내용:
{{$json.text}}
```

**어투 조정 (ChatGPT API):**

```
다음 게시글 초안을 {{$json.tone}} 어투로 다듬어주세요.

- friendly: 친근하고 일상적인 말투 ("~해요", "~이에요")
- formal: 정중하고 격식있는 말투 ("~합니다", "~입니다")

게시글 초안:
{{$json.text}}
```

#### API 설정 (Phase 2)

**사용자가 설정에서 선택 가능:**

- **Claude API**: 대화 정리 (기본값)
- **ChatGPT API**: 어투 조정 (기본값)
- **Perplexity API**: 선택 옵션
- **Gemini API**: 선택 옵션

---

## 개발 순서 및 진행 상황

### Phase 1: 캡처 기능 완성 ⭐ [95% 완료]

**목표:** 두 클릭으로 AI 대화 완벽 캡처

**완료된 세부 기능:**

- ✅ Chrome Extension 기본 구조 (Manifest V3)
- ✅ Side Panel UI 구현
- ✅ Content Script 주입 (Claude.ai, ChatGPT, Perplexity, Gemini)
- ✅ 두 클릭 범위 선택 모드 (메시지 div 단위)
- ✅ 텍스트 추출 및 중복 제거
- ✅ 클립보드 복사 기능
- ✅ 히스토리 관리 (최근 10개)
- ✅ 설정 시스템 (다크모드, 가격 정보 등)
- ✅ 탭 전환 대응 시스템 (3-state + ping check)
- ✅ 토스트 알림 시스템 (success/error/warning/info)
- ✅ 에러 핸들링
- ✅ 컴포넌트 기반 아키텍처

**미완료 (5%):**

- ⚠️ 긴 대화 lazy loading 완벽 대응 (2%)
- ⚠️ 개인정보 자동 감지 (3%) - Phase 2에서 구현 예정

**예상 소요 시간:** ~~1-2일~~ → **실제: 5일** (완료)

---

### Phase 2: API 연동 및 자동 정리 [다음 단계]

**목표:** 캡처한 텍스트를 자동으로 정리하고 어투 조정

**1주차: n8n 워크플로우 구축 (3일)**

1. n8n.cloud 계정 생성 및 초기 설정
2. Webhook 엔드포인트 생성
3. Claude API 연동 (대화 정리 프롬프트)
4. ChatGPT API 연동 (어투 조정 프롬프트)
5. 워크플로우 테스트 및 최적화

**2주차: 확장 프로그램 업데이트 (2일)**

1. 캡처 완료 시 자동으로 n8n Webhook 호출 (백그라운드 처리)
2. 정리된 결과를 기존 textarea에 자동 반영
3. 로딩 상태 표시 (기존 UI 활용)
4. Settings에 API 선택 옵션 추가
5. 개인정보 감지 기능 추가 (AI 기반)

**예상 시간:** 5일

---

### Phase 3: 자동 게시 구현 [v2 선택 기능]

**목표:** 정리된 결과를 자동으로 소셜 미디어에 게시 (원하는 사용자만)

**⚠️ 중요: 이것은 선택 기능입니다**

- v1 MVP에서는 구현하지 않음
- 사용자가 원하면 활성화, 원하지 않으면 비활성화
- 복사 버튼만으로도 충분한 사용자가 많을 것

**세부 단계:**

1. Twitter API 연동 (OAuth 2.0)
2. Notion API 연동
3. n8n 워크플로우 확장
4. 플랫폼 선택 UI
5. 게시 성공/실패 처리
6. **설정에서 "자동 게시 사용" 토글 추가** (기본값: OFF)

**우선순위:** 낮음 (v1 MVP 성공 및 사용자 피드백 후 판단)

**예상 시간:** 3-5일

---

### Phase 4: 배포 및 테스트

**목표:** Chrome Web Store 공개

**세부 단계:**

1. **코드 정리 (1일)**
   - 불필요한 코드 제거
   - 주석 추가
   - 성능 최적화

2. **스토어 준비물 (1일)**
   - 아이콘 최종 디자인 (16x16, 48x48, 128x128)
   - 스크린샷 4개 제작
   - 프로모션 이미지
   - 설명 작성 (영문/한글)

3. **배포 (3일)**
   - Google Developer 계정 ($5)
   - Chrome Web Store 업로드
   - 심사 제출 및 대기 (1-3일)

**예상 시간:** 2일 작업 + 3일 심사

---

## Phase 1 완료 내역

### 주요 성과

#### 1. Side Panel 기반 UI 구현 ✅

- Chrome 114+ Side Panel API 활용
- 브라우저 오른쪽에 슬라이드 인 방식
- 팝업보다 안정적이고 넓은 작업 공간

#### 2. 두 클릭 범위 선택 구현 (Dual Selection Mode) ✅

**텍스트 정밀 선택 + div 전체 선택 지원**

- `content.js:115-209` - handleClick() 메서드 (async, Shift key 감지)
- `content.js:244-262` - createRangeFromElement() 메서드 (div 전체 선택)
- `content.js:265-327` - findLastTextNode() 메서드
- `content.js:329-339` - getShiftClickModeSetting() 메서드
- `content.js:341-371` - createTextRangeFromPoint() 메서드 (텍스트 정밀 선택)

**선택 모드 로직:**

1. **일반 클릭 (Auto-detect)**

   - 텍스트 노드 클릭 → 텍스트 정밀 선택 (caretRangeFromPoint 성공)
   - 여백/margin 클릭 → div 전체 선택 (caretRangeFromPoint 실패)

2. **Shift+클릭 (설정값에 따라)**
   - 설정값 'text': 텍스트 정밀 선택 (fallback: div 전체)
   - 설정값 'div': div 전체 선택 (기본값)

**고급 설정:**

- `scripts/components/Settings.js:43, 143, 226` - shiftClickMode 설정 관리
- `sidepanel.html:325-336` - Shift+클릭 동작 선택자 (고급 설정 내부)
- 기본값: 'div' (div 전체 선택)

#### 3. 중복 제거 시스템 ✅

- `content.js:351-457`
- `removeHiddenElements()`: 숨겨진 요소 제거
- `cleanDuplicateLines()`: 중복 라인 제거
- TreeWalker 필터 강화

#### 4. 탭 전환 완벽 대응 ✅

**문제:** Side Panel이 chrome.tabs 이벤트를 직접 수신 못함

**해결:**

- `background.js`: 이벤트 중계 서버
- `scripts/sidepanel.js:261-303`: Ping check + 3-state 시스템
- "ready" / "not-ready" / "unsupported" 상태 관리
- `"tabs"` permission 추가 (중요!)

#### 5. 컴포넌트 기반 아키텍처 ✅

```
scripts/components/
├── ToastMessage.js      (1.5KB) - 4가지 알림 타입
├── ResultArea.js        (13KB)  - 캡처 UI 및 로직
├── History.js           (6.6KB) - 최근 10개 히스토리
├── Settings.js          (18KB)  - 설정 관리
├── Pricing.js           (10KB)  - 가격 정보
├── TabNavigation.js     (2.5KB) - 탭 전환
└── ErrorHandler.js      (8.6KB) - 에러 핸들링
```

### 핵심 코드 참조

**manifest.json:** [bridge_notes_front/manifest.json](bridge_notes_front/manifest.json)
**background.js:** [bridge_notes_front/background.js](bridge_notes_front/background.js)
**content.js:** [bridge_notes_front/content.js](bridge_notes_front/content.js)
**sidepanel.js:** [bridge_notes_front/scripts/sidepanel.js](bridge_notes_front/scripts/sidepanel.js)

### 테스트 시나리오 및 결과

**모두 통과 ✅**

1. ✅ 탭 전환 시 상태 유지
2. ✅ 새로고침 후 content script 감지
3. ✅ 두 클릭 범위 선택 모드 정상 작동 (div 단위)
4. ✅ 중복 텍스트 제거
5. ✅ 클립보드 복사
6. ✅ 히스토리 저장 및 불러오기
7. ✅ 다크모드 전환
8. ✅ 다중 윈도우 대응

---

## Phase 1.5: 베타 테스트 및 검증

**목표:** Phase 1 기능 실사용 검증 및 Phase 2 우선순위 결정

### 베타 테스터 모집

**대상:**
- AI 도구 활용 빈도가 높은 사용자 (5-10명)
- Claude.ai, ChatGPT를 주 3회 이상 사용하는 사람
- 피드백 제공에 적극적인 얼리어답터

**테스트 기간:** 1-2주

**테스트 방법:**
1. Chrome Web Store 비공개 링크 배포
2. 온보딩 가이드 제공
3. 일일 사용 로그 수집 (선택적)
4. 주간 설문 조사

### 측정 지표

**정량 지표:**
- 일평균 캡처 횟수
- 클립보드 복사 vs 텍스트 편집 비율
- Free 플랜 5회 제한 도달 시점
- 히스토리 사용 빈도
- 평균 세션 시간

**정성 지표:**
- 주요 불편 사항 (설문)
- 가장 유용한 기능 (설문)
- "지인에게 추천 의향" (NPS)
- Phase 2 기능 수요 조사:
  - AI 자동 정리 필요성
  - 어투 조정 필요성
  - 템플릿 선택 선호도

### Phase 2 진행 기준

**필수 조건 (Go/No-Go):**
- ✅ 베타 테스터 80% 이상 만족 (NPS 7점 이상)
- ✅ 치명적 버그 0건
- ✅ 일평균 캡처 1회 이상

**우선순위 결정:**
- AI 자동 정리 수요 70% 이상 → Phase 2 진행
- AI 자동 정리 수요 50% 미만 → Phase 2 연기, 과금 모델 먼저 테스트
- 어투 조정 수요 파악 → Phase 2 기능 범위 조정

### 예상 결과 활용

**시나리오 A: 높은 수요 (AI 정리 70%+)**
→ Phase 2 즉시 진행

**시나리오 B: 중간 수요 (AI 정리 40-70%)**
→ 간단한 템플릿 기능만 먼저 구현 (n8n 없이)

**시나리오 C: 낮은 수요 (AI 정리 40% 미만)**
→ 캡처 기능 개선에 집중 (키보드 단축키, 자동 복사 등)

### 과금 모델 검증

**Free 플랜 5회 제한 테스트:**
- 5회 도달 시점 측정
- "유료 전환 의향" 설문
- 적정 가격대 조사

**가격 민감도 분석:**
```
질문: "몇 회 사용까지 무료가 적당하다고 생각하시나요?"
- 3회 이하
- 5회 (현재)
- 10회
- 무제한 (광고 모델)

질문: "월 30회 사용 시 지불 의향 금액은?"
- 무료만 사용
- 3,000원
- 5,000원 (현재 Basic30)
- 7,000원 이상
```

**예상 결과:**
- Free 5회가 너무 적다면 → 10회로 상향 조정
- Basic30 수요가 낮다면 → Standard100만 유지
- 무료 선호가 압도적이라면 → 광고 모델 또는 freemium 재설계

---

## Phase 2 구현 계획

### 구현 전략

#### 1. 기존 UI 그대로 활용

- ResultArea의 textarea는 이미 편집 가능
- 복사 버튼 이미 존재
- 추가 버튼 불필요

#### 2. n8n Webhook 연동

**캡처 완료 시 자동으로 백그라운드에서 처리:**

```
사용자가 캡처 완료
    ↓
텍스트가 ResultArea textarea에 표시됨
    ↓
[백그라운드] 자동으로 n8n Webhook 호출
    ↓
Claude API로 대화 정리
    ↓
정리된 결과를 textarea에 자동 반영
    ↓
사용자는 textarea에서 자유롭게 편집 가능
    ↓
사용자가 복사 버튼 클릭 → 클립보드 복사
```

#### 3. n8n 워크플로우

**Request Body:**

```json
{
  "text": "캡처된 대화 내용",
  "action": "summarize" | "tone-adjust",
  "tone": "friendly" | "formal"
}
```

**Response:**

```json
{
  "success": true,
  "result": "정리된 텍스트"
}
```

### 예상 비용

- **n8n.cloud**: 무료 티어 (월 2,500 실행)
- **Claude API**: $0.003/1K tokens
- **ChatGPT API**: $0.002/1K tokens
- **예상**: 월 100회 사용 시 $1-2

---

## 에러 처리 전략

### 1. 네트워크 에러 처리

#### 1.1 n8n Webhook 연동 실패
**발생 시나리오:**
- 네트워크 연결 불안정
- n8n 서버 다운타임
- 요청 타임아웃 (30초 초과)

**처리 방안:**
```javascript
async function callWebhook(text, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
        signal: AbortSignal.timeout(30000) // 30초 타임아웃
      });

      if (response.ok) return await response.json();

      // 서버 에러(5xx)면 재시도
      if (response.status >= 500 && i < retries - 1) {
        await new Promise(r => setTimeout(r, 1000 * (i + 1))); // 지수 백오프
        continue;
      }

      throw new Error(`Webhook failed: ${response.status}`);
    } catch (error) {
      if (i === retries - 1) {
        // 최종 실패 시 로컬 처리 모드로 전환
        return { success: false, fallback: true };
      }
    }
  }
}
```

**사용자 피드백:**
- 1차 실패: "AI 정리 중... 잠시만 기다려주세요" (재시도 중)
- 2차 실패: "네트워크가 불안정합니다. 재시도 중... (2/3)" (진행 상황 표시)
- 최종 실패: "AI 서버 연결 실패. 원문은 정상적으로 저장되었습니다." (Fallback 안내)

#### 1.2 오프라인 모드
**처리 방안:**
- 캡처 기능은 계속 동작 (로컬에서 처리)
- AI 정리 기능 비활성화, 안내 메시지 표시
- 온라인 복구 시 자동으로 기능 재활성화

```javascript
window.addEventListener('online', () => {
  toast.success('네트워크가 복구되었습니다. AI 정리 기능을 다시 사용할 수 있습니다.');
});

window.addEventListener('offline', () => {
  toast.warning('오프라인 모드입니다. 캡처는 가능하지만 AI 정리는 온라인 상태에서만 사용할 수 있습니다.');
});
```

### 2. API Quota 초과

#### 2.1 사용 횟수 제한 도달
**발생 시나리오:**
- Free: 5회 초과
- Basic30: 30회 초과
- Standard100: 100회 초과

**처리 방안:**
```javascript
async function checkUsageLimit() {
  const { userPlan, usageCount } = await chrome.storage.local.get(['userPlan', 'usageCount']);

  const limits = {
    free: 5,
    basic30: 30,
    standard100: 100,
    max: Infinity
  };

  const limit = limits[userPlan || 'free'];

  if (usageCount >= limit) {
    return {
      allowed: false,
      message: `${userPlan.toUpperCase()} 플랜의 사용 제한(${limit}회)에 도달했습니다.`,
      action: 'upgrade'
    };
  }

  // 80% 사용 시 경고
  if (usageCount >= limit * 0.8) {
    toast.warning(`남은 사용 횟수: ${limit - usageCount}회. 곧 한도에 도달합니다.`);
  }

  return { allowed: true };
}
```

**사용자 피드백:**
- 80% 도달: "⚠️ 남은 사용 횟수: 1회. 곧 한도에 도달합니다."
- 100% 도달: "❌ Free 플랜의 사용 제한(5회)에 도달했습니다. 업그레이드하시겠습니까? [플랜 보기]"

#### 2.2 Claude API Rate Limit (Phase 2)
**처리 방안:**
- 429 에러 감지 시 지수 백오프 적용
- Queue 시스템으로 요청 순차 처리
- Rate limit 정보를 n8n에서 관리, 프론트엔드에 전달

```javascript
// n8n workflow에서 처리
if (error.status === 429) {
  const retryAfter = error.headers['retry-after'] || 60;
  return {
    success: false,
    error: 'rate_limit',
    retryAfter: retryAfter,
    message: `잠시 후 다시 시도해주세요. (${retryAfter}초 후)`
  };
}
```

### 3. Chrome Storage 에러

#### 3.1 Storage Quota 초과
**발생 시나리오:**
- 히스토리 데이터가 Chrome Storage 한도(5MB) 초과

**처리 방안:**
```javascript
chrome.storage.local.getBytesInUse(null, (bytes) => {
  const limitMB = 5;
  const usageMB = (bytes / 1024 / 1024).toFixed(2);

  if (usageMB > limitMB * 0.9) {
    // 90% 도달 시 자동 정리
    cleanOldestHistory(10); // 가장 오래된 10개 삭제
    toast.warning('저장 공간이 부족하여 오래된 히스토리를 자동 삭제했습니다.');
  }
});
```

#### 3.2 Storage 읽기/쓰기 실패
**처리 방안:**
```javascript
async function safeStorageSet(data) {
  try {
    await chrome.storage.local.set(data);
    return { success: true };
  } catch (error) {
    console.error('Storage write failed:', error);

    // 임시 메모리에 저장
    window.tempStorage = window.tempStorage || {};
    Object.assign(window.tempStorage, data);

    toast.error('데이터 저장 실패. 임시로 메모리에 보관 중입니다. 브라우저를 종료하지 마세요.');

    return { success: false, fallback: 'memory' };
  }
}
```

### 4. 서비스 Degradation 전략

#### 4.1 단계별 기능 저하
**Level 1: 정상 (모든 기능 사용 가능)**
- AI 정리 기능 정상 동작
- 히스토리 저장 정상
- 모든 템플릿 사용 가능

**Level 2: 부분 저하 (핵심 기능만 유지)**
- AI 정리 기능: 타임아웃 60초 → 30초로 단축
- 히스토리: 최대 5개로 제한
- 로딩 중 사용자에게 "서버 응답이 느립니다" 안내

**Level 3: 최소 기능 (로컬 전용)**
- AI 정리 기능 비활성화
- 캡처 및 복사 기능만 사용 가능
- "현재 AI 서버 점검 중입니다. 캡처 기능은 정상 사용 가능합니다" 안내

#### 4.2 자동 복구 (Self-Healing)
```javascript
let serviceLevel = 1; // 1: 정상, 2: 부분 저하, 3: 최소 기능

async function healthCheck() {
  try {
    const start = Date.now();
    const response = await fetch(webhookUrl + '/health', {
      method: 'GET',
      signal: AbortSignal.timeout(5000)
    });
    const latency = Date.now() - start;

    if (response.ok && latency < 3000) {
      serviceLevel = 1; // 정상
    } else if (latency < 10000) {
      serviceLevel = 2; // 부분 저하
    } else {
      serviceLevel = 3; // 최소 기능
    }
  } catch {
    serviceLevel = 3; // 연결 실패
  }
}

// 5분마다 헬스체크
setInterval(healthCheck, 5 * 60 * 1000);
```

### 5. 사용자 커뮤니케이션

#### 5.1 에러 메시지 원칙
1. **명확성**: 무엇이 잘못되었는지 명확히 전달
2. **행동 유도**: 사용자가 취할 수 있는 다음 행동 제시
3. **안심**: 데이터 손실 여부를 명확히 안내

**좋은 예시:**
```
❌ "AI 정리 실패. 원문은 정상적으로 저장되었습니다. [다시 시도] [원문 복사]"
✅ "네트워크 오류로 AI 정리에 실패했습니다. 캡처한 원문은 안전하게 저장되어 있으니 안심하세요."
```

**나쁜 예시:**
```
❌ "Error: Network request failed"
❌ "알 수 없는 오류가 발생했습니다"
```

#### 5.2 Toast 메시지 계층
```javascript
const toastPriority = {
  error: 5,    // 빨간색, 10초 표시, 사용자 액션 필요
  warning: 3,  // 노란색, 5초 표시, 주의 필요
  info: 2,     // 파란색, 3초 표시, 정보 전달
  success: 1   // 초록색, 2초 표시, 확인 메시지
};
```

### 6. 모니터링 및 로깅 (Phase 2)

#### 6.1 클라이언트 에러 로깅
```javascript
window.addEventListener('error', (event) => {
  const errorLog = {
    timestamp: Date.now(),
    message: event.message,
    stack: event.error?.stack,
    userAgent: navigator.userAgent,
    url: event.filename,
    line: event.lineno
  };

  // 로컬 저장 (최대 100개)
  chrome.storage.local.get(['errorLogs'], (result) => {
    const logs = result.errorLogs || [];
    logs.push(errorLog);
    if (logs.length > 100) logs.shift(); // 오래된 로그 삭제
    chrome.storage.local.set({ errorLogs: logs });
  });
});
```

#### 6.2 에러 리포팅 (선택적)
- 사용자 동의 하에 익명 에러 리포트 전송
- 설정에서 "에러 리포트 전송" 옵션 제공
- 개인정보 제외 (캡처 텍스트, 사용자 ID 등)

---

## 향후 개선 계획

### v1.1: 기능 개선

**1. 자동 클립보드 복사 옵션**
- 설정에서 "캡처 즉시 자동 복사" 옵션 추가

**2. 키보드 단축키**
- `Alt+B`: Side Panel 열기/닫기
- `Alt+R`: 범위 선택 모드 시작
- `Alt+C`: 결과 복사

### v1.2: API 및 과금

| 플랜            | 사용 횟수 | 가격        | 특징                                                                         |
| --------------- | --------- | ----------- | ---------------------------------------------------------------------------- |
| **Free**        | 5회       | 무료        | 사용횟수 5회, 히스토리 3개 저장, 3가지 템플릿                                |
| **Basic30**     | 30회      | 5,000원     | 사용횟수 30회, 히스토리 10개 저장, 3가지 템플릿                              |
| **Standard100** | 100회     | 10,000원    | 사용횟수 100회, 히스토리 10개 저장, 3가지 템플릿, 다른 언어모델 연동         |
| **MAX**         | 무제한    | 29,000원/월 | 무제한 사용, 히스토리 10개 저장, 3가지 템플릿, 다른 언어모델 연동, 우선 지원 |

### v1.3: 플랫폼 확장

**1. 자동 게시 (Phase 3)**
- Twitter/X 자동 스레드 게시
- Notion 자동 페이지 생성
- Medium 자동 포스팅
- 개인 블로그 Webhook 지원

**2. 더 많은 AI 사이트 지원**
- Gemini (완료)
- Mistral
- LLaMA Chat
- HuggingChat

### v2.0: 고급 기능

**1. 템플릿 시스템**
- 통찰 정리
- 지식 정리
- 질문 추출
- 커스텀 템플릿 (사용자 작성)

**2. 협업 기능**
- 팀 워크스페이스
- 공유 템플릿
- 캡처 공유 기능

**3. 분석 및 인사이트**
- 사용 통계
- 인기 토픽
- 생산성 리포트

---

## 개발 환경 설정

### 필요한 도구

- Chrome 브라우저 (114+)
- 코드 에디터 (VS Code 권장)
- Git

### 로컬 테스트

```bash
# 1. 프로젝트 클론
git clone [repository-url]
cd bridge-notes

# 2. Chrome에서 로드
# chrome://extensions 접속
# "개발자 모드" 활성화
# "압축해제된 확장 프로그램을 로드합니다" 클릭
# bridge_notes_front 폴더 선택

# 3. 테스트
# Claude.ai 또는 ChatGPT 접속
# 확장 프로그램 아이콘 클릭 → Side Panel 열림
# 기능 테스트
```

### n8n 설정 (Phase 2)

```bash
# 1. n8n.cloud 계정 생성
https://n8n.cloud

# 2. Webhook 생성
워크플로우 → Webhook 노드 추가 → URL 복사

# 3. API 키 설정
Credentials → Claude API → API 키 입력
Credentials → OpenAI API → API 키 입력

# 4. 테스트
Postman 또는 curl로 Webhook 테스트
```

---

## 라이선스

MIT License (예정)

---

**Contact:** edari.bridge@gmail.com
**마지막 업데이트:** 2024년 12월 6일
**버전:** v1.0.0 (Phase 1 - 95% 완료)
