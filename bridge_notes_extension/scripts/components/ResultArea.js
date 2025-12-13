/**
 * ResultArea Component
 * 모든 UI를 항상 표시하고 disabled 속성으로 제어
 */
import { i18n } from '../i18n/i18n.js';

export class ResultArea {
  constructor(toast = null, errorHandler = null, settings = null, apiService = null, cacheService = null, historyService = null) {
    // 기존 요소들
    this.resultArea = document.getElementById("resultArea");
    this.emptyState = document.getElementById("emptyState");
    this.resultContent = document.getElementById("resultContent");
    this.originalText = document.getElementById("originalText");
    this.resultText = document.getElementById("resultText");
    this.loadingState = document.getElementById("loadingState");
    // 템플릿 탭 제거됨
    // this.tabButtons = document.querySelectorAll(".tab-button");

    // 새로 추가된 요소들
    this.copyOriginalBtn = document.getElementById("copyOriginalBtn");
    this.toneSelection = document.getElementById("toneSelection");
    this.toneButtons = document.querySelectorAll(".tone-btn");
    this.copyBtn = document.getElementById("copyResultBtn");
    this.regenerateBtn = document.getElementById("regenerateBtn");

    this.toast = toast;
    this.errorHandler = errorHandler;
    this.settings = settings;
    this.apiService = apiService; // Phase 2: API Service for n8n integration
    this.cacheService = cacheService; // Cache Service for result caching
    this.historyService = historyService; // History Service for note history

    // 워크플로우 상태
    this.currentStep = 0; // 0: empty, 1: text+template, 2: result+tone, 3: final
    this.capturedText = "";
    this.selectedTemplate = "insight"; // 템플릿 고정: 'insight'
    this.processedText = "";
    this.selectedTone = "";
    this.finalText = "";
    this.step3Result = ""; // Step 3 (Claude Draft) 결과 캐싱

    // Phase 2: n8n Webhook 하드코딩되어 있으므로 Mock 모드 비활성화
    this.useMockData = false;

    this.init();
  }

  init() {
    // 원문 복사 버튼
    if (this.copyOriginalBtn) {
      this.copyOriginalBtn.addEventListener("click", () => {
        this.copyOriginalText();
      });
    }

    // 템플릿 탭 제거됨 - 'insight'로 고정

    // 메인 화면 어조 버튼 클릭 이벤트
    const emptyToneButtons = document.querySelectorAll('.empty-tone-btn');
    emptyToneButtons.forEach((btn) => {
      btn.addEventListener("click", () => {
        const tone = btn.getAttribute("data-tone");
        this.selectToneOnEmpty(tone);
      });
    });

    // 어조 버튼 클릭 이벤트 (결과 화면)
    this.toneButtons.forEach((btn) => {
      btn.addEventListener("click", () => {
        const tone = btn.getAttribute("data-tone");
        this.selectTone(tone);
      });
    });

    // 복사 버튼 클릭 이벤트 (AI 정리 결과 복사)
    if (this.copyBtn) {
      this.copyBtn.addEventListener("click", () => {
        this.copyResultText();
      });
    }

    // 원본 복사 버튼 클릭 이벤트
    if (this.copyOriginalBtn) {
      this.copyOriginalBtn.addEventListener("click", () => {
        this.copyOriginalText();
      });
    }

    // 히스토리 항목 선택 이벤트 리스너
    document.addEventListener('historyItemSelected', (e) => {
      this.loadFromHistory(e.detail);
    });

    // 재생성 버튼 클릭 이벤트
    if (this.regenerateBtn) {
      this.regenerateBtn.addEventListener("click", () => {
        this.regenerate();
      });
    }

    // Textarea 변경 감지
    if (this.resultText) {
      this.resultText.addEventListener("input", (e) => {
        if (this.currentStep === 3) {
          this.finalText = e.target.value;
        }
      });
    }
  }

