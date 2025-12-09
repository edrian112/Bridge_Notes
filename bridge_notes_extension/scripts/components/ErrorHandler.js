/**
 * ErrorHandler Component
 * Phase 2 - Centralized error handling and user feedback
 */

export class ErrorHandler {
  constructor(toast = null) {
    this.toast = toast;
    this.errorLog = [];
    this.maxLogSize = 50;
  }

  /**
   * 에러 타입 정의
   */
  static ErrorTypes = {
    NETWORK: 'network',
    STORAGE: 'storage',
    PERMISSION: 'permission',
    CLIPBOARD: 'clipboard',
    TAB_ACCESS: 'tab_access',
    MESSAGE_PASSING: 'message_passing',
    DOM: 'dom',
    UNKNOWN: 'unknown'
  };

  /**
   * 에러 처리 메인 함수
   */
  handle(error, context = '', options = {}) {
    const errorType = this.detectErrorType(error);
    const errorInfo = {
      type: errorType,
      message: error.message || String(error),
      context: context,
      timestamp: Date.now(),
      stack: error.stack
    };

    // 에러 로깅
    this.logError(errorInfo);

    // 사용자에게 표시할 메시지 생성
    const userMessage = this.getUserMessage(errorType, context, options);

    // Toast 알림 표시
    if (this.toast && !options.silent) {
      this.toast.error(userMessage, options.duration);
    }

    // 콘솔 로깅
    console.error(`[Bridge Notes Error] ${context}:`, error);

    // 재시도 로직
    if (options.retry && options.retryFn) {
      return this.retry(options.retryFn, options.retryCount || 3, options.retryDelay || 1000);
    }

    return false;
  }

  /**
   * 에러 타입 감지
   */
  detectErrorType(error) {
    const message = error.message?.toLowerCase() || '';

    // Network errors
    if (message.includes('network') || message.includes('fetch') ||
        message.includes('timeout') || message.includes('cors')) {
      return ErrorHandler.ErrorTypes.NETWORK;
    }

    // Storage errors
    if (message.includes('storage') || message.includes('quota')) {
      return ErrorHandler.ErrorTypes.STORAGE;
    }

    // Permission errors
    if (message.includes('permission') || message.includes('denied')) {
      return ErrorHandler.ErrorTypes.PERMISSION;
    }

    // Clipboard errors
    if (message.includes('clipboard') || message.includes('copy')) {
      return ErrorHandler.ErrorTypes.CLIPBOARD;
    }

    // Tab access errors
    if (message.includes('tab') || message.includes('cannot access')) {
      return ErrorHandler.ErrorTypes.TAB_ACCESS;
    }

    // Message passing errors
    if (message.includes('message') || message.includes('sendResponse') ||
        error.message?.includes('lastError')) {
      return ErrorHandler.ErrorTypes.MESSAGE_PASSING;
    }

    // DOM errors
    if (message.includes('element') || message.includes('node') ||
        message.includes('queryselector')) {
      return ErrorHandler.ErrorTypes.DOM;
    }

    return ErrorHandler.ErrorTypes.UNKNOWN;
  }

  /**
   * 사용자 친화적 메시지 생성
   */
  getUserMessage(errorType, context, options = {}) {
    if (options.customMessage) {
      return options.customMessage;
    }

    const messages = {
      [ErrorHandler.ErrorTypes.NETWORK]: '네트워크 연결을 확인해주세요.',
      [ErrorHandler.ErrorTypes.STORAGE]: '저장 공간이 부족합니다. 이전 캡처를 삭제해주세요.',
      [ErrorHandler.ErrorTypes.PERMISSION]: '필요한 권한이 없습니다. 확장 프로그램 설정을 확인해주세요.',
      [ErrorHandler.ErrorTypes.CLIPBOARD]: '클립보드 복사에 실패했습니다. 다시 시도해주세요.',
      [ErrorHandler.ErrorTypes.TAB_ACCESS]: '페이지 접근 권한이 없습니다. 페이지를 새로고침 해주세요.',
      [ErrorHandler.ErrorTypes.MESSAGE_PASSING]: '페이지와 통신할 수 없습니다. 페이지를 새로고침 해주세요.',
      [ErrorHandler.ErrorTypes.DOM]: '페이지 요소를 찾을 수 없습니다. 지원되는 사이트인지 확인해주세요.',
      [ErrorHandler.ErrorTypes.UNKNOWN]: '오류가 발생했습니다. 다시 시도해주세요.'
    };

    return messages[errorType] || messages[ErrorHandler.ErrorTypes.UNKNOWN];
  }

