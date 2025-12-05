/**
 * BRIDGE notes - Side Panel Main Script
 * ES6 모듈 버전
 */

import { ToastMessage } from "./components/ToastMessage.js";
import { ResultArea } from "./components/ResultArea.js";
import { History } from "./components/History.js";
import { ErrorHandler } from "./components/ErrorHandler.js";
import { Settings } from "./components/Settings.js";
import { TabNavigation } from "./components/TabNavigation.js";
import { Pricing } from "./components/Pricing.js";

class BRIDGENotesSidePanel {
  constructor() {
    this.startCaptureBtn = document.getElementById("startCaptureBtn");
    this.settingsBtn = document.getElementById("settingsBtn");

    // 컴포넌트 인스턴스
    this.toast = new ToastMessage();
    this.errorHandler = new ErrorHandler(this.toast);
    this.settings = new Settings(
      this.toast,
      this.errorHandler,
      (isDarkMode) => {
        console.log("Theme changed:", isDarkMode);
      }
    );
    this.resultArea = new ResultArea(
      this.toast,
      this.errorHandler,
      this.settings
    );

    // 탭 네비게이션 (History보다 먼저 생성)
    this.tabNavigation = new TabNavigation();

    // 히스토리 (tabNavigation 전달)
    this.history = new History(
      (text) => this.loadFromHistory(text),
      this.errorHandler,
      this.tabNavigation
    );

    // 과금 페이지
    this.pricing = new Pricing(this.toast, this.errorHandler);

    // 지원 사이트 목록
    this.supportedSites = [
      "claude.ai",
      "chat.openai.com",
      "chatgpt.com",
      "perplexity.ai",
      "gemini.google.com",
    ];

    // 탭 상태 추적 (탭ID + 상태)
    this.lastTabId = null;
    this.lastTabState = null; // null: 초기, 'supported': 지원, 'unsupported': 미지원
    this.currentWindowId = null; // Side panel이 속한 window ID

    this.init();
  }

