# Phase 2 병렬 개발 전략 (Option 3)

**전략 이름:** Parallel Track Development
**예상 완료:** 2-3일 (vs 순차 개발 5일)
**난이도:** 중상 (동시 작업 조율 필요)

---

## 📋 목차

1. [전략 개요](#전략-개요)
2. [병렬 개발 타임라인](#병렬-개발-타임라인)
3. [Track 1: 백엔드 (n8n)](#track-1-백엔드-n8n)
4. [Track 2: 프론트엔드 (Extension)](#track-2-프론트엔드-extension)
5. [통합 포인트](#통합-포인트)
6. [Mock 데이터 전략](#mock-데이터-전략)
7. [리스크 관리](#리스크-관리)
8. [성공 기준](#성공-기준)

---

## 전략 개요

### 핵심 아이디어
백엔드와 프론트엔드를 **완전히 독립적으로** 개발한 후, **점진적으로 통합**

```
시간축:  0h ─────── 2h ─────── 4h ─────── 8h ────── 12h ────── 24h ───── 48h
         │          │          │          │         │          │         │
Track 1: │ n8n      │ Webhook  │ Claude   │ GPT     │ Test     │ Refine  │ DONE
(Backend)│ Setup    │ Create   │ API      │ API     │ Postman  │ Error   │
         │          │          │          │         │          │ Handle  │
         ├──────────┼──────────┼──────────┼─────────┼──────────┼─────────┤
Track 2: │ Mock     │ API      │ Result   │ UI      │ Settings │ Connect │ DONE
(Frontend)│ Design   │ Service  │ Area     │ Polish  │ Webhook  │ Real    │
         │          │          │          │         │          │ API     │
         │          │          │          │         │          │         │
Sync:    └─ Mock ───┴─ URL ────┴─ Format ─┴─ Test ──┴─ Switch ─┴─ Final ─┘
         Response   Share      Align      Mock      to Real    Test
```

### 시간 절약 원리

**순차 개발 (5일):**
```
Day 1: n8n Setup → Webhook (8h)
Day 2: Claude API (8h)
Day 3: ChatGPT API (8h)
─────────────────────────────── 백엔드 완료
Day 4: API Service + ResultArea (8h)
Day 5: Settings + 통합 테스트 (8h)
═══════════════════════════════
총 40시간 (5일)
```

**병렬 개발 (2-3일):**
```
Day 1 (병렬):
  Track 1: n8n Setup + Webhook + Claude API (8h)
  Track 2: Mock + API Service + ResultArea (8h)

Day 2 (병렬 + 통합):
  Track 1: ChatGPT API + Error Handling (4h)
  Track 2: UI Polish + Settings (4h)
  Integration: Real API 연결 (4h)

Day 3 (검증):
  통합 테스트 + 버그 수정 (4-8h)
═══════════════════════════════
총 20-28시간 (2-3일)
```

---

## 병렬 개발 타임라인

### Phase 1: 초기 설정 (0-2시간)

**동시 작업:**

| Track 1 (Backend) | Track 2 (Frontend) |
|-------------------|-------------------|
| ✅ n8n.cloud 계정 생성 | ✅ Mock 응답 JSON 설계 |
| ✅ 첫 워크플로우 생성 | ✅ API 인터페이스 정의 |
| ✅ Webhook 노드 추가 | ✅ 에러 타입 정의 |
| ✅ **Webhook URL 확보** | ✅ TypeScript 인터페이스 작성 |

**Sync Point #1: Webhook URL 공유**
```
Backend → Frontend:
"https://your-instance.app.n8n.cloud/webhook/abc123"
```

---

### Phase 2: 핵심 기능 구현 (2-8시간)

#### Track 1: Backend (n8n 워크플로우)

**Step 1: Webhook 테스트 (30분)**
```javascript
// Postman으로 즉시 테스트
POST {{webhook_url}}
Content-Type: application/json

{
  "text": "테스트 대화",
  "action": "summarize",
  "template": "insight"
}

// n8n Function 노드에서 일단 Echo 응답
return [{
  json: {
    success: true,
    result: $input.item.json.text, // 그대로 반환
    metadata: {
      processingTime: 0,
      model: "mock"
    }
  }
}];
```

**Step 2: Claude API 연동 (2-3시간)**
```
1. Anthropic API 키 발급
2. HTTP Request 노드 추가
3. 프롬프트 템플릿 작성 (insight/knowledge/question)
4. Switch 노드로 템플릿 분기
5. Postman 테스트
```

**Step 3: 에러 처리 추가 (1시간)**
```javascript
// Function 노드: Error Handling
try {
  const response = await anthropic.messages.create({...});
  return [{
    json: {
      success: true,
      result: response.content[0].text,
      metadata: {...}
    }
  }];
} catch (error) {
  return [{
    json: {
      success: false,
      error: error.status === 429 ? 'rate_limit' : 'api_error',
      message: error.message,
      retryAfter: error.status === 429 ? 60 : null
    }
  }];
}
```

#### Track 2: Frontend (Chrome Extension)

**Step 1: Mock 데이터로 API Service 구현 (2시간)**

**파일 생성:** `scripts/services/APIService.js`

```javascript
export class APIService {
  constructor() {
    this.webhookUrl = null;
    this.useMock = true; // ← 초기에는 Mock 모드
  }

  async process({ text, action, template, tone }) {
    if (this.useMock) {
      return this.getMockResponse({ text, action, template, tone });
    }

    // Real API 호출 (나중에 활성화)
    return this.callRealAPI({ text, action, template, tone });
  }

  // Mock 응답 (즉시 개발 가능)
  async getMockResponse({ text, action, template }) {
    // 실제 API처럼 2-3초 딜레이 시뮬레이션
    await this.delay(2500);

    if (action === 'summarize') {
      return {
        success: true,
        result: this.generateMockSummary(text, template),
        metadata: {
          processingTime: 2.5,
          wordsCount: 280,
          model: 'mock-claude'
        }
      };
    }

    if (action === 'tone-adjust') {
      return {
        success: true,
        result: this.generateMockToneAdjust(text, tone),
        metadata: {
          processingTime: 1.8,
          model: 'mock-gpt'
        }
      };
    }
  }

  generateMockSummary(text, template) {
    const templates = {
      insight: `💡 [Mock] 핵심 통찰\n\n${text.slice(0, 100)}...\n\n이것은 Mock 응답입니다.`,
      knowledge: `📚 [Mock] 지식 정리\n\n✅ ${text.slice(0, 50)}\n✅ 두 번째 포인트\n\nMock 데이터입니다.`,
      question: `❓ [Mock] 주요 질문\n\n${text.slice(0, 60)}\n\n✅ 간결한 답변\n\nMock 응답입니다.`
    };
    return templates[template] || templates.insight;
  }

  // Real API (n8n 완성 후 활성화)
  async callRealAPI({ text, action, template, tone }) {
    // ... Fetch 로직 (PHASE2_PLAN.md 참조)
  }

  // Mock ↔ Real 전환
  enableRealAPI(webhookUrl) {
    this.webhookUrl = webhookUrl;
    this.useMock = false;
    console.log('✅ Real API 모드 활성화');
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
```

**Step 2: ResultArea 수정 (2-3시간)**

```javascript
// scripts/components/ResultArea.js

import { APIService } from '../services/APIService.js';

class ResultArea {
  constructor(toast, errorHandler, settings) {
    this.apiService = new APIService();
    // ... 기존 코드
  }

  async show(capturedText) {
    // 1. 원본 즉시 표시
    this.originalText = capturedText;
    this.originalTextarea.value = capturedText;
    this.activateTab('original');
    this.resultContainer.classList.remove('hidden');

    // 2. 백그라운드에서 AI 처리 (Mock이든 Real이든 동일한 인터페이스)
    this.processWithAI();
  }

  async processWithAI() {
    try {
      this.showLoading('AI가 대화를 정리하는 중...');

      const result = await this.apiService.process({
        text: this.originalText,
        action: 'summarize',
        template: this.getCurrentTemplate()
      });

      this.processedText = result.result;
      this.processedTextarea.value = result.result;
      this.hideLoading();

      // Mock인지 표시 (개발 중에만)
      if (this.apiService.useMock) {
        this.toast.warning('⚠️ Mock 데이터 (개발 모드)');
      } else {
        this.toast.success('AI 정리 완료! ✨');
      }

    } catch (error) {
      this.hideLoading();
      this.toast.error('AI 처리 실패: ' + error.message);
    }
  }
}
```

**Step 3: UI 개발 및 테스트 (2시간)**

이제 **실제 n8n API 없이도** 전체 UI를 테스트할 수 있습니다:

1. ✅ 캡처 → 원본 표시
2. ✅ 2-3초 후 Mock AI 결과 표시
3. ✅ 템플릿 전환 테스트
4. ✅ 어투 조정 테스트
5. ✅ 복사 기능 테스트
6. ✅ 로딩 UI 테스트

---

### Phase 3: ChatGPT API 추가 (병렬, 8-12시간)

#### Track 1: Backend

**ChatGPT API 노드 추가 (2시간)**
```
1. OpenAI API 키 발급
2. HTTP Request 노드 추가
3. 어투 조정 프롬프트 작성
4. Switch 노드에 "tone-adjust" 분기 추가
5. Postman 테스트
```

#### Track 2: Frontend

**Settings에 Webhook URL 입력 UI (2시간)**

```javascript
// scripts/components/Settings.js

async saveWebhookUrl() {
  const url = document.getElementById('webhookUrl').value;

  if (!url) {
    this.toast.error('Webhook URL을 입력하세요');
    return;
  }

  // API Service에 전달
  const apiService = window.bridgeNotes?.resultArea?.apiService;
  if (apiService) {
    apiService.enableRealAPI(url);
    this.toast.success('✅ Real API 모드 활성화');
  }

  await chrome.storage.sync.set({ webhookUrl: url });
}
```

**HTML 추가:**
```html
<!-- sidepanel.html의 Settings 섹션 -->
<div class="setting-group">
  <label for="webhookUrl">n8n Webhook URL</label>
  <input
    type="url"
    id="webhookUrl"
    placeholder="https://your-instance.app.n8n.cloud/webhook/..."
  />
  <button id="saveWebhookBtn" class="btn-primary">저장</button>

  <!-- Mock/Real 모드 표시 -->
  <p id="apiModeStatus" class="setting-description">
    🔴 Mock 모드 (개발 중)
  </p>
</div>
```

---

### Phase 4: 통합 및 테스트 (12-24시간)

**Sync Point #2: Real API 연결**

```javascript
// 1. n8n에서 최종 Webhook URL 확인
console.log('Webhook URL:', 'https://your-instance.app.n8n.cloud/webhook/abc123');

// 2. Settings에서 URL 입력 및 저장
// → apiService.useMock = false 자동 전환

// 3. 캡처 테스트
// → Real API 호출 확인

// 4. Chrome DevTools Console에서 확인
// "✅ Real API 모드 활성화"
// "POST https://your-instance.app.n8n.cloud/webhook/abc123"
```

**통합 테스트 시나리오:**

| 테스트 | Mock | Real | 상태 |
|--------|------|------|------|
| 캡처 → 원본 표시 | ✅ | ✅ | |
| AI 정리 (insight) | ✅ | ⏳ | |
| AI 정리 (knowledge) | ✅ | ⏳ | |
| AI 정리 (question) | ✅ | ⏳ | |
| 어투 조정 (friendly) | ✅ | ⏳ | |
| 어투 조정 (formal) | ✅ | ⏳ | |
| 네트워크 에러 | ✅ | ⏳ | |
| 타임아웃 | ✅ | ⏳ | |

---

## 통합 포인트

병렬 개발 중 **3개의 핵심 Sync Point**:

### Sync #1: Webhook URL (2시간 시점)
```
Backend → Frontend
━━━━━━━━━━━━━━━━━
URL: "https://..."
Method: POST
Content-Type: application/json
```

### Sync #2: 응답 포맷 (4시간 시점)
```javascript
// Backend와 Frontend가 합의한 Interface
interface APIResponse {
  success: boolean;
  result?: string;
  metadata?: {
    processingTime: number;
    wordsCount: number;
    model: string;
  };
  error?: 'rate_limit' | 'network' | 'api_error';
  message?: string;
  retryAfter?: number;
}
```

### Sync #3: Real API 전환 (12시간 시점)
```javascript
// Frontend Settings에서:
apiService.enableRealAPI(webhookUrl);

// 이후 모든 호출이 Real API로:
apiService.useMock = false;
```

---

## Mock 데이터 전략

### Mock의 장점

1. **Backend 의존성 제거**
   - n8n이 완성되지 않아도 프론트엔드 개발 가능
   - API 다운타임에도 UI 개발 계속

2. **빠른 반복**
   - API 응답 대기 없이 즉시 테스트
   - 다양한 시나리오 빠르게 시뮬레이션

3. **에러 시나리오 테스트**
   - Rate limit, Timeout, Network error 쉽게 재현

### Mock 데이터 설계

```javascript
// scripts/services/MockResponses.js

export const MockResponses = {
  // 성공 케이스
  summarize_insight: {
    success: true,
    result: `💡 TypeScript 학습 로드맵

JavaScript 기초를 먼저 다지는 것이 핵심입니다. TypeScript는 JS의 상위 집합이므로, JS 문법에 익숙해진 후 타입 시스템을 추가로 학습하는 것이 효율적입니다.

공식 문서와 TypeScript Handbook을 활용하면 체계적으로 배울 수 있습니다.`,
    metadata: {
      processingTime: 2.3,
      wordsCount: 156,
      model: 'mock-claude'
    }
  },

  // 에러 케이스
  rate_limit_error: {
    success: false,
    error: 'rate_limit',
    message: '요청 한도에 도달했습니다. 60초 후 다시 시도하세요.',
    retryAfter: 60
  },

  timeout_error: {
    success: false,
    error: 'timeout',
    message: '요청 시간 초과 (30초). 다시 시도하시겠습니까?'
  },

  network_error: {
    success: false,
    error: 'network',
    message: '네트워크 연결을 확인하세요'
  }
};
```

### Mock ↔ Real 전환 로직

```javascript
class APIService {
  // 환경 감지
  async init() {
    const { webhookUrl } = await chrome.storage.sync.get(['webhookUrl']);

    if (webhookUrl && webhookUrl.startsWith('https://')) {
      this.enableRealAPI(webhookUrl);
    } else {
      console.warn('⚠️ Webhook URL 없음. Mock 모드로 시작합니다.');
      this.useMock = true;
    }
  }

  // Settings에서 호출
  enableRealAPI(url) {
    this.webhookUrl = url;
    this.useMock = false;
    console.log('✅ Real API 활성화:', url);
  }

  // 개발 중 토글 (Chrome DevTools Console에서)
  toggleMock() {
    this.useMock = !this.useMock;
    console.log(this.useMock ? '🔴 Mock 모드' : '🟢 Real API 모드');
  }
}

// Chrome DevTools Console에서 테스트:
// window.apiService.toggleMock()
```

---

## 리스크 관리

### 리스크 1: 인터페이스 불일치

**문제:**
Backend 응답 형식과 Frontend 기대값이 다를 수 있음

**해결책:**
```typescript
// 공통 Interface 먼저 정의 (TypeScript)
interface APIRequest {
  text: string;
  action: 'summarize' | 'tone-adjust';
  template?: 'insight' | 'knowledge' | 'question';
  tone?: 'friendly' | 'formal';
}

interface APIResponse {
  success: boolean;
  result?: string;
  metadata?: ResponseMetadata;
  error?: ErrorType;
  message?: string;
  retryAfter?: number;
}

// Backend (n8n Function)와 Frontend 모두 이 스키마 준수
```

### 리스크 2: Mock과 Real의 동작 차이

**문제:**
Mock은 성공하지만 Real API는 실패할 수 있음

**해결책:**
```javascript
// Mock도 Real과 동일한 에러 시뮬레이션
getMockResponse({ text, action }) {
  // 10% 확률로 에러 시뮬레이션
  if (Math.random() < 0.1) {
    throw new Error('Mock Network Error');
  }

  // 실제 API와 동일한 딜레이
  await this.delay(2000 + Math.random() * 2000); // 2-4초

  // 실제와 유사한 응답
  return { success: true, result: '...' };
}
```

### 리스크 3: Webhook URL 변경

**문제:**
n8n 워크플로우 재생성 시 URL 변경 가능

**해결책:**
```javascript
// Settings에서 언제든 URL 업데이트 가능
async updateWebhookUrl(newUrl) {
  this.apiService.enableRealAPI(newUrl);
  await chrome.storage.sync.set({ webhookUrl: newUrl });

  // Health Check
  const isHealthy = await this.apiService.healthCheck();
  if (isHealthy) {
    this.toast.success('✅ Webhook 연결 성공');
  } else {
    this.toast.error('❌ Webhook 연결 실패. URL을 확인하세요.');
  }
}
```

---

## 성공 기준

### Phase 1 성공 (2시간)
- [ ] n8n Webhook URL 확보
- [ ] Postman으로 Echo 응답 확인
- [ ] Mock API Service 구현 완료
- [ ] ResultArea가 Mock 데이터로 작동

### Phase 2 성공 (8시간)
- [ ] Claude API 연동 (3개 템플릿)
- [ ] Postman으로 Real 응답 확인
- [ ] Frontend UI 완성 (Mock 기반)
- [ ] Settings에 Webhook URL 입력 UI

### Phase 3 성공 (12시간)
- [ ] ChatGPT API 연동
- [ ] Mock → Real 전환 성공
- [ ] 전체 플로우 통합 테스트 통과

### 최종 성공 (24-48시간)
- [ ] 모든 시나리오 테스트 통과
- [ ] 에러 처리 완벽 작동
- [ ] 성능 최적화 완료
- [ ] 문서화 완료

---

## 실행 가이드

### 시작하기

**1. Backend Track 시작 (Terminal 1)**
```bash
# n8n.cloud 접속
open https://app.n8n.cloud

# 워크플로우 생성
# Webhook 노드 추가
# URL 복사: https://your-instance.app.n8n.cloud/webhook/abc123
```

**2. Frontend Track 시작 (Terminal 2)**
```bash
cd bridge_notes_front

# Mock API Service 생성
touch scripts/services/APIService.js
touch scripts/services/MockResponses.js

# 코드 작성 (위 예시 참조)
code scripts/services/APIService.js
```

**3. 동시 개발**
```bash
# Backend: n8n GUI에서 노드 추가
# Frontend: VSCode에서 코드 작성

# 각자 독립적으로 테스트:
# Backend: Postman
# Frontend: Chrome Extension Reload
```

**4. 통합**
```bash
# Settings에서 Webhook URL 입력
# Mock → Real 전환
# 통합 테스트 시작
```

---

## 체크리스트

### Day 1 (병렬)
- [ ] Track 1: n8n 계정 + Webhook + Claude API
- [ ] Track 2: Mock + API Service + ResultArea
- [ ] Sync: URL 공유, 포맷 합의

### Day 2 (병렬 + 통합)
- [ ] Track 1: ChatGPT API + 에러 처리
- [ ] Track 2: Settings UI + Mock 완성
- [ ] Integration: Real API 연결

### Day 3 (검증)
- [ ] 통합 테스트 전체 시나리오
- [ ] 버그 수정
- [ ] 성능 최적화
- [ ] 문서 업데이트

---

**작성일:** 2024-12-07
**전략:** Parallel Track Development
**예상 절감:** 2-3일 (vs 순차 5일)