  /**
   * 재시도 로직
   */
  async retry(fn, maxRetries = 3, delay = 1000) {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const result = await fn();
        if (attempt > 1) {
          console.log(`Retry successful on attempt ${attempt}`);
        }
        return result;
      } catch (error) {
        if (attempt === maxRetries) {
          console.error(`All ${maxRetries} retry attempts failed`);
          throw error;
        }

        console.log(`Retry attempt ${attempt} failed, retrying in ${delay}ms...`);
        await this.delay(delay);

        // Exponential backoff
        delay *= 1.5;
      }
    }
  }

  /**
   * 에러 로깅
   */
  logError(errorInfo) {
    this.errorLog.unshift(errorInfo);

    // 로그 크기 제한
    if (this.errorLog.length > this.maxLogSize) {
      this.errorLog = this.errorLog.slice(0, this.maxLogSize);
    }

    // Chrome Storage에 에러 로그 저장 (optional)
    this.saveErrorLog();
  }

  /**
   * 에러 로그 저장
   */
  async saveErrorLog() {
    try {
      await chrome.storage.local.set({
        errorLog: this.errorLog.slice(0, 10) // 최근 10개만 저장
      });
    } catch (error) {
      console.error('Failed to save error log:', error);
    }
  }

  /**
   * 에러 로그 가져오기
   */
  async getErrorLog() {
    try {
      const result = await chrome.storage.local.get(['errorLog']);
      return result.errorLog || [];
    } catch (error) {
      console.error('Failed to get error log:', error);
      return [];
    }
  }

  /**
   * 에러 로그 초기화
   */
  async clearErrorLog() {
    this.errorLog = [];
    try {
      await chrome.storage.local.set({ errorLog: [] });
    } catch (error) {
      console.error('Failed to clear error log:', error);
    }
  }

  /**
   * Delay helper
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Chrome API 에러 체크 헬퍼
   */
  static checkChromeError() {
    if (chrome.runtime.lastError) {
      return new Error(chrome.runtime.lastError.message);
    }
    return null;
  }

  /**
   * 안전한 Storage 작업
   */
  static async safeStorageGet(keys, defaultValue = {}) {
    try {
      const result = await chrome.storage.local.get(keys);
      return result;
    } catch (error) {
      console.error('Storage get failed:', error);
      return defaultValue;
    }
  }

  static async safeStorageSet(items) {
    try {
      await chrome.storage.local.set(items);
      return true;
    } catch (error) {
      console.error('Storage set failed:', error);
      return false;
    }
  }

  /**
   * 안전한 메시지 전송 (Background script/Extension context)
   */
  static async safeSendMessage(message, options = {}) {
    return new Promise((resolve) => {
      try {
        chrome.runtime.sendMessage(message, (response) => {
          const error = ErrorHandler.checkChromeError();
          if (error) {
            console.error('Message sending failed:', error);
            resolve({ success: false, error: error.message });
          } else {
            resolve(response || { success: true });
          }
        });
      } catch (error) {
        console.error('Failed to send message:', error);
        resolve({ success: false, error: error.message });
      }

      // Timeout
      if (options.timeout) {
        setTimeout(() => {
          resolve({ success: false, error: 'Timeout' });
        }, options.timeout);
      }
    });
  }

  /**
   * 안전한 탭 메시지 전송 (Content script)
   */
  static async safeTabSendMessage(tabId, message, options = {}) {
    return new Promise((resolve) => {
      try {
        chrome.tabs.sendMessage(tabId, message, (response) => {
          const error = ErrorHandler.checkChromeError();
          if (error) {
            console.error('Tab message sending failed:', error);
            resolve({ success: false, error: error.message });
          } else {
            resolve(response || { success: true });
          }
        });
      } catch (error) {
        console.error('Failed to send tab message:', error);
        resolve({ success: false, error: error.message });
      }

      // Timeout
      if (options.timeout) {
        setTimeout(() => {
          resolve({ success: false, error: 'Timeout' });
        }, options.timeout);
      }
    });
  }

  /**
   * 안전한 탭 쿼리
   */
  static async safeTabQuery(queryInfo) {
    try {
      const tabs = await chrome.tabs.query(queryInfo);
      return tabs;
    } catch (error) {
      console.error('Tab query failed:', error);
      return [];
    }
  }
}