  /**
   * Step 1: 캡처된 텍스트 표시 및 자동 처리 시작
   */
  async show(text) {
    this.capturedText = text;
    this.currentStep = 1;

    // 빈 상태 숨김
    if (this.emptyState) {
      this.emptyState.style.display = "none";
    }

    // 결과 콘텐츠 표시
    if (this.resultContent) {
      this.resultContent.style.display = "block";
    }

    // 원문 표시
    if (this.originalText) {
      this.originalText.textContent = text;
    }

    // 원본 복사 버튼 활성화
    if (this.copyOriginalBtn) {
      this.copyOriginalBtn.disabled = false;
    }

    // 결과 영역 초기화
    if (this.resultText) {
      this.resultText.value = "";
      this.resultText.disabled = true; // 비활성화
    }

    // 어조 버튼 비활성화
    this.toneButtons.forEach((btn) => {
      btn.disabled = true;
      btn.classList.remove("selected");
    });

    // 버튼 상태 초기화
    if (this.copyBtn) this.copyBtn.disabled = true;

    // 템플릿은 'insight'로 고정
    this.selectedTemplate = "insight";

    await this.delay(300);

    // AI 정리 기능 사용 여부 확인
    if (this.settings && this.settings.currentSettings.useAiProcessing === false) {
      // AI 처리 없이 원본만 표시
      this.showCaptureOnly();
    } else {
      // AI 처리 실행
      await this.processWithAI();
    }
  }

  /**
   * AI 처리 없이 캡처만 표시
   */
  showCaptureOnly() {
    console.log("AI 처리 비활성화 - 원본만 표시");

    // 로딩 숨김
    this.hideLoading();

    // 결과 영역 숨김
    if (this.resultText) {
      this.resultText.style.display = "none";
    }
    if (this.toneSelection) {
      this.toneSelection.style.display = "none";
    }
    if (this.copyBtn) {
      this.copyBtn.style.display = "none";
    }
    if (this.regenerateBtn) {
      this.regenerateBtn.style.display = "none";
    }

    // 구분선 및 액션 버튼 영역 숨김
    const dividers = document.querySelectorAll('.divider');
    if (dividers.length > 0) {
      dividers[0].style.display = "none"; // 첫 번째 구분선 숨김
    }

    const resultActions = document.querySelector('.result-actions');
    if (resultActions) {
      resultActions.style.display = "none";
    }

    if (this.toast) {
      this.toast.info(i18n.t("toast.captureCompleteNoAI"));
    }
  }

  /**
   * 원문 복사
   */
  async copyOriginalText() {
    try {
      if (!this.capturedText) {
        if (this.toast) {
          this.toast.error(i18n.t("toast.noOriginalText"));
        }
        return;
      }

      await navigator.clipboard.writeText(this.capturedText);

      if (this.toast) {
        this.toast.success(i18n.t("toast.originalCopied"));
      }
    } catch (error) {
      console.error("원문 복사 실패:", error);
      if (this.errorHandler) {
        this.errorHandler.handle(error, "copyOriginalText", {
          customMessage: "원문 복사에 실패했습니다",
        });
      }
    }
  }

  /**
   * AI 정리 결과 복사
   */
  async copyResultText() {
    try {
      if (!this.finalText) {
        if (this.toast) {
          this.toast.error(i18n.t("toast.noResultText"));
        }
        return;
      }

      await navigator.clipboard.writeText(this.finalText);

      if (this.toast) {
        this.toast.success(i18n.t("toast.resultCopied"));
      }
    } catch (error) {
      console.error("결과 복사 실패:", error);
      if (this.errorHandler) {
        this.errorHandler.handle(error, "copyResultText", {
          customMessage: "결과 복사에 실패했습니다",
        });
      }
    }
  }

