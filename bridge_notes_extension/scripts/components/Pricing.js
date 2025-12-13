/**
 * Pricing Component
 * 과금 플랜 및 구매 페이지
 */

import { ErrorHandler } from "./ErrorHandler.js";
import { i18n } from "../i18n/i18n.js";

export class Pricing {
  constructor(toast = null, errorHandler = null) {
    this.pricingContainer = document.getElementById("pricingTab");
    this.toast = toast;
    this.errorHandler = errorHandler;
    this.i18n = i18n;

    // 플랜 정보 (기본 데이터만 저장, 텍스트는 렌더링 시 i18n으로 처리)
    this.plansData = [
      {
        id: "free",
        name: "Free",
        price: 0,
        periodKey: "pricing.period.forever",
        usageCount: 5,
        historyCount: 3,
        hasTones: true,
        hasCustomModel: false,
        hasBridgePages: false,
        badge: null,
        current: false,
      },
      {
        id: "basic30",
        name: "Basic30",
        price: 5000,
        periodKey: "30",
        periodUnit: "pricing.period.times",
        usageCount: 30,
        historyCount: 10,
        hasTones: true,
        hasCustomModel: false,
        hasBridgePages: false,
        badge: null,
        recommended: false,
      },
      {
        id: "standard70",
        name: "Standard70",
        price: 10000,
        periodKey: "70",
        periodUnit: "pricing.period.times",
        usageCount: 70,
        historyCount: 10,
        hasTones: true,
        hasCustomModel: true,
        hasBridgePages: false,
        badge: "pricing.badge.popular",
        recommended: true,
      },
      {
        id: "max",
        name: "MAX",
        price: 29000,
        periodKey: "pricing.period.month",
        usageCount: -1, // unlimited
        historyCount: 10,
        hasTones: true,
        hasCustomModel: true,
        hasBridgePages: true,
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

    // 언어 변경 감지 (언어 변경 시 Pricing UI 재렌더링)
    this.i18n.onLanguageChange((lang) => {
      this.render();
    });
  }

  /**
   * 현재 사용자 플랜 불러오기
   */
  async loadCurrentPlan() {
    try {
      // processDemoPayment()에서 저장한 planType 키 읽기
      const result = await ErrorHandler.safeStorageGet(["planType"]);

      if (result.planType) {
        this.currentPlan = result.planType;
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
        <div class="pricing-plans">
          ${this.plansData.map((plan) => this.renderPlanCard(plan)).join("")}
        </div>

        <div class="pricing-faq">
          <h3>${this.i18n.t("pricing.faq.title")}</h3>

          <div class="faq-item">
            <div class="faq-question">${this.i18n.t("pricing.faq.q1")}</div>
            <div class="faq-answer">${this.i18n.t("pricing.faq.a1")}</div>
          </div>

          <div class="faq-item">
            <div class="faq-question">${this.i18n.t("pricing.faq.q2")}</div>
            <div class="faq-answer">${this.i18n.t("pricing.faq.a2")}</div>
          </div>

          <div class="faq-item">
            <div class="faq-question">${this.i18n.t("pricing.faq.q3")}</div>
            <div class="faq-answer">${this.i18n.t("pricing.faq.a3")}</div>
          </div>

          <div class="faq-item">
            <div class="faq-question">${this.i18n.t("pricing.faq.q4")}</div>
            <div class="faq-answer">${this.i18n.t("pricing.faq.a4")}</div>
          </div>

          <div class="faq-item">
            <div class="faq-question">${this.i18n.t("pricing.faq.q5")}</div>
            <div class="faq-answer">${this.i18n.t("pricing.faq.a5")}</div>
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
        }">${this.i18n.t(plan.badge)}</span>`
      : "";

    // Period 텍스트 생성
    const periodText = plan.periodUnit
      ? `${plan.periodKey}${this.i18n.t(plan.periodUnit)}`
      : this.i18n.t(plan.periodKey);

    // Features 배열 생성
    const features = [
      {
        text: plan.usageCount === -1
          ? this.i18n.t("settings.unlimited")
          : `${this.i18n.t("pricing.feature.usage")} ${plan.usageCount}${this.i18n.t("pricing.period.times")}`,
        available: true
      },
      {
        text: this.i18n.t("pricing.feature.history").replace("{count}", plan.historyCount),
        available: true
      },
      {
        text: this.i18n.t("pricing.feature.tones"),
        available: plan.hasTones
      },
      {
        text: this.i18n.t("pricing.feature.customModel"),
        available: plan.hasCustomModel
      },
      {
        text: this.i18n.t("pricing.feature.bridgePages"),
        available: plan.hasBridgePages
      }
    ];

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
                ? `<span class="price-amount">${this.i18n.t("pricing.free")}</span>`
                : `<span class="price-amount">₩${plan.price.toLocaleString()}</span><span class="price-period">/${periodText}</span>`
            }
          </div>
        </div>

        <div class="plan-features">
          ${features
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
              ? this.i18n.t("pricing.button.current")
              : plan.price === 0
              ? this.i18n.t("pricing.button.startFree")
              : this.i18n.t("pricing.button.purchase")
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
    const plan = this.plansData.find((p) => p.id === planId);

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
      const freePlan = this.plansData.find(p => p.id === 'free');

      const saved = await ErrorHandler.safeStorageSet({
        planType: "free",
        remainingUsage: freePlan.usageCount,
        planPurchaseDate: Date.now()
      });

      if (saved) {
        this.currentPlan = "free";

        if (this.toast) {
          this.toast.success(this.i18n.t("pricing.toast.switchedToFree"));
        }

        // Settings 컴포넌트에 플랜 변경 알림
        window.dispatchEvent(new CustomEvent('planUpdated', {
          detail: { planType: 'free', remainingUsage: freePlan.usageCount }
        }));

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
    // Period 텍스트 생성
    const periodText = plan.periodUnit
      ? `${plan.periodKey}${this.i18n.t(plan.periodUnit)}`
      : this.i18n.t(plan.periodKey);

    // 실제 결제 연동 전까지는 데모 모드
    const confirmed = confirm(
      this.i18n.t("pricing.confirm.purchase")
        .replace("{planName}", plan.name)
        .replace("{price}", plan.price.toLocaleString())
        .replace("{period}", periodText)
    );

    if (confirmed) {
      this.processDemoPayment(plan);
    }
  }

  /**
   * 플랜 구매 처리 (Mock 시스템)
   */
  async processDemoPayment(plan) {
    try {
      // Google 로그인 확인
      const googleUser = await ErrorHandler.safeStorageGet(['googleUser']);
      if (!googleUser.googleUser) {
        if (this.toast) {
          this.toast.warning('플랜 구매를 위해 먼저 Google 로그인이 필요합니다.');
        }
        return;
      }

      // 로딩 표시
      if (this.toast) {
        this.toast.info(this.i18n.t("pricing.toast.processing"));
      }

      // 1초 지연 (UI 피드백)
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // 플랜 및 사용량 업데이트
      const saved = await ErrorHandler.safeStorageSet({
        planType: plan.id,
        remainingUsage: plan.usageCount,
        planPurchaseDate: Date.now(),
      });

      if (saved) {
        this.currentPlan = plan.id;

        if (this.toast) {
          this.toast.success(
            this.i18n.t("pricing.toast.purchaseSuccess").replace("{planName}", plan.name) + " 🎉"
          );
        }

        // Settings 컴포넌트에 플랜 변경 알림
        window.dispatchEvent(new CustomEvent('planUpdated', {
          detail: { planType: plan.id, remainingUsage: plan.usageCount }
        }));

        // 페이지 다시 렌더링
        this.render();
      }
    } catch (error) {
      if (this.errorHandler) {
        this.errorHandler.handle(error, "processDemoPayment", {
          customMessage: this.i18n.t("pricing.error.payment"),
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
          this.toast.error(this.i18n.t("pricing.toast.limitReached"));
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
