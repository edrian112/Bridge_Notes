/**
 * Pricing Component
 * 과금 플랜 및 구매 페이지
 */

import { ErrorHandler } from "./ErrorHandler.js";

export class Pricing {
  constructor(toast = null, errorHandler = null) {
    this.pricingContainer = document.getElementById("pricingTab");
    this.toast = toast;
    this.errorHandler = errorHandler;

    // 플랜 정보
    this.plans = [
      {
        id: "free",
        name: "Free",
        price: 0,
        period: "영구",
        features: [
          { text: "사용횟수 5회", available: true },
          { text: "히스토리 3개 저장", available: true },
          { text: "3가지 템플릿", available: true },
          { text: "다른 언어모델 연동", available: false },
          { text: "우선 지원", available: false },
        ],
        badge: null,
        current: false,
      },
      {
        id: "basic30",
        name: "Basic30",
        price: 5000,
        period: "30회",
        features: [
          { text: "사용횟수 30회", available: true },
          { text: "히스토리 10개 저장", available: true },
          { text: "3가지 템플릿", available: true },
          { text: "다른 언어모델 연동", available: false },
          { text: "우선 지원", available: false },
        ],
        badge: null,
        recommended: false,
      },
      {
        id: "standard100",
        name: "Standard100",
        price: 10000,
        period: "100회",
        features: [
          { text: "사용횟수 100회", available: true },
          { text: "히스토리 10개 저장", available: true },
          { text: "3가지 템플릿", available: true },
          { text: "다른 언어모델 연동", available: true },
          { text: "우선 지원", available: false },
        ],
        badge: "인기",
        recommended: true,
      },
      {
        id: "max",
        name: "MAX",
        price: 29000,
        period: "월",
        features: [
          { text: "무제한 사용", available: true },
          { text: "히스토리 10개 저장", available: true },
          { text: "3가지 템플릿", available: true },
          { text: "다른 언어모델 연동", available: true },
          { text: "우선 지원", available: true },
        ],
        badge: null,
      },
    ];

    this.init();
  }

  async init() {
    // 현재 플랜 정보 불러오기
    await this.loadCurrentPlan();

    // 렌더링
    this.render();
  }

  /**
   * 현재 사용자 플랜 불러오기
   */
  async loadCurrentPlan() {
    try {
      const result = await ErrorHandler.safeStorageGet(["userPlan"]);

      if (result.userPlan) {
        this.currentPlan = result.userPlan;
      } else {
        this.currentPlan = "free";
      }

      console.log("Current plan:", this.currentPlan);
    } catch (error) {
      console.error("Failed to load user plan:", error);
      this.currentPlan = "free";
    }
  }

  /**
   * 과금 페이지 렌더링
   */
  render() {
    if (!this.pricingContainer) return;

    this.pricingContainer.innerHTML = `
      <div class="pricing-wrapper">
        <div class="pricing-header">
          <h2>💎 플랜 선택</h2>
        </div>

        <div class="pricing-plans">
          ${this.plans.map((plan) => this.renderPlanCard(plan)).join("")}
        </div>

        <div class="pricing-faq">
          <h3>자주 묻는 질문</h3>

          <div class="faq-item">
            <div class="faq-question">🎫 회권 플랜은 어떻게 사용하나요?</div>
            <div class="faq-answer">Basic30과 Standard100은 구매 시 사용 횟수가 충전되며, AI 정리 완료 시 1회씩 차감됩니다. 사용 기한은 없습니다.</div>
          </div>

          <div class="faq-item">
            <div class="faq-question">💳 결제 수단은 무엇이 있나요?</div>
            <div class="faq-answer">신용카드, 체크카드, 카카오페이, 네이버페이를 지원합니다.</div>
          </div>

          <div class="faq-item">
            <div class="faq-question">🔄 플랜을 여러 개 구매할 수 있나요?</div>
            <div class="faq-answer">네, 회권 플랜(Basic30, Standard100)은 여러 번 구매 가능하며 횟수가 누적됩니다.</div>
          </div>

          <div class="faq-item">
            <div class="faq-question">💰 환불 정책은 어떻게 되나요?</div>
            <div class="faq-answer">사용하지 않은 횟수에 한해 구매 후 7일 이내 환불이 가능합니다.</div>
          </div>

          <div class="faq-item">
            <div class="faq-question">📧 문의는 어떻게 하나요?</div>
            <div class="faq-answer">edari.bridge@gmail.com으로 문의 주시면 24시간 이내 답변드립니다.</div>
          </div>
        </div>
      </div>
    `;

    // 이벤트 리스너 등록
    this.attachEventListeners();
  }