  /**
   * 원본 텍스트 복사
   */
  async copyOriginalText() {
    try {
      if (!this.capturedText) {
        if (this.toast) {
          this.toast.error(i18n.t("toast.noOriginalText"));
        }
        return;
      }

      await navigator.clipboard.writeText(this.capturedText);

      if (this.toast) {
        this.toast.success(i18n.t("toast.originalCopied"));
      }
    } catch (error) {
      console.error("원본 복사 실패:", error);
      if (this.errorHandler) {
        this.errorHandler.handle(error, "copyOriginalText", {
          customMessage: "원본 복사에 실패했습니다",
        });
      }
    }
  }

  /**
   * 템플릿 선택 (템플릿 탭 제거로 미사용)
   */
  // switchTemplate(template) {
  //   console.log("템플릿 선택:", template);
  //   this.activateTab(template);
  //   this.selectedTemplate = template;
  // }

  /**
   * 탭 UI 활성화 (템플릿 탭 제거로 미사용)
   */
  // activateTab(template) {
  //   this.tabButtons.forEach((btn) => {
  //     if (btn.dataset.template === template) {
  //       btn.classList.add("active");
  //     } else {
  //       btn.classList.remove("active");
  //     }
  //   });
  // }

  /**
   * 전체 AI 처리 (템플릿 → 어조 적용, 최종 결과만 표시)
   */
  async processWithAI() {
    try {
      // 톤 설정 (없으면 기본값: friendly)
      if (!this.selectedTone) {
        this.selectedTone = "friendly";
      }

      // 어조 버튼 UI 업데이트
      this.toneButtons.forEach((btn) => {
        if (btn.getAttribute("data-tone") === this.selectedTone) {
          btn.classList.add("selected");
        } else {
          btn.classList.remove("selected");
        }
      });

      // 캐시 확인
      if (this.cacheService) {
        const cached = await this.cacheService.get(
          this.capturedText,
          this.selectedTemplate,
          this.selectedTone
        );

        if (cached) {
          // 캐시 히트 - 즉시 결과 표시
          this.finalText = cached.result;
          this.step3Result = cached.step3Result || "";
          this.showFinalResult();

          if (this.toast) {
            this.toast.success(i18n.t("toast.cachedResultLoaded"));
          }
          return;
        }
      }

      // 캐시 미스 - API 호출
      this.showLoading();

      // 전체 파이프라인 1번 호출 (n8n이 Step 1~4 전부 처리)
      if (this.useMockData) {
        // Mock Data 사용
        this.finalText = this.getMockFinalText(this.selectedTone);
      } else {
        // Real API 호출
        const result = await this.apiService.process({
          text: this.capturedText,
          action: "full-process", // n8n이 전체 Step 1~4 실행
          template: this.selectedTemplate,
          tone: this.selectedTone,
        });

        this.finalText = result.result;
        this.step3Result = result.step3Result || ""; // Step 3 결과 캐싱

        // 캐시에 저장
        if (this.cacheService) {
          await this.cacheService.set(
            this.capturedText,
            this.selectedTemplate,
            this.selectedTone,
            {
              result: this.finalText,
              step3Result: this.step3Result,
              metadata: result.metadata
            }
          );
        }
      }

      // 최종 결과만 표시
      this.showFinalResult();
    } catch (error) {
      this.hideLoading();

      // API 에러 발생 시 원본은 여전히 사용 가능
      if (this.toast) {
        this.toast.warning(i18n.t("toast.aiFailedOriginalAvailable"));
      }

      if (this.errorHandler) {
        this.errorHandler.handle(error, "processWithAI", {
          customMessage: "AI 자동 정리 실패",
        });
      }
    }
  }

  /**
   * 최종 결과만 표시 (processedText는 표시하지 않음)
   */
  async showFinalResult() {
    console.log("최종 결과 표시");
    this.currentStep = 3;

    // 로딩 숨김
    this.hideLoading();

    // 최종 결과 텍스트 표시 (수정 가능)
    if (this.resultText) {
      this.resultText.value = this.finalText;
      this.resultText.disabled = false; // 수정 가능
    }

    // 템플릿 탭 제거됨

    // 어조 버튼 활성화 유지 (재생성용)
    this.toneButtons.forEach((btn) => {
      btn.disabled = false;
    });

    // 복사 버튼 활성화
    if (this.copyBtn) {
      this.copyBtn.disabled = false;
    }

    // 자동 복사는 Chrome 정책상 불가 (Document is not focused)
    // 사용자가 수동으로 복사 버튼 클릭 시, 설정의 copyTarget에 따라 복사됨

    // 히스토리에 저장
    await this.saveToHistory();
  }