  async init() {
    // 이벤트 리스너 등록
    this.startCaptureBtn?.addEventListener("click", () => this.startCapture());
    // 설정 버튼은 Settings 컴포넌트에서 자체적으로 처리

    // Side panel이 속한 window ID 가져오기
    try {
      const currentWindow = await chrome.windows.getCurrent();
      this.currentWindowId = currentWindow.id;
      console.log("Side panel window ID:", this.currentWindowId);
    } catch (error) {
      console.error("Failed to get current window:", error);
    }

    // 현재 탭이 지원되는 사이트인지 확인
    this.checkCurrentTab();

    // 메시지 리스너 (content script로부터)
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      this.handleMessage(message, sender, sendResponse);
    });

    // ESC 키 리스너 - 사이드패널에서 ESC 누르면 content.js의 선택 모드 취소
    window.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        console.log("Sidepanel: ESC pressed, canceling selection mode");
        this.cancelSelectionMode();
      }
    });

    // ❌ Side Panel에서는 chrome.tabs 이벤트가 작동하지 않음
    // ✅ Background에서 메시지로 받아서 처리

    // Side panel 가시성 변경 감지 (탭 전환 시 자동 체크)
    document.addEventListener("visibilitychange", () => {
      if (!document.hidden) {
        console.log("Side panel visible, checking current tab");
        this.checkCurrentTab();
      }
    });

    // Window focus 이벤트 (사용자가 브라우저로 돌아올 때)
    window.addEventListener("focus", () => {
      console.log("Window focused, checking current tab");
      this.checkCurrentTab();
    });

    console.log("BRIDGE notes Side Panel loaded");

    // 사용량 표시 업데이트
    this.updateUsageDisplay();
  }

  /**
   * Background 및 Content script로부터의 메시지 처리
   */
  handleMessage(message, sender, sendResponse) {
    console.log("Sidepanel received message:", message);

    switch (message.action) {
      case "captureComplete":
        console.log(
          "Handling captureComplete, text length:",
          message.text?.length
        );
        this.handleCaptureComplete(message.text);
        sendResponse({ success: true });
        break;

      case "tab-activated":
        // Background에서 탭 전환 알림
        console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
        console.log("🔄 [Side Panel] Tab activated message received");
        console.log("  Tab ID:", message.tabId);
        console.log("  Window ID:", message.windowId);
        console.log("  URL:", message.url);
        console.log("  Title:", message.title);
        console.log("  Side Panel Window ID:", this.currentWindowId);

        // 현재 window의 탭만 체크
        if (
          this.currentWindowId &&
          message.windowId === this.currentWindowId
        ) {
          console.log("  ✅ Same window - Checking tab with URL from message...");
          this.checkCurrentTab(message.tabId, message.url);
        } else if (!this.currentWindowId) {
          console.log("  ⚠️ Window ID not set - Checking tab anyway...");
          this.checkCurrentTab(message.tabId, message.url);
        } else {
          console.log("  ❌ Different window - Ignoring");
        }
        console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
        sendResponse({ success: true });
        break;

      case "tab-updated":
        // Background에서 탭 업데이트 알림
        console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
        console.log("🔄 [Side Panel] Tab updated message received");
        console.log("  Tab ID:", message.tabId);
        console.log("  Window ID:", message.windowId);
        console.log("  URL:", message.url);
        console.log("  Status:", message.status);
        console.log("  Side Panel Window ID:", this.currentWindowId);

        // 현재 window의 탭만 체크
        if (
          this.currentWindowId &&
          message.windowId === this.currentWindowId
        ) {
          console.log("  ✅ Same window - Checking tab with URL from message...");
          this.checkCurrentTab(message.tabId, message.url);
        } else if (!this.currentWindowId) {
          console.log("  ⚠️ Window ID not set - Checking tab anyway...");
          this.checkCurrentTab(message.tabId, message.url);
        } else {
          console.log("  ❌ Different window - Ignoring");
        }
        console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
        sendResponse({ success: true });
        break;

      default:
        console.log("Unknown message:", message);
    }
    return true; // async response를 위해 필수
  }

  /**
   * 캡처 완료 처리
   */
  async handleCaptureComplete(text) {
    console.log(
      "handleCaptureComplete called with text:",
      text?.substring(0, 100)
    );

    // 결과 영역에 캡처된 텍스트 표시
    this.resultArea.show(text);
    this.toast.success("캡처가 완료되었습니다!");

    // 히스토리에 저장
    await this.saveToHistory(text);

    // 사용량 표시 업데이트
    await this.updateUsageDisplay();
  }

  /**
   * 히스토리에 캡처 저장
   */
  async saveToHistory(text) {
    try {
      const result = await ErrorHandler.safeStorageGet(["captures"]);
      let captures = result.captures || [];

      // 새 캡처 추가
      const newCapture = {
        id: Date.now().toString(),
        text: text,
        timestamp: Date.now(),
      };

      captures.unshift(newCapture);

      // 최대 10개까지만 저장
      if (captures.length > 10) {
        captures = captures.slice(0, 10);
      }

      const saved = await ErrorHandler.safeStorageSet({ captures });

      if (!saved) {
        this.errorHandler.handle(
          new Error("Storage quota exceeded"),
          "saveToHistory"
        );
        return;
      }

      // 히스토리 리스트 새로고침
      await this.history.load();

      console.log("Capture saved to history");
    } catch (error) {
      this.errorHandler.handle(error, "saveToHistory");
    }
  }

  /**
   * 히스토리에서 캡처 불러오기
   */
  loadFromHistory(text) {
    this.resultArea.show(text);
    this.toast.success("이전 캡처를 불러왔습니다!");
  }

  /**
   * 현재 탭이 지원 사이트인지 확인 (탭 변경 시에만 토스트 표시)
   * @param {number} tabId - (선택) 탭 ID (message에서 전달된 경우)
   * @param {string} url - (선택) 탭 URL (message에서 전달된 경우)
   */
  async checkCurrentTab(tabId = null, url = null) {
    try {
      // Window ID 초기화
      if (!this.currentWindowId) {
        const currentWindow = await chrome.windows.getCurrent();
        this.currentWindowId = currentWindow.id;
      }

      let tab;

      // URL이 전달된 경우 메시지 사용, 아니면 쿼리
      if (tabId && url !== null && url !== undefined) {
        tab = { id: tabId, url: url };
      } else {
        const tabs = await ErrorHandler.safeTabQuery({
          active: true,
          windowId: this.currentWindowId,
        });

        if (!tabs || tabs.length === 0) {
          this.errorHandler.handle(
            new Error("No active tab found"),
            "checkCurrentTab",
            { silent: true }
          );
          this.disableCaptureButton();
          return;
        }

        tab = tabs[0];
      }

      // 지원 사이트 확인
      const isSupported = this.supportedSites.some(
        (site) => tab.url && tab.url.includes(site)
      );

      // Content script 준비 상태 확인 (지원 사이트일 때만)
      let isContentScriptReady = false;
      if (isSupported) {
        isContentScriptReady = await this.checkContentScriptReady(tab.id);
      }

      // 현재 상태 결정
      const newState = isSupported && isContentScriptReady ? "ready" :
                       isSupported && !isContentScriptReady ? "not-ready" :
                       "unsupported";

      // 탭/상태 변경 확인
      const tabChanged = this.lastTabId !== tab.id;
      const stateChanged = this.lastTabState !== newState;

      // 탭이 변경되고 상태도 변경된 경우에만 토스트 표시
      if (tabChanged && stateChanged) {
        if (newState === "unsupported") {
          this.toast.error(
            "이 사이트는 지원되지 않습니다.\nClaude.ai, ChatGPT, Perplexity, Google Gemini에서 사용해주세요.",
            0
          );
        } else if (newState === "not-ready") {
          this.toast.warning(
            "AI 채팅 페이지를 새로고침해주세요.\n(Ctrl+R 또는 Cmd+R)",
            0
          );
        }
      }

      // UI 업데이트
      if (newState === "ready") {
        this.enableCaptureButton();
      } else {
        this.disableCaptureButton();
      }

      // 상태 저장
      this.lastTabId = tab.id;
      this.lastTabState = newState;
    } catch (error) {
      this.errorHandler.handle(error, "checkCurrentTab", { silent: true });
      this.disableCaptureButton();
    }
  }

  /**
   * 캡처 버튼 비활성화
   */
  disableCaptureButton() {
    if (!this.startCaptureBtn) return;

    this.startCaptureBtn.disabled = true;
    this.startCaptureBtn.style.opacity = "0.5";
    this.startCaptureBtn.style.cursor = "not-allowed";
  }

  /**
   * 캡처 버튼 활성화
   */
  enableCaptureButton() {
    if (!this.startCaptureBtn) return;

    this.startCaptureBtn.disabled = false;
    this.startCaptureBtn.style.opacity = "1";
    this.startCaptureBtn.style.cursor = "pointer";
  }

  /**
   * Content script 준비 상태 확인
   */
  async checkContentScriptReady(tabId, maxRetries = 3) {
    for (let i = 0; i < maxRetries; i++) {
      try {
        const response = await ErrorHandler.safeTabSendMessage(
          tabId,
          { action: "ping" },
          { timeout: 1000 }
        );

        if (response?.ready === true) {
          console.log("Content script is ready");
          return true;
        }
      } catch (error) {
        console.log(`Content script not ready, attempt ${i + 1}/${maxRetries}`);

        if (i < maxRetries - 1) {
          // 재시도 전 대기 (점진적 증가: 300ms, 600ms, 900ms)
          await this.delay((i + 1) * 300);
        }
      }
    }

    console.log("Content script ready check failed after retries");
    return false;
  }

  /**
   * 딜레이 헬퍼 함수
   */
  delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * 캡처 시작 (준비 확인 + 재시도 로직)
   */
  async startCapture() {
    try {
      // 현재 활성 탭 가져오기 (window ID 사용)
      const queryOptions = {
        active: true,
      };

      if (this.currentWindowId) {
        queryOptions.windowId = this.currentWindowId;
      } else {
        queryOptions.lastFocusedWindow = true;
      }

      const tabs = await ErrorHandler.safeTabQuery(queryOptions);

      if (!tabs || tabs.length === 0) {
        this.errorHandler.handle(
          new Error("No active tab found"),
          "startCapture",
          { customMessage: "활성 탭을 찾을 수 없습니다." }
        );
        return;
      }

      const [tab] = tabs;

      // 탭 활성화 및 포커스
      await chrome.tabs.update(tab.id, { active: true });
      console.log("Tab activated:", tab.id);

      // 1단계: Content script 준비 확인
      const isReady = await this.checkContentScriptReady(tab.id);

      if (!isReady) {
        // 준비되지 않음
        this.toast.error(
          "페이지 준비 중입니다.\n잠시 후 다시 시도해주세요.",
          3000
        );
        return;
      }

      // 2단계: Content script에 메시지 전송
      const response = await ErrorHandler.safeTabSendMessage(
        tab.id,
        { action: "startSelection" },
        { timeout: 5000 }
      );

      if (!response.success) {
        this.errorHandler.handle(
          new Error(response.error || "Message sending failed"),
          "startCapture",
          { customMessage: "페이지와 통신할 수 없습니다." }
        );
        return;
      }

      this.toast.success("범위 선택 모드가 활성화되었습니다!");
    } catch (error) {
      this.errorHandler.handle(error, "startCapture");
    }
  }

  /**
   * 사용량 표시 업데이트
   */
  async updateUsageDisplay() {
    try {
      const remainingCountElement = document.getElementById("remainingCount");

      if (!remainingCountElement) {
        console.log("Usage display element not found");
        return;
      }

      // Chrome storage에서 요금제 정보 가져오기
      const result = await chrome.storage.local.get(["userPlan", "usageCount"]);

      const plan = result.userPlan || "free";
      const usageCount = result.usageCount || 0;

      // 요금제별 사용 제한
      const planLimits = {
        free: 5,
        basic30: 30,
        standard100: 100,
        max: null, // 무제한
      };

      const limit = planLimits[plan];
      const remainingCount = limit ? Math.max(0, limit - usageCount) : "∞";

      // UI 업데이트 - 남은 사용량만 표시
      remainingCountElement.textContent = remainingCount;

      console.log(`Usage updated: ${plan} - ${remainingCount} remaining`);
    } catch (error) {
      console.error("Failed to update usage display:", error);
    }
  }

  /**
   * 선택 모드 취소 (ESC 키로 호출)
   */
  async cancelSelectionMode() {
    try {
      // 현재 활성 탭 가져오기 (window ID 사용)
      const queryOptions = {
        active: true,
      };

      if (this.currentWindowId) {
        queryOptions.windowId = this.currentWindowId;
      } else {
        queryOptions.lastFocusedWindow = true;
      }

      const tabs = await ErrorHandler.safeTabQuery(queryOptions);

      if (!tabs || tabs.length === 0) {
        console.log("No active tab for cancel operation");
        return;
      }

      const [tab] = tabs;

      // Content script에 취소 메시지 전송 (탭 ID 사용)
      const response = await ErrorHandler.safeTabSendMessage(
        tab.id,
        { action: "cancelSelection" },
        { timeout: 3000 }
      );

      if (response.success && response.canceled) {
        console.log("Selection mode canceled");
      } else {
        console.log("Cancel message sent (selection might not be active)");
      }
    } catch (error) {
      // 에러는 로그만 남기고 사용자에게는 표시하지 않음 (선택 모드가 아닐 수 있음)
      console.error("Cancel selection error:", error);
    }
  }
}

// Side Panel 로드 시 초기화
document.addEventListener("DOMContentLoaded", () => {
  window.bridgeNotesPanel = new BRIDGENotesSidePanel();
});