  /**
   * 플랜 카드 렌더링
   */
  renderPlanCard(plan) {
    const isCurrent = plan.id === this.currentPlan;
    const badgeHtml = plan.badge
      ? `<span class="plan-badge ${
          plan.recommended ? "recommended" : "current"
        }">${plan.badge}</span>`
      : "";

    return `
      <div class="plan-card ${plan.recommended ? "recommended" : ""} ${
      isCurrent ? "current" : ""
    }">
        ${badgeHtml}

        <div class="plan-header">
          <h3 class="plan-name">${plan.name}</h3>
          <div class="plan-price">
            ${
              plan.price === 0
                ? '<span class="price-amount">무료</span>'
                : `<span class="price-amount">₩${plan.price.toLocaleString()}</span><span class="price-period">/${
                    plan.period
                  }</span>`
            }
          </div>
        </div>

        <div class="plan-features">
          ${plan.features
            .map(
              (feature) => `
            <div class="feature-item ${feature.available ? "" : "unavailable"}">
              <span class="feature-icon">${feature.available ? "✓" : "✕"}</span>
              <span class="feature-text">${feature.text}</span>
            </div>
          `
            )
            .join("")}
        </div>

        <button
          class="plan-button ${isCurrent ? "current-plan" : ""}"
          data-plan="${plan.id}"
          ${isCurrent ? "disabled" : ""}
        >
          ${
            isCurrent
              ? "현재 플랜"
              : plan.price === 0
              ? "무료로 시작"
              : "구매하기"
          }
        </button>
      </div>
    `;
  }

  /**
   * 이벤트 리스너 등록
   */
  attachEventListeners() {
    const planButtons = this.pricingContainer.querySelectorAll(".plan-button");

    planButtons.forEach((button) => {
      button.addEventListener("click", (e) => {
        const planId = button.getAttribute("data-plan");
        this.handlePlanSelection(planId);
      });
    });
  }

  /**
   * 플랜 선택 처리
   */
  async handlePlanSelection(planId) {
    const plan = this.plans.find((p) => p.id === planId);

    if (!plan) return;

    // 무료 플랜인 경우
    if (plan.price === 0) {
      await this.switchToFreePlan();
      return;
    }

    // 유료 플랜인 경우 - 결제 프로세스
    this.initiatePayment(plan);
  }

  /**
   * 무료 플랜으로 전환
   */
  async switchToFreePlan() {
    try {
      const saved = await ErrorHandler.safeStorageSet({ userPlan: "free" });

      if (saved) {
        this.currentPlan = "free";

        if (this.toast) {
          this.toast.success("무료 플랜으로 전환되었습니다!");
        }

        // 페이지 다시 렌더링
        this.render();
      }
    } catch (error) {
      if (this.errorHandler) {
        this.errorHandler.handle(error, "switchToFreePlan");
      }
    }
  }

  /**
   * 결제 프로세스 시작
   */
  initiatePayment(plan) {
    // 실제 결제 연동 전까지는 데모 모드
    const confirmed = confirm(
      `${plan.name}을(를) 구매하시겠습니까?\n\n` +
        `금액: ₩${plan.price.toLocaleString()}/${plan.period}\n\n` +
        `※ 현재는 데모 모드입니다. 실제 결제는 진행되지 않습니다.`
    );

    if (confirmed) {
      this.processDemoPayment(plan);
    }
  }

  /**
   * 데모 결제 처리
   */
  async processDemoPayment(plan) {
    try {
      // 로딩 표시
      if (this.toast) {
        this.toast.info("결제 처리 중...");
      }

      // 2초 지연 (실제 결제 API 호출 시뮬레이션)
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // 플랜 업데이트
      const saved = await ErrorHandler.safeStorageSet({
        userPlan: plan.id,
        planPurchaseDate: Date.now(),
      });

      if (saved) {
        this.currentPlan = plan.id;

        if (this.toast) {
          this.toast.success(`${plan.name} 구매가 완료되었습니다! 🎉`);
        }

        // 페이지 다시 렌더링
        this.render();
      }
    } catch (error) {
      if (this.errorHandler) {
        this.errorHandler.handle(error, "processDemoPayment", {
          customMessage: "결제 처리 중 오류가 발생했습니다.",
        });
      }
    }
  }

  /**
   * 현재 플랜 정보 가져오기
   */
  getCurrentPlan() {
    return this.currentPlan;
  }

  /**
   * 플랜 제한 확인
   */
  async checkLimit(action) {
    // 무료 플랜의 제한 확인
    if (this.currentPlan === "free") {
      const result = await ErrorHandler.safeStorageGet(["usageCount"]);
      const usageCount = result.usageCount || 0;

      if (action === "capture" && usageCount >= 5) {
        if (this.toast) {
          this.toast.error(
            "무료 플랜의 사용 제한(5회)에 도달했습니다. 유료 플랜으로 업그레이드하세요!"
          );
        }
        return false;
      }
    }

    return true;
  }

  /**
   * 사용 횟수 증가
   */
  async incrementUsage() {
    try {
      const result = await ErrorHandler.safeStorageGet([
        "usageCount",
        "usageMonth",
      ]);
      let usageCount = result.usageCount || 0;
      let usageMonth = result.usageMonth || new Date().getMonth();

      const currentMonth = new Date().getMonth();

      // 월이 바뀌면 사용 횟수 초기화
      if (currentMonth !== usageMonth) {
        usageCount = 0;
        usageMonth = currentMonth;
      }

      usageCount++;

      await ErrorHandler.safeStorageSet({
        usageCount,
        usageMonth,
      });

      console.log(`Usage count: ${usageCount}`);
    } catch (error) {
      console.error("Failed to increment usage:", error);
    }
  }
}