  /**
   * 히스토리에 결과 저장
   */
  async saveToHistory() {
    if (!this.historyService) return;

    try {
      await this.historyService.addToHistory({
        originalText: this.capturedText,
        processedText: this.finalText,
        template: this.selectedTemplate,
        tone: this.selectedTone,
        metadata: {
          step3Result: this.step3Result
        }
      });

      // 히스토리 새로고침 이벤트 발생
      const event = new CustomEvent('historyUpdated');
      document.dispatchEvent(event);

      console.log('Saved to history');
    } catch (error) {
      console.error('Failed to save to history:', error);
      // 히스토리 저장 실패는 치명적이지 않으므로 에러 표시 안 함
    }
  }

  /**
   * 어조 선택 (선택만 하고 자동 실행하지 않음)
   */
  selectTone(tone) {
    console.log("어조 선택:", tone);
    this.selectedTone = tone;

    // UI 버튼 선택 상태 업데이트
    this.toneButtons.forEach((btn) => {
      if (btn.getAttribute("data-tone") === tone) {
        btn.classList.add("selected");
      } else {
        btn.classList.remove("selected");
      }
    });

    // 재생성 버튼을 눌러야 실행됨
  }

  /**
   * 메인 화면에서 어조 선택
   */
  selectToneOnEmpty(tone) {
    console.log("메인 화면 어조 선택:", tone);

    // 선택된 어조 저장
    this.selectedTone = tone;

    // UI 업데이트 (active 클래스 토글)
    const emptyToneButtons = document.querySelectorAll('.empty-tone-btn');
    emptyToneButtons.forEach((btn) => {
      if (btn.getAttribute("data-tone") === tone) {
        btn.classList.add("active");
      } else {
        btn.classList.remove("active");
      }
    });
  }

  /**
   * 재생성: 선택된 톤으로 결과 재생성 (Step 4만 실행)
   */
  async regenerate() {
    // 톤이 선택되었는지 확인
    if (!this.selectedTone) {
      if (this.toast) {
        this.toast.error(i18n.t("toast.selectTone"));
      }
      return;
    }

    // Step 3 결과가 없으면 전체 처리
    if (!this.step3Result) {
      await this.processWithAI();
      return;
    }

    this.showLoading("어조를 조정하고 있습니다...");

    try {
      // Step 4만 실행 (tone-adjust-only)
      const result = await this.apiService.process({
        text: this.step3Result, // 하위 호환용 (폴백)
        step3Result: this.step3Result, // 명시적으로 Step 3 결과 전달
        action: "tone-adjust-only", // Step 4만 실행
        tone: this.selectedTone,
      });

      this.finalText = result.result;
      this.showFinalResult();
    } catch (error) {
      this.hideLoading();

      if (this.toast) {
        this.toast.warning(i18n.t("toast.toneAdjustFailed"));
      }

      if (this.errorHandler) {
        this.errorHandler.handle(error, "regenerate", {
          customMessage: "어조 조정 실패",
        });
      }
    }
  }

  /**
   * 로딩 표시
   */
  showLoading() {
    if (this.loadingState) {
      this.loadingState.style.display = "flex";
    }
    if (this.resultText) {
      this.resultText.style.display = "none";
    }
  }

  /**
   * 로딩 숨김
   */
  hideLoading() {
    if (this.loadingState) {
      this.loadingState.style.display = "none";
    }
    if (this.resultText) {
      this.resultText.style.display = "block";
    }
  }

  /**
   * 빈 상태 표시
   */
  showEmpty() {
    this.restart();
  }

