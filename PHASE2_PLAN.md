# Bridge Notes - Phase 2 구현 계획 (4단계 AI 파이프라인 + 2개 분기점)

**시작일:** 2024-12-08
**목표:** AI 자동 정리 기능 구현 (n8n + 3개 AI API 연동)
**예상 기간:** 3-4일
**파이프라인 구조:** 4단계 + 2개 분기점 (템플릿, 어조)

---

## 📋 목차

1. [Phase 2 개요](#phase-2-개요)
2. [4단계 파이프라인 아키텍처](#4단계-파이프라인-아키텍처)
3. [프롬프트 파일 구조](#프롬프트-파일-구조)
4. [n8n 워크플로우 설계](#n8n-워크플로우-설계)
5. [확장 프로그램 수정사항](#확장-프로그램-수정사항)
6. [구현 순서](#구현-순서)
7. [테스트 계획](#테스트-계획)
8. [배포 체크리스트](#배포-체크리스트)

---

## Phase 2 개요

### 목표

캡처한 AI 대화를 **4단계 AI 파이프라인 (2개 분기점)**으로 자동 처리하여 브릿지 노트 결과물로 변환

### 핵심 철학

**"오늘의 삽질이 내일의 브릿지가 되는"** - 개인의 깨달음을 공공의 대화로 확장

### 4단계 파이프라인 구조

**구조:** 4단계 + 2개 분기점 (템플릿, 어조)
**실행 프롬프트:** 매 실행마다 4개 AI 호출 (1 → 2a or 2b → 3a → 4a or 4b)

```
대화 캡처 (Extension)
    ↓
1️⃣ Perplexity API - 깊이 있는 분석
   프롬프트: 1-perplexity-analyze.md
   대화 맥락 분석 및 핵심 포인트 파악
    ↓
    ┌─────────────────────────── 분기점 1: template ───────────────────────────┐
    ↓                                                                          ↓
2️⃣a Claude - 통찰 추출                                    2️⃣b Claude - 지식 추출
   프롬프트: 2a-claude-insight-extract.md                 프롬프트: 2b-claude-knowledge-extract.md
   개인 경험 중심 정리                                       개념/구조 중심 정리
    ↓                                                                          ↓
    └──────────────────────────────────────────────────────────────────────────┘
                                        ↓
3️⃣a Claude - 언어화
   프롬프트: 3a-claude-note-languagify-v2.md
   개인 기록 스타일로 자연스럽게 표현
                                        ↓
    ┌─────────────────────────── 분기점 2: tone ──────────────────────────────┐
    ↓                                                                          ↓
4️⃣a GPT - 친근 어조 (개인화)                           4️⃣b GPT - 정중 어조 (전문화)
   프롬프트: 4a-gpt-friendly-tone-v2.md                  프롬프트: 4b-gpt-formal-tone-v3.md
   캐주얼한 구어체                                          정중한 문어체
   일상 대화 스타일                                         전문적인 표현
    ↓                                                                          ↓
    └──────────────────────────────────────────────────────────────────────────┘
                                        ↓
                              최종 결과물 → Extension 표시
```

### 사용자 흐름

```
사용자: "범위 선택 시작" 버튼 클릭
    ↓
Extension: 대화 드래그 선택
    ↓
Extension: 대화 캡처 완료 → 원본 텍스트 즉시 표시
    ↓
사용자: 템플릿 선택 (통찰 정리 / 지식 정리)
    ↓
사용자: 어조 선택 (개인화 / 전문화)
    ↓
사용자: "재생성" 버튼 클릭 ★
    ↓
[백그라운드] n8n Webhook 호출 (4단계 파이프라인 실행)
    ↓ (10-15초)
Extension: AI 정리 결과 표시
    ↓
사용자: [옵션 1] 클립보드 복사
        [옵션 2] 템플릿/어조 변경 후 "재생성" 버튼 다시 클릭
```

**중요:**
- 템플릿 버튼 (통찰 정리 / 지식 정리): 선택만 함, API 호출 안 함
- 어조 버튼 (개인화 / 전문화): 선택만 함, API 호출 안 함
- "재생성" 버튼: 클릭 시에만 선택한 옵션으로 n8n 파이프라인 실행

---

## 4단계 파이프라인 아키텍처

### 시스템 구성도

```
┌───────────────────────────────────────────────────┐
│           Chrome Extension (Frontend)             │
│                                                    │
│  [Content Script] ──► [Side Panel]                │
│         │                   │                      │
│         │                   ├─► [원본 표시]        │
│         │                   │    (즉시)            │
│         │                   │                      │
│         │                   ├─► [AI 처리 중...]    │
│         │                   │    (10-15초)         │
│         │                   │                      │
│         │                   └─► [결과 표시]        │
│         │                        - 통찰 정리       │
│         │                        - 지식 정리       │
│         │                        - 어조: 개인화/전문화│
│         │                                          │
│         └──────► [API Service] ──────┐            │
│                      │                │            │
└──────────────────────┼────────────────┼────────────┘
                       │ HTTPS          │
                       ↓                │
              ┌─────────────────────┐  │
              │   n8n Workflow       │  │
              │  (Oracle Cloud)      │  │
              │                      │  │
              │  1. Webhook          │◄─┘
              │  2. Perplexity API   │
              │  3. Claude API (2,3) │
              │  4. Claude API (4,5) │
              │  5. GPT API (6,7)    │
              │  6. Response Format  │
              │  7. Return           │
              └─────────────────────┘
```

### 데이터 흐름

**요청 (Extension → n8n):**

```json
{
  "text": "캡처된 대화 내용 (원문)",
  "template": "insight" | "knowledge",
  "tone": "friendly" | "formal"
}
```

**응답 (n8n → Extension):**

```json
{
  "success": true,
  "pipeline": {
    "step1_analysis": "Perplexity 분석 결과 (JSON)",
    "step2_extract": "Claude 추출 결과 (JSON)",
    "step3_languagify": "Claude 언어화 결과 (JSON)",
    "step4_final": "GPT 어조 조정 최종 결과 (string)"
  },
  "result": "최종 텍스트 (사용자에게 표시될 내용)",
  "metadata": {
    "processingTime": 12.5,
    "wordsCount": 1200,
    "models": ["perplexity-sonar", "claude-3-5-sonnet", "gpt-4o-mini"]
  }
}
```

**에러 응답:**

```json
{
  "success": false,
  "error": "rate_limit" | "network" | "api_error" | "timeout",
  "message": "사용자에게 표시할 메시지",
  "failedStep": "step2_extract",
  "retryable": true
}
```

---

## 프롬프트 파일 구조

### 프롬프트 파일 목록

모든 프롬프트는 별도 저장소에서 관리 (Git에서 제외, private)

```
prompts/
├── 1-perplexity-analyze.md           # 1단계: Perplexity 분석
├── 2a-claude-insight-extract.md      # 2단계 분기: Claude 통찰 추출
├── 2b-claude-knowledge-extract.md    # 2단계 분기: Claude 지식 추출
├── 3a-claude-note-languagify-v2.md   # 3단계: Claude 언어화
├── 4a-gpt-friendly-tone-v2.md        # 4단계 분기: GPT 친근 어조 (개인화)
└── 4b-gpt-formal-tone-v3.md          # 4단계 분기: GPT 정중 어조 (전문화)
```

**파이프라인 구조:**
- 4단계 + 2개 분기점 (template, tone)
- 매 실행마다 4개 프롬프트 실행: 1 → (2a or 2b) → 3a → (4a or 4b)

**Phase 2에서 사용하는 프롬프트:** 1, 2a, 2b, 3a, 4a, 4b (6개 파일)

### 프롬프트 파일 사용 방법

**n8n 워크플로우에서 하드코딩:**

1. 각 프롬프트 파일 내용을 복사
2. n8n HTTP Request 노드의 Body에 직접 붙여넣기
3. 변수 치환: `{{conversation_text}}` → n8n 변수 `{{$json.text}}`

**장점:**
- Git에 프롬프트 노출 안 됨
- n8n에서 직접 수정 가능
- 버전 관리 용이

---

## n8n 워크플로우 설계

### 워크플로우 개요

**워크플로우 이름:** `Bridge Notes - 4-Step AI Pipeline (2 Branches)`

**Webhook URL:** `${N8N_WEBHOOK_URL}` (환경 변수로 관리)

### 노드 구성 (상세)

```
┌─────────────────────────────────────────────────────────┐
│                    n8n Workflow                          │
├─────────────────────────────────────────────────────────┤

1. [Webhook] - POST 요청 수신
   - Method: POST
   - Path: /bridge-notes
   - Response Mode: When Last Node Finishes
   - Body: JSON
      ↓

2. [Function: 요청 검증]
   - text 필드 확인
   - template, outputType, tone 기본값 설정
   - 입력 데이터 정규화
      ↓

3. [HTTP Request: Perplexity API] - 1단계
   - URL: https://api.perplexity.ai/chat/completions
   - Method: POST
   - Body:
     {
       "model": "sonar",
       "messages": [{
         "role": "user",
         "content": "[1-perplexity-analyze.md 프롬프트] + {{$json.text}}"
       }]
     }
   - Output: step1_analysis
      ↓

4. [Switch: 템플릿 분기] - 2단계 분기점
   - IF template === "insight" → 5A
   - IF template === "knowledge" → 5B
      ↓

5A. [HTTP Request: Claude Insight Extract] - 2단계-A
    - 프롬프트: 2a-claude-insight-extract.md
    - Input: {{$node["3"].json.choices[0].message.content}}
    - Output: step2_insight
       ↓
    [Merge]
       ↓

5B. [HTTP Request: Claude Knowledge Extract] - 2단계-B
    - 프롬프트: 2b-claude-knowledge-extract.md
    - Input: {{$node["3"].json.choices[0].message.content}}
    - Output: step2_knowledge
       ↓
    [Merge]
       ↓

6. [HTTP Request: Claude Note Languagify] - 3단계
    - 프롬프트: 3a-claude-note-languagify-v2.md
    - Input: {{$node["5"].json}}
    - Output: step3_note (JSON)
       ↓

7. [Function: JSON 파싱]
   - Claude 응답에서 JSON 추출
   - note_article 필드 추출
      ↓

8. [Switch: 어조 분기] - 4단계 분기점
   - IF tone === "friendly" → 9A
   - IF tone === "formal" → 9B
      ↓

9A. [HTTP Request: GPT Friendly Tone] - 4단계-A
     - 프롬프트: 4a-gpt-friendly-tone-v2.md
     - Input: {{$node["7"].json.article}}
     - Output: step4_friendly
        ↓
     [Merge]
        ↓

9B. [HTTP Request: GPT Formal Tone] - 4단계-B
     - 프롬프트: 4b-gpt-formal-tone-v3.md
     - Input: {{$node["7"].json.article}}
     - Output: step4_formal
        ↓
     [Merge]
        ↓

10. [Function: 최종 응답 포맷팅]
    - 모든 단계 결과 수집
    - 응답 JSON 생성
    - 메타데이터 추가
       ↓

11. [Respond to Webhook]
    - Status: 200
    - Body: {{$json}}
       ↓
    [완료]

└─────────────────────────────────────────────────────────┘
```

### API 설정 상세

#### Perplexity API

```javascript
// HTTP Request Node 설정
{
  "method": "POST",
  "url": "https://api.perplexity.ai/chat/completions",
  "authentication": "headerAuth",
  "headerAuth": {
    "name": "Authorization",
    "value": "Bearer {{$credentials.perplexityApi}}"
  },
  "body": {
    "model": "sonar",
    "messages": [
      {
        "role": "user",
        "content": "{{$node[\"Function: Load Prompt 1\"].json.prompt}}\n\n{{$json.text}}"
      }
    ],
    "max_tokens": 2000,
    "temperature": 0.7
  }
}
```

#### Claude API

```javascript
// HTTP Request Node 설정
{
  "method": "POST",
  "url": "https://api.anthropic.com/v1/messages",
  "authentication": "headerAuth",
  "headerAuth": {
    "name": "x-api-key",
    "value": "{{$credentials.claudeApi}}",
    "anthropic-version": "2023-06-01"
  },
  "body": {
    "model": "claude-3-5-sonnet-20241022",
    "max_tokens": 2000,
    "messages": [
      {
        "role": "user",
        "content": "{{$node[\"Function: Load Prompt\"].json.prompt}}\n\n{{$json.analysis}}"
      }
    ],
    "temperature": 0.7
  }
}
```

#### OpenAI (ChatGPT) API

```javascript
// HTTP Request Node 설정
{
  "method": "POST",
  "url": "https://api.openai.com/v1/chat/completions",
  "authentication": "headerAuth",
  "headerAuth": {
    "name": "Authorization",
    "value": "Bearer {{$credentials.openaiApi}}"
  },
  "body": {
    "model": "gpt-4o-mini",
    "messages": [
      {
        "role": "user",
        "content": "{{$node[\"Function: Load Prompt\"].json.prompt}}\n\n{{$json.article}}"
      }
    ],
    "max_tokens": 1500,
    "temperature": 0.5
  }
}
```

### Function 노드 예시

#### Function: 요청 검증

```javascript
// 입력 데이터 검증 및 기본값 설정
const input = $input.item.json;

// 필수 필드 확인
if (!input.text || input.text.trim() === '') {
  throw new Error('text 필드가 비어있습니다');
}

// 기본값 설정
const validated = {
  text: input.text.trim(),
  template: input.template || 'insight', // insight | knowledge
  tone: input.tone || 'friendly' // friendly | formal
};

return {
  json: validated
};
```

#### Function: JSON 파싱

```javascript
// Claude 응답에서 JSON 추출
const claudeResponse = $input.item.json.content[0].text;

// JSON 블록 추출 (```json ... ```)
const jsonMatch = claudeResponse.match(/```json\n([\s\S]*?)\n```/);

if (!jsonMatch) {
  // JSON 블록이 없으면 전체 응답을 JSON으로 파싱 시도
  try {
    const parsed = JSON.parse(claudeResponse);
    return { json: parsed };
  } catch (e) {
    throw new Error('Claude 응답을 JSON으로 파싱할 수 없습니다');
  }
}

const parsed = JSON.parse(jsonMatch[1]);

// note_article 추출
const article = parsed.note_article;

if (!article) {
  throw new Error('note_article 필드가 없습니다');
}

return {
  json: {
    article: article,
    title: parsed.note_title,
    summary: parsed.note_summary,
    fullData: parsed
  }
};
```

#### Function: 최종 응답 포맷팅

```javascript
// 모든 단계 결과 수집
const startTime = new Date($node["Webhook"].json.executionStartedAt);
const endTime = new Date();
const processingTime = (endTime - startTime) / 1000; // 초 단위

const finalText = $input.item.json.choices[0].message.content;

const response = {
  success: true,
  pipeline: {
    step1_analysis: $node["HTTP Request: Perplexity"].json.choices[0].message.content,
    step2_extract: $node["HTTP Request: Claude Extract"].json.content[0].text,
    step3_languagify: $node["Function: JSON Parse"].json.fullData,
    step4_final: finalText
  },
  result: finalText,
  metadata: {
    processingTime: Math.round(processingTime * 10) / 10,
    wordsCount: finalText.length,
    models: [
      "perplexity-sonar",
      "claude-3-5-sonnet-20241022",
      "gpt-4o-mini"
    ],
    template: $node["Function: Validate"].json.template,
    tone: $node["Function: Validate"].json.tone
  }
};

return { json: response };
```

---

## 확장 프로그램 수정사항

### 1. API Service 생성

**파일:** `bridge_notes_front/scripts/services/APIService.js`

```javascript
/**
 * API Service - n8n Webhook 통신 담당
 * 4단계 AI 파이프라인 (2개 분기점) 호출
 */
export class APIService {
  constructor() {
    // 환경 변수 또는 설정에서 로드
    this.webhookUrl = process.env.N8N_WEBHOOK_URL || settings.webhookUrl;
    this.timeout = 60000; // 60초 (4단계 파이프라인 고려)
    this.maxRetries = 2;
  }

  /**
   * 4단계 AI 파이프라인 실행 (2개 분기점)
   * @param {Object} options
   * @param {string} options.text - 캡처된 대화 원문
   * @param {string} options.template - "insight" | "knowledge" (2단계 분기)
   * @param {string} options.tone - "friendly" | "formal" (4단계 분기)
   */
  async processFullPipeline({ text, template, tone }) {
    const requestBody = {
      text,
      template: template || 'insight',
      tone: tone || 'friendly'
    };

    // 재시도 로직
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
          if (response.status >= 500 && attempt < this.maxRetries) {
            await this.delay(2000 * attempt);
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
          pipeline: data.pipeline,
          metadata: data.metadata
        };

      } catch (error) {
        if (error.name === 'AbortError') {
          if (attempt < this.maxRetries) {
            await this.delay(2000 * attempt);
            continue;
          }
          throw new Error('요청 시간 초과 (60초)');
        }

        if (attempt === this.maxRetries) {
          throw error;
        }

        await this.delay(2000 * attempt);
      }
    }
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
```

### 2. ResultArea 수정사항

**파일:** `bridge_notes_front/scripts/components/ResultArea.js`

**주요 변경사항:**

1. **템플릿 탭 구조 유지**
   - "통찰 정리" / "지식 정리" 탭 유지
   - 탭 클릭 시 선택만 함 (API 호출 안 함)

2. **어조 버튼 구조 유지**
   - "개인화" / "전문화" 버튼
   - 버튼 클릭 시 선택만 함 (API 호출 안 함)

3. **"재생성" 버튼 추가**
   - 사용자가 템플릿/어조 선택 후 "재생성" 버튼 클릭
   - 버튼 클릭 시에만 n8n 파이프라인 실행

4. **show() 메서드 수정**

```javascript
async show(capturedText, source = 'capture') {
  // 원본 표시
  this.originalText = capturedText;
  this.originalTextarea.value = capturedText;

  // 탭 활성화
  this.activateTab('original');
  this.resultContainer.classList.remove('hidden');

  // ★ 변경: 자동 AI 처리 제거, 사용자가 "재생성" 버튼 클릭 시에만 실행
}
```

5. **onRegenerateButtonClick() 메서드 구현 (신규)**

```javascript
async onRegenerateButtonClick() {
  // 현재 선택된 템플릿과 어조로 AI 처리 시작
  await this.processWithAI();
}
```

6. **processWithAI() 메서드 구현**

```javascript
async processWithAI() {
  try {
    // 로딩 표시
    this.showLoading('AI가 대화를 분석하고 정리하는 중... (10-15초)');

    // 현재 선택된 템플릿과 어조 가져오기
    const template = this.currentTemplate || 'insight'; // 'insight' | 'knowledge'
    const tone = this.currentTone || 'friendly'; // 'friendly' | 'formal'

    // 4단계 파이프라인 실행
    const result = await this.apiService.processFullPipeline({
      text: this.originalText,
      template: template,
      tone: tone
    });

    // 결과 저장 및 표시
    this.processedText = result.result;
    this.processedTextarea.value = result.result;
    this.processingMetadata = result.metadata;

    // 로딩 숨김
    this.hideLoading();

  } catch (error) {
    this.hideLoading();
    this.errorHandler.handle(error, 'AI 처리');

    // 실패해도 원본은 사용 가능
    this.toast.warning('AI 정리에 실패했지만 원본은 사용 가능합니다');
  }
}
```

7. **템플릿 탭 클릭 - 선택만 함**

```javascript
onTemplateTabClick(template) {
  this.currentTemplate = template; // 'insight' | 'knowledge'

  // 탭 UI 업데이트
  this.updateTemplateTabUI(template);

  // ★ 변경: API 호출 안 함, 선택만 함
  // 사용자가 "재생성" 버튼을 클릭할 때 processWithAI() 실행
}
```

8. **어조 버튼 클릭 - 선택만 함**

```javascript
onToneButtonClick(tone) {
  this.currentTone = tone; // 'friendly' | 'formal'

  // 버튼 상태 업데이트
  this.updateToneButtons(tone);

  // ★ 변경: API 호출 안 함, 선택만 함
  // 사용자가 "재생성" 버튼을 클릭할 때 processWithAI() 실행
}
```

### 3. Settings 수정사항

**파일:** `bridge_notes_front/scripts/components/Settings.js`

**변경사항:**
- Webhook URL 입력 필드 제거 (하드코딩)
- 사용자 API 키 입력 필드는 유지 (Standard100+ 플랜용, 향후 기능)

**HTML (sidepanel.html):**

고급 설정의 API 입력 필드는 그대로 유지하지만, 현재는 사용하지 않음.

```html
<!-- 고급 설정: 사용자 API 키 (Standard100+ 전용) -->
<div class="settings-card">
  <div class="settings-card-title">🔑 사용자 API 키 (향후 기능)</div>
  <p class="api-settings-description">
    🔒 API 키는 서버에 AES-256-GCM으로 암호화되어 안전하게 저장됩니다.
  </p>

  <div class="setting-group">
    <label for="processApiUrl">입력 AI 모델 API 키</label>
    <input
      type="password"
      id="processApiUrl"
      class="settings-input"
      placeholder="sk-ant-... 또는 sk-..."
      disabled
    />
    <p class="setting-description">Standard100+ 플랜에서 사용 가능</p>
  </div>

  <div class="setting-group">
    <label for="finalApiUrl">출력 AI 모델 API 키</label>
    <input
      type="password"
      id="finalApiUrl"
      class="settings-input"
      placeholder="sk-ant-... 또는 sk-..."
      disabled
    />
    <p class="setting-description">Standard100+ 플랜에서 사용 가능</p>
  </div>
</div>
```

---

## 구현 순서

### Day 1: n8n 워크플로우 구축 (6-8시간)

#### 오전 (3-4시간)

- [ ] n8n 접속 확인 (Oracle Cloud)
- [ ] 새 워크플로우 생성: "Bridge Notes - 4-Step AI Pipeline (2 Branches)"
- [ ] Webhook 노드 추가 및 URL 확인
- [ ] Function: 요청 검증 노드 추가
- [ ] Postman으로 Webhook 테스트 (mock 데이터)

#### 오후 (3-4시간)

- [ ] Perplexity API Credential 추가
- [ ] HTTP Request: Perplexity API 노드 구성
- [ ] 1-perplexity-analyze.md 프롬프트 복사/붙여넣기
- [ ] 변수 치환 (`{{conversation_text}}` → `{{$json.text}}`)
- [ ] Postman으로 Perplexity 단계 테스트

### Day 2: Claude & GPT API 연동 (6-8시간)

#### 오전 (3-4시간)

- [ ] Claude API Credential 추가
- [ ] HTTP Request: Claude Insight Extract 노드 (프롬프트 2a)
- [ ] HTTP Request: Claude Knowledge Extract 노드 (프롬프트 2b)
- [ ] Switch 노드로 템플릿 분기 구현 (2단계 분기점)
- [ ] HTTP Request: Claude Note Languagify 노드 (프롬프트 3a)

#### 오후 (3-4시간)

- [ ] OpenAI API Credential 추가
- [ ] HTTP Request: GPT Friendly Tone 노드 (프롬프트 4a)
- [ ] HTTP Request: GPT Formal Tone 노드 (프롬프트 4b)
- [ ] Switch 노드로 어조 분기 구현 (4단계 분기점)
- [ ] Function: JSON 파싱 노드
- [ ] Function: 최종 응답 포맷팅 노드
- [ ] Respond to Webhook 노드
- [ ] 전체 워크플로우 통합 테스트

### Day 3: Extension 수정 및 통합 테스트 (6-8시간)

#### 오전 (3-4시간)

- [ ] APIService.js 생성 및 구현
- [ ] ResultArea.js에 APIService 연동
- [ ] show() 메서드 수정 (자동 AI 처리)
- [ ] processWithAI() 메서드 구현
- [ ] 로딩 상태 UI 개선

#### 오후 (3-4시간)

- [ ] 템플릿 탭 전환 로직 구현
- [ ] 어조 버튼 클릭 로직 구현
- [ ] 에러 처리 및 재시도 UI
- [ ] 전체 플로우 통합 테스트
- [ ] Claude.ai / ChatGPT에서 실제 캡처 테스트

### Day 4: 최적화 및 배포 준비 (선택적)

- [ ] 성능 최적화 (타임아웃, 재시도 로직)
- [ ] 에러 시나리오 전체 테스트
- [ ] UI/UX 개선 (로딩 메시지, 진행 상황 표시)
- [ ] 문서화 업데이트
- [ ] 버전 업데이트 (manifest.json: v1.1.0)

---

## 테스트 계획

### 1. n8n 워크플로우 단위 테스트

**Postman 테스트 케이스:**

```bash
### Test 1: 통찰 정리 + 노트 + 친근
POST ${N8N_WEBHOOK_URL}
Content-Type: application/json

{
  "text": "사용자: TypeScript 배우려고 하는데 어디서부터 시작하면 좋을까요?\n\nClaude: TypeScript는 JavaScript의 상위 집합이므로, 먼저 JavaScript 기초를 다지는 것이 중요합니다. 이미 JavaScript를 다룰 수 있다면, TypeScript의 타입 시스템부터 시작하세요...",
  "template": "insight",
  "outputType": "note",
  "tone": "friendly"
}

### 예상 응답 시간: 10-15초
### 예상 응답:
{
  "success": true,
  "result": "어어, 그런데 말이야. TypeScript 배우려고 하는데 처음엔 막막하더라고...",
  "metadata": {
    "processingTime": 12.3,
    "wordsCount": 1200,
    "models": ["perplexity-sonar", "claude-3-5-sonnet-20241022", "gpt-4o-mini"]
  }
}
```

```bash
### Test 2: 지식 정리 + 페이지 + 정중
POST ${N8N_WEBHOOK_URL}
Content-Type: application/json

{
  "text": "사용자: API Rate Limit 처리는 어떻게 하는게 좋을까요?\n\nClaude: Rate Limit 처리에는 여러 전략이 있습니다...",
  "template": "knowledge",
  "outputType": "page",
  "tone": "formal"
}
```

### 2. Extension 통합 테스트

**시나리오 1: 정상 플로우 (통찰 + 개인화)**

1. Claude.ai에서 대화 진행
2. "범위 선택 시작" 버튼 클릭
3. 대화 영역 드래그하여 캡처
4. 원본 텍스트 즉시 표시 확인 ✓
5. "통찰 정리" 탭 선택됨 확인 ✓
6. 10-15초 후 AI 정리 결과 자동 표시 확인 ✓
7. "개인화" 버튼 클릭
8. 어조 조정된 최종본 표시 확인 ✓
9. 클립보드 복사 확인 ✓

**시나리오 2: 템플릿 전환 (지식 정리)**

1. 대화 캡처 완료
2. "지식 정리" 탭 클릭
3. AI 재처리 시작 확인 (로딩)
4. 지식 정리 결과 표시 확인
5. "전문화" 어조 선택
6. 최종본 확인

**시나리오 3: 네트워크 에러**

1. n8n 서버 중지 (또는 URL 변경)
2. 대화 캡처
3. 원본은 표시되는지 확인 ✓
4. 에러 메시지 표시 확인 ✓
5. "원본은 사용 가능합니다" 토스트 확인 ✓

**시나리오 4: 타임아웃**

1. n8n 워크플로우에 60초 delay 추가
2. 캡처 실행
3. 타임아웃 에러 표시 확인
4. 원본 텍스트는 사용 가능한지 확인

### 3. 성능 테스트

**측정 항목:**

- 전체 파이프라인 실행 시간: 목표 10-15초
- Perplexity 단계: 3-5초
- Claude 추출 단계: 2-3초
- Claude 언어화 단계: 3-5초
- GPT 어조 단계: 2-3초
- 네트워크 오버헤드: 1-2초

**부하 테스트:**

- 동시 요청 3개 처리 가능 여부
- Rate Limit 도달 시 에러 처리 확인

---

## 배포 체크리스트

### n8n 워크플로우

- [ ] 모든 API Credential 설정 완료
- [ ] 모든 프롬프트 복사/붙여넣기 완료
- [ ] 변수 치환 확인 ({{}} 문법)
- [ ] 에러 처리 노드 추가
- [ ] Webhook URL 환경 변수 설정 확인 (`${N8N_WEBHOOK_URL}`)
- [ ] 워크플로우 활성화 (Active)

### Extension 코드

- [ ] APIService.js 구현 완료
- [ ] ResultArea.js 수정 완료
- [ ] Settings.js 수정 완료
- [ ] 에러 처리 완료
- [ ] console.log() 제거 또는 조건부 처리
- [ ] JSDoc 주석 완료

### 테스트

- [ ] n8n 워크플로우 단위 테스트 통과
- [ ] Extension 통합 테스트 통과
- [ ] 에러 시나리오 테스트 통과
- [ ] Claude.ai / ChatGPT 실제 캡처 테스트
- [ ] 성능 테스트 통과 (10-15초)

### 문서화

- [ ] PHASE2_PLAN.md 업데이트
- [ ] n8n 워크플로우 설정 가이드 작성
- [ ] 프롬프트 파일 관리 가이드 작성
- [ ] README.md 업데이트

### 버전 관리

- [ ] manifest.json 버전 업데이트 (v1.1.0)
- [ ] CHANGELOG.md 작성
- [ ] Git commit 및 tag 생성

---

## 비용 예측

### API 사용 비용 (월 100회 기준)

**Perplexity API:**
- 모델: sonar
- 평균 입력: 500 tokens
- 평균 출력: 1000 tokens
- 예상 비용: $1.00/월

**Claude API:**
- 모델: claude-3-5-sonnet-20241022
- 단계: 추출 (2 또는 3) + 언어화 (4 또는 5) = 2단계
- 평균 입력: 1000 tokens/단계
- 평균 출력: 1500 tokens/단계
- 예상 비용: $2.00/월

**ChatGPT API:**
- 모델: gpt-4o-mini
- 평균 입력: 1200 tokens
- 평균 출력: 1500 tokens
- 예상 비용: $0.30/월

**총 예상 비용: ~$3.30/월 (100회)**
**1회당 비용: ~$0.033**

---

## 다음 단계 (Phase 2.1 - 선택적)

### 추가 기능 (우선순위 낮음)

1. **사용자 API 키 지원 (Standard100+ 플랜)**
   - Settings에서 사용자 API 키 입력
   - n8n에서 사용자 API 키로 요청
   - 서버에 AES-256-GCM 암호화 저장

2. **캐싱 시스템**
   - 같은 텍스트 재처리 방지
   - Chrome Storage에 최근 10개 결과 캐시
   - 캐시 히트 시 즉시 응답 (< 1초)

3. **진행 상황 표시**
   - "1/7 단계: Perplexity 분석 중..."
   - "2/7 단계: Claude 통찰 추출 중..."
   - 각 단계별 진행 바

4. **결과 비교 뷰**
   - 통찰 정리 vs 지식 정리 나란히 표시
   - 개인화 vs 전문화 비교

---

## 참고 자료

### 프롬프트 파일

- 별도 저장소에서 프롬프트 관리 (Git 제외, private)
- 6개 프롬프트 파일 (1, 2a, 2b, 3a, 4a, 4b)

### API 문서

- Perplexity API: https://docs.perplexity.ai/
- Claude API: https://docs.anthropic.com/en/api/getting-started
- OpenAI API: https://platform.openai.com/docs/api-reference

### n8n 문서

- Webhook: https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.webhook/
- HTTP Request: https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.httprequest/
- Function: https://docs.n8n.io/code-examples/expressions/

---

**작성일:** 2024-12-08
**버전:** v2.0.0-실제구현
**담당자:** Bridge Notes Dev Team
