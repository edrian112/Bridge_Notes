/**
 * HistoryService - Chrome Storage 기반 노트 히스토리 관리
 * 최근 50개 노트를 시간순으로 관리
 */
export class HistoryService {
  constructor() {
    this.maxHistorySize = 10; // 기본값 (유료)
    this.storageKey = 'bridgeNotesHistory';
    this.initialized = false;
  }

  /**
   * 플랜에 따라 히스토리 제한 설정
   * @param {string} planType - free, basic30, standard70, max
   */
  async initializeWithPlan(planType) {
    if (planType === 'free') {
      this.maxHistorySize = 3;
    } else {
      // basic30, standard70, max 모두 10개
      this.maxHistorySize = 10;
    }
    this.initialized = true;
    console.log(`HistoryService initialized: planType=${planType}, maxHistorySize=${this.maxHistorySize}`);
  }

  /**
   * 히스토리 항목 추가
   * @param {Object} item - 저장할 노트 항목
   * @param {string} item.originalText - 원본 텍스트
   * @param {string} item.processedText - 처리된 텍스트
   * @param {string} item.template - 사용한 템플릿
   * @param {string} item.tone - 사용한 어조
   * @param {Object} item.metadata - 추가 메타데이터
   */
  async addToHistory(item) {
    try {
      // planType 확인 및 초기화
      if (!this.initialized) {
        const result = await chrome.storage.local.get(['planType']);
        const planType = result.planType || 'free';
        await this.initializeWithPlan(planType);
      }

      const history = await this.getHistory();

      const newItem = {
        id: Date.now().toString(),
        timestamp: Date.now(),
        originalText: item.originalText,
        processedText: item.processedText,
        template: item.template || 'knowledge',
        tone: item.tone || 'friendly',
        preview: this.generatePreview(item.processedText),
        metadata: item.metadata || {}
      };

      // 최신 항목을 앞에 추가
      history.unshift(newItem);

      // 최대 개수 제한
      if (history.length > this.maxHistorySize) {
        history.splice(this.maxHistorySize);
      }

      await chrome.storage.local.set({ [this.storageKey]: history });
      return newItem;
    } catch (error) {
      console.error('History add error:', error);
      throw error;
    }
  }

  /**
   * 전체 히스토리 조회
   * @returns {Promise<Array>}
   */
  async getHistory() {
    try {
      const result = await chrome.storage.local.get([this.storageKey]);
      return result[this.storageKey] || [];
    } catch (error) {
      console.error('History get error:', error);
      return [];
    }
  }

  /**
   * 특정 히스토리 항목 조회
   * @param {string} id - 항목 ID
   * @returns {Promise<Object|null>}
   */
  async getItem(id) {
    try {
      const history = await this.getHistory();
      return history.find(item => item.id === id) || null;
    } catch (error) {
      console.error('History getItem error:', error);
      return null;
    }
  }

  /**
   * 히스토리 항목 삭제
   * @param {string} id - 삭제할 항목 ID
   */
  async deleteItem(id) {
    try {
      const history = await this.getHistory();
      const filtered = history.filter(item => item.id !== id);
      await chrome.storage.local.set({ [this.storageKey]: filtered });
    } catch (error) {
      console.error('History delete error:', error);
      throw error;
    }
  }

  /**
   * 전체 히스토리 삭제
   */
  async clearHistory() {
    try {
      await chrome.storage.local.remove([this.storageKey]);
    } catch (error) {
      console.error('History clear error:', error);
      throw error;
    }
  }

  /**
   * 히스토리 통계 조회
   * @returns {Promise<Object>}
   */
  async getStats() {
    try {
      const history = await this.getHistory();
      return {
        count: history.length,
        maxSize: this.maxHistorySize,
        oldestTimestamp: history.length > 0 ? history[history.length - 1].timestamp : null,
        newestTimestamp: history.length > 0 ? history[0].timestamp : null
      };
    } catch (error) {
      console.error('History stats error:', error);
      return { count: 0, maxSize: this.maxHistorySize };
    }
  }

  /**
   * 미리보기 텍스트 생성
   * @param {string} text - 전체 텍스트
   * @returns {string} - 미리보기 (최대 100자)
   */
  generatePreview(text) {
    if (!text) return '';
    const cleaned = text.trim().replace(/\n+/g, ' ');
    return cleaned.length > 100 ? cleaned.substring(0, 100) + '...' : cleaned;
  }

  /**
   * 날짜 포맷팅 (상대 시간)
   * @param {number} timestamp
   * @returns {string}
   */
  formatRelativeTime(timestamp) {
    const now = Date.now();
    const diff = now - timestamp;

    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return '방금 전';
    if (minutes < 60) return `${minutes}분 전`;
    if (hours < 24) return `${hours}시간 전`;
    if (days < 7) return `${days}일 전`;

    // 7일 이상은 날짜 표시
    const date = new Date(timestamp);
    return `${date.getMonth() + 1}/${date.getDate()}`;
  }

  /**
   * 검색
   * @param {string} query - 검색어
   * @returns {Promise<Array>}
   */
  async search(query) {
    try {
      const history = await this.getHistory();
      if (!query || query.trim() === '') return history;

      const lowerQuery = query.toLowerCase();
      return history.filter(item =>
        item.processedText.toLowerCase().includes(lowerQuery) ||
        item.originalText.toLowerCase().includes(lowerQuery) ||
        item.preview.toLowerCase().includes(lowerQuery)
      );
    } catch (error) {
      console.error('History search error:', error);
      return [];
    }
  }
}
