/**
 * ResultArea Component
 * 모든 UI를 항상 표시하고 disabled 속성으로 제어
 */
export class ResultArea {
  constructor(toast = null, errorHandler = null, settings = null, apiService = null) {
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

    // 워크플로우 상태
    this.currentStep = 0; // 0: empty, 1: text+template, 2: result+tone, 3: final
    this.capturedText = "";
    this.selectedTemplate = "insight"; // 템플릿 고정: 'insight'
    this.processedText = "";
    this.selectedTone = "";
    this.finalText = "";

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

    // 어조 버튼 클릭 이벤트
    this.toneButtons.forEach((btn) => {
      btn.addEventListener("click", () => {
        const tone = btn.getAttribute("data-tone");
        this.selectTone(tone);
      });
    });

    // 복사 버튼 클릭 이벤트
    if (this.copyBtn) {
      this.copyBtn.addEventListener("click", () => {
        this.copyToClipboard();
      });
    }

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
    console.log("ResultArea.show() - Step 1 시작");
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
    console.log("템플릿 고정: insight - 자동 AI 처리 시작");

    await this.delay(300); // 짧은 지연
    await this.processWithAI();
  }

  /**
   * 원문 복사
   */
  async copyOriginalText() {
    try {
      if (!this.capturedText) {
        if (this.toast) {
          this.toast.error("복사할 원문이 없습니다");
        }
        return;
      }

      await navigator.clipboard.writeText(this.capturedText);

      if (this.toast) {
        this.toast.success("원문이 클립보드에 복사되었습니다!");
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
    console.log("AI 처리 시작 - 최종 결과 생성까지 자동 진행");

    // 로딩 표시
    this.showLoading("AI가 내용을 정리하고 있습니다...");

    try {
      // 톤 설정 (없으면 기본값 사용)
      if (!this.selectedTone) {
        const defaultTone = this.settings?.getSetting("defaultTone") || "friendly";
        this.selectedTone = defaultTone;
      }

      // 어조 버튼 UI 업데이트
      this.toneButtons.forEach((btn) => {
        if (btn.getAttribute("data-tone") === this.selectedTone) {
          btn.classList.add("selected");
        } else {
          btn.classList.remove("selected");
        }
      });

      // 전체 파이프라인 1번 호출 (n8n이 Step 1~4 전부 처리)
      if (this.useMockData) {
        // Mock Data 사용
        console.log("[Mock Mode] Using mock data for full pipeline");
        await this.delay(3000); // 전체 처리 시뮬레이션
        this.finalText = this.getMockFinalText(this.selectedTone);
      } else {
        // Real API 호출 - 1번에 모든 Step 처리
        console.log("[API Mode] Calling n8n webhook for full pipeline (Step 1-4)");
        const result = await this.apiService.process({
          text: this.capturedText,
          action: "full-process", // n8n이 전체 Step 1~4 실행
          template: this.selectedTemplate,
          tone: this.selectedTone,
        });
        this.finalText = result.result;
      }

      // 최종 결과만 표시
      this.showFinalResult();
    } catch (error) {
      this.hideLoading();

      // API 에러 발생 시 원본은 여전히 사용 가능
      if (this.toast) {
        this.toast.warning("AI 처리에 실패했지만 원본은 사용 가능합니다");
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
  showFinalResult() {
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
   * 재생성: 선택된 톤으로 결과 재생성 (템플릿은 'insight' 고정)
   */
  async regenerate() {
    console.log("재생성 시작");

    // 톤이 선택되었는지 확인
    if (!this.selectedTone) {
      if (this.toast) {
        this.toast.error("어조를 선택해주세요!");
      }
      return;
    }

    // processWithAI 호출하여 재생성
    await this.processWithAI();
  }

  /**
   * 클립보드에 복사
   */
  async copyToClipboard() {
    try {
      // 설정에서 복사 대상 확인
      const copyTarget = this.settings?.getSetting('copyTarget') || 'original';

      let textToCopy = "";
      if (copyTarget === 'original') {
        // 오리지널 텍스트 복사 (캡처 원문)
        textToCopy = this.capturedText || "";
      } else {
        // 파이널 텍스트 복사 (AI 정리)
        textToCopy = this.finalText || this.resultText?.value || "";
      }

      if (!textToCopy) {
        if (this.toast) {
          this.toast.error("복사할 내용이 없습니다");
        }
        return;
      }

      await navigator.clipboard.writeText(textToCopy);

      if (this.toast) {
        this.toast.success("클립보드에 복사되었습니다!");
      }
    } catch (error) {
      console.error("클립보드 복사 실패:", error);
      if (this.errorHandler) {
        this.errorHandler.handle(error, "copyToClipboard", {
          customMessage: "클립보드 복사에 실패했습니다",
        });
      }
    }
  }

  /**
   * 로딩 표시
   */
  showLoading(message = "AI가 내용을 정리하는 중입니다...") {
    if (this.loadingState) {
      const loadingText = this.loadingState.querySelector(".loading-text");
      if (loadingText) {
        loadingText.textContent = message;
      }
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
}
