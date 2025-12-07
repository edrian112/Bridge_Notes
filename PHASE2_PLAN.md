# Bridge Notes - Phase 2 구현 계획

**시작일:** 2024-12-07
**목표:** AI 자동 정리 기능 구현 (n8n + API 연동)
**예상 기간:** 5일

---

## 📋 목차

1. [Phase 2 개요](#phase-2-개요)
2. [아키텍처 설계](#아키텍처-설계)
3. [구현 순서](#구현-순서)
4. [n8n 워크플로우 설계](#n8n-워크플로우-설계)
5. [확장 프로그램 수정사항](#확장-프로그램-수정사항)
6. [API 연동 세부사항](#api-연동-세부사항)
7. [에러 처리 전략](#에러-처리-전략)
8. [테스트 계획](#테스트-계획)
9. [배포 체크리스트](#배포-체크리스트)

---

## Phase 2 개요

### 목표
캡처한 AI 대화를 자동으로 정리하고 어투를 조정하여 사용자가 바로 사용할 수 있는 게시글 초안 생성

### 핵심 기능
1. **자동 대화 정리** (Claude API)
   - 통찰/지식 추출
   - 불필요한 대화 맥락 제거
   - 읽기 쉬운 구조로 재구성

2. **어투 조정** (ChatGPT API)
   - 친근한 어투 (informal)
   - 정중한 어투 (formal)

3. **템플릿 시스템**
   - 통찰 정리
   - 지식 정리
   - 질문 추출

### 사용자 흐름
```
사용자 캡처 완료
    ↓
원본 텍스트 표시 (즉시)
    ↓
[백그라운드] n8n Webhook 호출
    ↓ (3-5초)
AI 정리 결과 자동 반영
    ↓
사용자 편집 가능
    ↓
복사 또는 재생성
```

---

## 아키텍처 설계

### 시스템 구성도

```
┌─────────────────────────────────────────────┐
│         Chrome Extension (Frontend)          │
│                                              │
│  [Content Script] ──► [ResultArea]          │
│         │                   │                │
│         │                   ├─► [원본 표시]  │
│         │                   │                │
│         │                   ├─► [AI 처리 중] │
│         │                   │                │
│         │                   └─► [결과 표시]  │
│         │                                    │
│         └──────► [API Service] ──────┐       │
│                      │                │       │
└──────────────────────┼────────────────┼───────┘
                       │ HTTPS          │
                       ↓                │
              ┌────────────────┐        │
              │  n8n Workflow   │        │
              │   (Backend)     │        │
              │                 │        │
              │  1. Webhook     │◄───────┘
              │  2. Router      │
              │  3. Claude API  │
              │  4. ChatGPT API │
              │  5. Response    │
              └────────────────┘
```

### 데이터 흐름

**요청 (Request):**
```json
{
  "text": "캡처된 대화 내용",
  "action": "summarize" | "tone-adjust",
  "template": "insight" | "knowledge" | "question",
  "tone": "friendly" | "formal"
}
```

**응답 (Response):**
```json
{
  "success": true,
  "result": "정리된 텍스트",
  "metadata": {
    "processingTime": 3.2,
    "wordsCount": 280,
    "model": "claude-3-5-sonnet-20241022"
  }
}
```

**에러 응답:**
```json
{
  "success": false,
  "error": "rate_limit" | "network" | "api_error",
  "message": "사용자에게 표시할 메시지",
  "retryAfter": 60
}
```

---

## 구현 순서

### Week 1: n8n 워크플로우 (3일)

#### Day 1: n8n 기본 설정 및 Webhook
- [ ] n8n.cloud 계정 생성
- [ ] 첫 워크플로우 생성
- [ ] Webhook 노드 추가 및 테스트
- [ ] Postman으로 요청/응답 검증

#### Day 2: Claude API 연동
- [ ] Claude API 키 발급 (Anthropic Console)
- [ ] HTTP Request 노드로 Claude API 호출
- [ ] 대화 정리 프롬프트 작성 및 테스트
- [ ] 템플릿별 프롬프트 분기 로직

#### Day 3: ChatGPT API 연동 및 최적화
- [ ] OpenAI API 키 발급
- [ ] 어투 조정 프롬프트 작성
- [ ] 조건 분기 (action별 라우팅)
- [ ] 에러 처리 및 재시도 로직
- [ ] 응답 포맷 표준화

### Week 2: 확장 프로그램 업데이트 (2일)

#### Day 4: API Service 및 UI
- [ ] API Service 클래스 생성 (scripts/services/APIService.js)
- [ ] ResultArea에 Webhook 호출 로직 추가
- [ ] 로딩 상태 UI 개선
- [ ] 에러 처리 및 재시도 UI
- [ ] AI 정리 결과 표시 탭 구현

#### Day 5: Settings 및 통합 테스트
- [ ] Settings에 API 선택 옵션 추가
- [ ] n8n Webhook URL 설정 저장
- [ ] 전체 플로우 통합 테스트
- [ ] 에러 시나리오 테스트
- [ ] 성능 최적화 (캐싱, 타임아웃)

---

## n8n 워크플로우 설계

### 노드 구성

```
1. [Webhook] - POST 요청 수신
    ↓
2. [Function] - 요청 데이터 파싱 및 검증
    ↓
3. [Switch] - action 분기
    ├─ "summarize" → 4. Claude API
    └─ "tone-adjust" → 5. ChatGPT API
    ↓
6. [Function] - 응답 포맷팅
    ↓
7. [Respond to Webhook] - 결과 반환
```

### Claude API 프롬프트

#### 템플릿 1: 통찰 정리 (insight)
```
당신은 AI 대화에서 핵심 통찰을 추출하는 전문가입니다.

다음 대화에서 얻은 핵심 통찰을 명확하고 간결하게 정리해주세요.

요구사항:
- 대화 맥락 제거, 핵심 아이디어만 추출
- 읽기 쉬운 구조 (제목 + 본문)
- 280자 기준 3-5개 트윗 스레드 형태
- 불필요한 인사말이나 부가 설명 제거

대화 내용:
{{$json.text}}

출력 형식:
💡 [핵심 통찰 제목]

[간결한 본문 1-2문장]

[필요시 예시나 부연 설명]
```

#### 템플릿 2: 지식 정리 (knowledge)
```
당신은 AI 대화에서 배운 지식을 체계적으로 정리하는 전문가입니다.

다음 대화에서 배운 내용을 명확하고 재사용 가능한 형태로 정리해주세요.

요구사항:
- 핵심 개념과 설명 구분
- 단계별/목록 형식 활용
- 실용적인 정보 우선
- 280자 기준 3-5개 트윗 스레드 형태

대화 내용:
{{$json.text}}

출력 형식:
📚 [학습 주제]

✅ [핵심 개념 1]
- [설명 또는 예시]

✅ [핵심 개념 2]
- [설명 또는 예시]
```

#### 템플릿 3: 질문 추출 (question)
```
당신은 AI 대화에서 중요한 질문과 답변을 추출하는 전문가입니다.

다음 대화에서 가치있는 질문과 간결한 답변을 정리해주세요.

요구사항:
- Q&A 형식으로 구조화
- 질문은 명확하고 구체적으로
- 답변은 핵심만 간결하게
- 280자 기준 3-5개 트윗 스레드 형태

대화 내용:
{{$json.text}}

출력 형식:
❓ [질문 1]

✅ [간결한 답변]

❓ [질문 2]

✅ [간결한 답변]
```

### ChatGPT API 프롬프트 (어투 조정)

```
다음 텍스트의 어투를 {{$json.tone}}로 자연스럽게 변환해주세요.

어투 스타일:
- friendly: 친근하고 일상적인 말투 ("~해요", "~이에요", "~네요")
- formal: 정중하고 격식있는 말투 ("~합니다", "~입니다", "~됩니다")

중요:
- 의미와 구조는 그대로 유지
- 이모지와 포맷은 보존
- 자연스러운 한국어 표현 사용

원본 텍스트:
{{$json.text}}
```

---

## 확장 프로그램 수정사항

### 1. API Service 생성

**파일:** `bridge_notes_front/scripts/services/APIService.js`

```javascript
/**
 * API Service - n8n Webhook 통신 담당
 */
export class APIService {
  constructor() {
    this.webhookUrl = null;
    this.timeout = 30000; // 30초
    this.maxRetries = 3;
  }

  async init() {
    // Chrome Storage에서 Webhook URL 불러오기
    const result = await chrome.storage.sync.get(['webhookUrl']);
    this.webhookUrl = result.webhookUrl || null;
  }

  async setWebhookUrl(url) {
    this.webhookUrl = url;
    await chrome.storage.sync.set({ webhookUrl: url });
  }

  /**
   * AI 처리 요청
   * @param {Object} options
   * @param {string} options.text - 캡처된 텍스트
   * @param {string} options.action - "summarize" | "tone-adjust"
   * @param {string} options.template - "insight" | "knowledge" | "question"
   * @param {string} options.tone - "friendly" | "formal"
   */
  async process({ text, action, template = 'insight', tone = 'friendly' }) {
    if (!this.webhookUrl) {
      throw new Error('Webhook URL이 설정되지 않았습니다');
    }

    const requestBody = {
      text,
      action,
      template,
      tone
    };

    // 재시도 로직 포함
    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.timeout);

        const response = await fetch(this.webhookUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(requestBody),
          signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          // 서버 에러 (5xx)면 재시도
          if (response.status >= 500 && attempt < this.maxRetries) {
            await this.delay(1000 * attempt); // 지수 백오프
            continue;
          }
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();

        if (!data.success) {
          throw new Error(data.message || 'AI 처리 실패');
        }

        return {
          success: true,
          result: data.result,
          metadata: data.metadata
        };

      } catch (error) {
        if (error.name === 'AbortError') {
          if (attempt < this.maxRetries) {
            await this.delay(1000 * attempt);
            continue;
          }
          throw new Error('요청 시간 초과 (30초)');
        }

        if (attempt === this.maxRetries) {
          throw error;
        }

        // 네트워크 에러면 재시도
        await this.delay(1000 * attempt);
      }
    }
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Health check - n8n 서버 상태 확인
   */
  async healthCheck() {
    if (!this.webhookUrl) return false;

    try {
      const response = await fetch(this.webhookUrl + '/health', {
        method: 'GET',
        signal: AbortSignal.timeout(5000)
      });
      return response.ok;
    } catch {
      return false;
    }
  }
}
```

### 2. ResultArea 수정사항

**파일:** `bridge_notes_front/scripts/components/ResultArea.js`

**수정할 메서드:**

1. **show() 메서드** - 캡처 완료 시 자동으로 AI 처리 시작
```javascript
async show(capturedText, source = 'capture') {
  // 기존 로직: 원본 텍스트 표시
  this.originalText = capturedText;
  this.originalTextarea.value = capturedText;

  // 탭 활성화 및 표시
  this.activateTab('original');
  this.resultContainer.classList.remove('hidden');

  // ✨ NEW: 백그라운드에서 AI 처리 시작
  this.processWithAI();
}
```

2. **processWithAI() 메서드** - 실제 API 호출 구현
```javascript
async processWithAI() {
  try {
    this.showLoading('AI가 대화를 정리하는 중...');

    // 현재 선택된 템플릿 가져오기
    const template = this.getCurrentTemplate(); // 'insight' | 'knowledge' | 'question'

    // API 호출
    const result = await this.apiService.process({
      text: this.originalText,
      action: 'summarize',
      template: template,
      tone: 'friendly' // 기본값
    });

    // 결과 저장 및 표시
    this.processedText = result.result;
    this.processedTextarea.value = result.result;

    // 로딩 숨김
    this.hideLoading();

    // 성공 메시지
    this.toast.success('AI 정리 완료! ✨');

    // '원본' → 'AI 정리' 탭으로 자동 전환 (선택적)
    // this.activateTab('processed');

  } catch (error) {
    this.hideLoading();
    this.errorHandler.handle(error, 'AI 처리');

    // 실패해도 원본은 사용 가능
    this.toast.warning('AI 정리에 실패했지만 원본은 사용 가능합니다');
  }
}
```

3. **regenerate() 메서드** - 재생성 기능
```javascript
async regenerate() {
  const template = this.getCurrentTemplate();

  try {
    this.showLoading('다시 생성하는 중...');

    const result = await this.apiService.process({
      text: this.originalText,
      action: 'summarize',
      template: template,
      tone: this.currentTone || 'friendly'
    });

    this.processedText = result.result;
    this.processedTextarea.value = result.result;
    this.hideLoading();

    this.toast.success('재생성 완료!');

  } catch (error) {
    this.hideLoading();
    this.errorHandler.handle(error, 'AI 재생성');
  }
}
```

4. **selectTone() 메서드** - 어투 조정
```javascript
async selectTone(tone) {
  this.currentTone = tone; // 'friendly' | 'formal'

  // 버튼 상태 업데이트
  this.updateToneButtons(tone);

  try {
    this.showLoading(`${tone === 'friendly' ? '친근한' : '정중한'} 어투로 변환 중...`);

    const result = await this.apiService.process({
      text: this.processedText, // AI 정리된 텍스트 기준
      action: 'tone-adjust',
      tone: tone
    });

    this.finalText = result.result;
    this.finalTextarea.value = result.result;
    this.hideLoading();

    // 'AI 정리' → '최종본' 탭으로 전환
    this.activateTab('final');

    this.toast.success(`${tone === 'friendly' ? '친근한' : '정중한'} 어투로 변환 완료!`);

  } catch (error) {
    this.hideLoading();
    this.errorHandler.handle(error, '어투 조정');
  }
}
```

### 3. Settings 수정사항

**파일:** `bridge_notes_front/scripts/components/Settings.js`

**추가할 UI:**

```html
<!-- Webhook URL 설정 -->
<div class="setting-group">
  <label for="webhookUrl">n8n Webhook URL</label>
  <input
    type="url"
    id="webhookUrl"
    class="setting-input"
    placeholder="https://your-n8n-instance.app.n8n.cloud/webhook/..."
  />
  <p class="setting-description">
    n8n 워크플로우의 Webhook URL을 입력하세요
  </p>
</div>

<!-- API 선택 (Phase 2.1 - 선택적) -->
<div class="setting-group">
  <label>AI 모델 선택</label>
  <select id="aiModel" class="setting-select">
    <option value="claude">Claude (기본)</option>
    <option value="chatgpt">ChatGPT</option>
    <option value="perplexity">Perplexity</option>
    <option value="gemini">Gemini</option>
  </select>
</div>
```

**JavaScript 추가:**

```javascript
async saveWebhookUrl() {
  const url = document.getElementById('webhookUrl').value;

  if (!url) {
    this.toast.error('Webhook URL을 입력하세요');
    return;
  }

  // URL 형식 검증
  try {
    new URL(url);
  } catch {
    this.toast.error('올바른 URL 형식이 아닙니다');
    return;
  }

  // APIService에 저장
  await this.apiService.setWebhookUrl(url);

  this.toast.success('Webhook URL 저장 완료');
}
```

---

## API 연동 세부사항

### Claude API
- **모델:** `claude-3-5-sonnet-20241022`
- **Max Tokens:** 1000 (충분한 길이)
- **Temperature:** 0.7 (창의적이면서 일관성 유지)
- **예상 비용:** $0.003/1K tokens (input) + $0.015/1K tokens (output)

### ChatGPT API
- **모델:** `gpt-4o-mini` (비용 효율적)
- **Max Tokens:** 500 (어투 조정은 짧음)
- **Temperature:** 0.5 (일관성 우선)
- **예상 비용:** $0.150/1M input tokens + $0.600/1M output tokens

### 비용 예측
- **월 100회 사용** (평균 500자 입력/출력)
  - Claude: $0.50
  - ChatGPT: $0.15
  - **총:** ~$0.65/월

---

## 에러 처리 전략

### 1. 네트워크 에러
```javascript
{
  type: 'NetworkError',
  message: '네트워크 연결을 확인하세요',
  retry: true,
  fallback: 'use_original'
}
```

### 2. API Rate Limit
```javascript
{
  type: 'RateLimitError',
  message: '잠시 후 다시 시도해주세요 (60초)',
  retry: false,
  retryAfter: 60
}
```

### 3. Timeout
```javascript
{
  type: 'TimeoutError',
  message: '요청 시간 초과 (30초). 다시 시도하시겠습니까?',
  retry: true,
  fallback: 'use_original'
}
```

### 4. Invalid Response
```javascript
{
  type: 'InvalidResponseError',
  message: 'AI 응답 형식이 올바르지 않습니다',
  retry: true,
  fallback: 'use_original'
}
```

---

## 테스트 계획

### 1. n8n 워크플로우 테스트

**Postman 테스트 케이스:**

```bash
# Test 1: 통찰 정리 (insight)
POST {{webhook_url}}
Content-Type: application/json

{
  "text": "사용자: TypeScript를 배우려는데 어디서부터 시작하면 좋을까요?\n\nClaude: TypeScript는 JavaScript의 상위 집합이므로, 먼저 JavaScript 기초를 다지는 것이 중요합니다...",
  "action": "summarize",
  "template": "insight"
}

# 예상 응답:
{
  "success": true,
  "result": "💡 TypeScript 학습 시작 가이드\n\nJavaScript 기초부터 시작하는 것이 핵심...",
  "metadata": {
    "processingTime": 3.2,
    "wordsCount": 280,
    "model": "claude-3-5-sonnet-20241022"
  }
}
```

### 2. 확장 프로그램 통합 테스트

**시나리오 1: 정상 플로우**
1. Claude.ai에서 대화 캡처
2. 원본 텍스트 즉시 표시 확인
3. 3-5초 후 AI 정리 결과 자동 표시 확인
4. '원본' / 'AI 정리' 탭 전환 확인
5. 클립보드 복사 확인

**시나리오 2: 네트워크 에러**
1. Webhook URL을 잘못된 주소로 설정
2. 캡처 실행
3. 원본 텍스트는 표시되는지 확인
4. 에러 메시지 표시 확인
5. "다시 시도" 버튼 작동 확인

**시나리오 3: 타임아웃**
1. n8n 워크플로우에 30초 delay 추가
2. 캡처 실행
3. 타임아웃 에러 표시 확인
4. 원본 텍스트는 사용 가능한지 확인

### 3. 성능 테스트

**측정 항목:**
- API 응답 시간 (평균, 최대, 최소)
- UI 반응성 (로딩 상태 표시까지 시간)
- 메모리 사용량
- 캐싱 효과

---

## 배포 체크리스트

### 코드 품질
- [ ] TypeScript/JSDoc 주석 완료
- [ ] console.log() 제거 또는 조건부 처리
- [ ] 에러 처리 완료
- [ ] 성능 최적화 완료

### 설정 및 보안
- [ ] Webhook URL은 사용자 설정으로 관리
- [ ] API 키는 n8n에서만 관리 (프론트엔드 노출 금지)
- [ ] HTTPS 강제 적용

### 테스트
- [ ] 모든 시나리오 테스트 통과
- [ ] Claude.ai / ChatGPT 테스트
- [ ] 다양한 네트워크 환경 테스트
- [ ] 에러 복구 시나리오 테스트

### 문서화
- [ ] README 업데이트
- [ ] Phase 2 테스트 가이드 작성
- [ ] n8n 설정 가이드 작성
- [ ] 사용자 매뉴얼 업데이트

---

## 다음 단계 (Phase 2.1 - 선택적)

### 추가 기능 (우선순위 낮음)
1. **다른 AI 모델 지원**
   - Perplexity API
   - Gemini API
   - 사용자가 Settings에서 선택

2. **캐싱 시스템**
   - 같은 텍스트 재처리 방지
   - Chrome Storage에 최근 10개 결과 캐시

3. **개인정보 자동 감지**
   - AI 기반 개인정보 필터링
   - 이메일, 전화번호, API 키 등 자동 마스킹

---

## 참고 자료

### n8n 공식 문서
- Webhook: https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.webhook/
- HTTP Request: https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.httprequest/
- Function: https://docs.n8n.io/code-examples/expressions/

### API 문서
- Claude API: https://docs.anthropic.com/en/api/getting-started
- OpenAI API: https://platform.openai.com/docs/api-reference

---

**작성일:** 2024-12-07
**버전:** v2.0.0-plan
**담당자:** Bridge Notes Dev Team