  /**
   * Delay 유틸리티
   */
  delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Mock 처리된 텍스트 (n8n API로 교체 예정)
   */
  getMockProcessedText(template) {
    const templates = {
      insight: `📌 핵심 인사이트

• AI와 인간의 협업은 단순한 자동화를 넘어선 창의적 파트너십을 의미합니다
• 효과적인 프롬프트 엔지니어링은 구체적인 맥락과 명확한 목표 설정이 핵심입니다
• AI 도구의 한계를 이해하고 인간의 판단력을 결합하는 것이 중요합니다

💡 실행 가능한 액션 아이템
1. 프롬프트 작성 시 구체적인 역할과 맥락 제공하기
2. AI 결과물을 비판적으로 검토하고 개선하기
3. 반복적인 작업을 자동화하여 창의적 작업에 집중하기`,

      knowledge: `📚 체계적 지식 정리

## 주요 개념
- **프롬프트 엔지니어링**: AI와 효과적으로 소통하기 위한 질문 및 지시 설계 기법
- **맥락 제공**: AI가 더 정확한 답변을 생성하도록 배경 정보 전달
- **반복적 개선**: AI 응답을 검토하고 프롬프트를 조정하는 과정

## 핵심 원칙
1. 명확성: 모호하지 않은 구체적 지시
2. 맥락성: 충분한 배경 정보 제공
3. 단계성: 복잡한 작업을 작은 단계로 분해

## 실무 적용
- 문서 작성, 코드 생성, 아이디어 발전 등 다양한 분야에 활용 가능
- 인간의 창의성과 AI의 처리 능력을 결합한 하이브리드 접근`,
    };

    return templates[template] || "정리된 내용이 여기에 표시됩니다.";
  }

  /**
   * Mock 최종 텍스트 (n8n API로 교체 예정)
   */
  getMockFinalText(tone) {
    if (tone === "friendly") {
      return `안녕하세요! 😊

${this.processedText}

이 내용이 도움이 되셨으면 좋겠어요!
더 궁금하신 점이 있으시면 언제든지 말씀해 주세요~`;
    } else {
      return `안녕하십니까.

${this.processedText}

상기 내용이 귀하께 도움이 되기를 바랍니다.
추가적인 문의사항이 있으시면 언제든지 연락 주시기 바랍니다.

감사합니다.`;
    }
  }

  /**
   * 히스토리에서 항목 불러오기
   * @param {Object} item - 히스토리 항목
   */
  loadFromHistory(item) {
    console.log('Loading from history:', item);

    // 상태 복원
    this.capturedText = item.originalText;
    this.finalText = item.processedText;
    this.selectedTemplate = item.template || 'insight';
    this.selectedTone = item.tone || 'friendly';
    this.step3Result = item.metadata?.step3Result || '';
    this.currentStep = 3;

    // 빈 상태 숨기기
    if (this.emptyState) {
      this.emptyState.style.display = 'none';
    }
    if (this.resultContent) {
      this.resultContent.style.display = 'block';
    }

    // 원본 텍스트 표시 (textContent 사용)
    if (this.originalText) {
      this.originalText.textContent = this.capturedText;
    }

    // 최종 결과 텍스트 표시
    if (this.resultText) {
      this.resultText.value = this.finalText;
      this.resultText.disabled = false;
    }

    // 어조 버튼 상태 업데이트
    this.toneButtons.forEach((btn) => {
      const tone = btn.getAttribute('data-tone');
      if (tone === this.selectedTone) {
        btn.classList.add('selected');
      } else {
        btn.classList.remove('selected');
      }
      btn.disabled = false;
    });

    // 복사 버튼 활성화
    if (this.copyBtn) {
      this.copyBtn.disabled = false;
    }
    if (this.copyOriginalBtn) {
      this.copyOriginalBtn.disabled = false;
    }

    if (this.toast) {
      this.toast.success(i18n.t('toast.historyLoaded'));
    }
  }
}
