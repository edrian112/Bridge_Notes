/**
 * APIService - n8n Webhook 통신 담당
 * Phase 2: AI 자동 정리 기능 구현
 */
export class APIService {
  constructor() {
    // n8n Webhook URL (환경 설정에서 로드)
    this.webhookUrl = null;
    this.timeout = 300000; // 5분 (긴 대화 처리 시간 고려)
    this.maxRetries = 3;
  }

  /**
   * APIService 초기화 - Webhook URL 로드
   */
  async init() {
    try {
      // Chrome Storage에서 Webhook URL 로드
      const result = await chrome.storage.local.get(['webhookUrl']);
      this.webhookUrl = result.webhookUrl || null;
      console.log("APIService initialized:", this.webhookUrl ? "Webhook configured" : "No webhook URL");
    } catch (error) {
      console.error("Failed to load webhook URL:", error);
      this.webhookUrl = null;
    }
  }

  /**
   * Webhook URL 설정 (개발/배포 환경 분리용)
   * @param {string} url - n8n Webhook URL
   */
  async setWebhookUrl(url) {
    try {
      new URL(url); // URL 검증
      this.webhookUrl = url;
      await chrome.storage.local.set({ webhookUrl: url });
      console.log("Webhook URL configured");
      return true;
    } catch (error) {
      console.error("Invalid webhook URL:", error);
      throw new Error("올바른 URL 형식이 아닙니다");
    }
  }

  /**
   * AI 처리 요청
   * @param {Object} options
   * @param {string} options.text - 캡처된 텍스트
   * @param {string} options.action - "summarize" | "tone-adjust"
   * @param {string} options.template - "insight" | "knowledge"
   * @param {string} options.tone - "friendly" | "formal"
   * @returns {Promise<Object>} { success, result, metadata }
   */
  async process({ text, action, template = "insight", tone = "friendly" }) {
    if (!this.webhookUrl) {
      throw new Error("Webhook URL이 설정되지 않았습니다. Settings에서 URL을 입력해주세요.");
    }

    if (!text || text.trim().length === 0) {
      throw new Error("처리할 텍스트가 없습니다");
    }

    const requestBody = {
      text: text.trim(),
      action,
      template,
      tone,
    };

    console.log("API Request:", { action, template, tone, textLength: text.length });

    // 재시도 로직 포함
    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.timeout);

        const response = await fetch(this.webhookUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(requestBody),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        // HTTP 에러 처리
        if (!response.ok) {
          const errorText = await response.text();
          console.error(`HTTP Error ${response.status}:`, errorText);

          // 서버 에러 (5xx)면 재시도
          if (response.status >= 500 && attempt < this.maxRetries) {
            console.log(`Retrying... (${attempt}/${this.maxRetries})`);
            await this.delay(1000 * attempt); // 지수 백오프
            continue;
          }

          // Rate limit 에러
          if (response.status === 429) {
            throw new Error("요청 한도 초과. 잠시 후 다시 시도해주세요.");
          }

          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        // 디버깅: 응답 본문 확인
        const responseText = await response.text();
        console.log("Raw response from n8n:", responseText);

        const data = JSON.parse(responseText);

        if (!data.success) {
          throw new Error(data.message || "AI 처리 실패");
        }

        // n8n Response 형식: { success, note: { content, metadata } }
        const noteContent = data.note?.content || data.result; // fallback 지원
        const noteMetadata = data.note?.metadata || data.metadata || {};

        console.log("API Response:", {
          success: data.success,
          resultLength: noteContent?.length,
          metadata: noteMetadata,
        });

        return {
          success: true,
          result: noteContent,
          metadata: noteMetadata,
        };
      } catch (error) {
        // Timeout 에러
        if (error.name === "AbortError") {
          console.error("Request timeout:", error);
          if (attempt < this.maxRetries) {
            console.log(`Retrying after timeout... (${attempt}/${this.maxRetries})`);
            await this.delay(1000 * attempt);
            continue;
          }
          throw new Error("요청 시간 초과 (5분). 다시 시도해주세요.");
        }

        // 네트워크 에러
        if (error.message.includes("Failed to fetch") || error.message.includes("NetworkError")) {
          console.error("Network error:", error);
          if (attempt < this.maxRetries) {
            console.log(`Retrying after network error... (${attempt}/${this.maxRetries})`);
            await this.delay(1000 * attempt);
            continue;
          }
          throw new Error("네트워크 연결을 확인해주세요");
        }

        // 마지막 시도였다면 에러 던지기
        if (attempt === this.maxRetries) {
          throw error;
        }

        // 그 외 에러도 재시도
        console.log(`Retrying after error... (${attempt}/${this.maxRetries})`, error);
        await this.delay(1000 * attempt);
      }
    }
  }

  /**
   * Delay 유틸리티
   * @param {number} ms - 밀리초
   */
  delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Health check - n8n 서버 상태 확인
   * @returns {Promise<boolean>}
   */
  async healthCheck() {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const response = await fetch(this.webhookUrl, {
        method: "OPTIONS", // Preflight 요청으로 서버 상태 확인
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      const isHealthy = response.ok || response.status === 404; // Webhook은 OPTIONS를 지원하지 않을 수 있음
      console.log("Health check result:", isHealthy);

      return isHealthy;
    } catch (error) {
      console.error("Health check failed:", error);
      return false;
    }
  }
}
