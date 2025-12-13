/**
 * CacheService - Chrome Storage 기반 결과 캐싱
 * 최근 10개 결과를 LRU 방식으로 관리
 */
export class CacheService {
  constructor() {
    this.maxCacheSize = 10;
    this.cacheExpiryDays = 7;
  }

  /**
   * 텍스트를 해시로 변환
   * @param {string} text
   * @returns {Promise<string>}
   */
  async hashText(text) {
    const encoder = new TextEncoder();
    const data = encoder.encode(text);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    return hashHex.substring(0, 16); // 16자리로 축약
  }

  /**
   * 캐시 키 생성
   * @param {string} text
   * @param {string} template
   * @param {string} tone
   * @returns {Promise<string>}
   */
  async getCacheKey(text, template, tone) {
    const hash = await this.hashText(text);
    return `${hash}_${template}_${tone}`;
  }

  /**
   * 캐시 조회
   * @param {string} text
   * @param {string} template
   * @param {string} tone
   * @returns {Promise<Object|null>}
   */
  async get(text, template, tone) {
    try {
      const cacheKey = await this.getCacheKey(text, template, tone);
      const result = await chrome.storage.local.get(['bridgeNotesCache']);
      const cache = result.bridgeNotesCache || {};

      const cached = cache[cacheKey];

      if (!cached) {
        return null;
      }

      // 만료 확인
      const now = Date.now();
      const expiryTime = this.cacheExpiryDays * 24 * 60 * 60 * 1000;

      if (now - cached.timestamp > expiryTime) {
        // 만료된 캐시 삭제
        await this.remove(cacheKey);
        return null;
      }

      // 접근 시간 업데이트 (LRU)
      cached.lastAccessed = now;
      cache[cacheKey] = cached;
      await chrome.storage.local.set({ bridgeNotesCache: cache });

      return {
        result: cached.result,
        step3Result: cached.step3Result,
        metadata: cached.metadata
      };
    } catch (error) {
      console.error('Cache get error:', error);
      return null;
    }
  }

  /**
   * 캐시 저장
   * @param {string} text
   * @param {string} template
   * @param {string} tone
   * @param {Object} data
   */
  async set(text, template, tone, data) {
    try {
      const cacheKey = await this.getCacheKey(text, template, tone);
      const result = await chrome.storage.local.get(['bridgeNotesCache']);
      let cache = result.bridgeNotesCache || {};

      // 캐시 크기 제한 확인
      const cacheKeys = Object.keys(cache);
      if (cacheKeys.length >= this.maxCacheSize) {
        // LRU: 가장 오래된 접근 항목 삭제
        const oldestKey = cacheKeys.reduce((oldest, key) => {
          if (!oldest || cache[key].lastAccessed < cache[oldest].lastAccessed) {
            return key;
          }
          return oldest;
        }, null);

        if (oldestKey) {
          delete cache[oldestKey];
        }
      }

      // 새 캐시 항목 추가
      const now = Date.now();
      cache[cacheKey] = {
        originalText: text.substring(0, 200), // 200자만 저장 (디버깅용)
        template,
        tone,
        result: data.result,
        step3Result: data.step3Result || '',
        metadata: data.metadata || {},
        timestamp: now,
        lastAccessed: now
      };

      await chrome.storage.local.set({ bridgeNotesCache: cache });
    } catch (error) {
      console.error('Cache set error:', error);
    }
  }

  /**
   * 특정 캐시 항목 삭제
   * @param {string} cacheKey
   */
  async remove(cacheKey) {
    try {
      const result = await chrome.storage.local.get(['bridgeNotesCache']);
      const cache = result.bridgeNotesCache || {};

      if (cache[cacheKey]) {
        delete cache[cacheKey];
        await chrome.storage.local.set({ bridgeNotesCache: cache });
      }
    } catch (error) {
      console.error('Cache remove error:', error);
    }
  }

  /**
   * 전체 캐시 삭제
   */
  async clear() {
    try {
      await chrome.storage.local.remove(['bridgeNotesCache']);
    } catch (error) {
      console.error('Cache clear error:', error);
    }
  }

  /**
   * 캐시 통계 조회
   * @returns {Promise<Object>}
   */
  async getStats() {
    try {
      const result = await chrome.storage.local.get(['bridgeNotesCache']);
      const cache = result.bridgeNotesCache || {};
      const cacheKeys = Object.keys(cache);

      return {
        count: cacheKeys.length,
        maxSize: this.maxCacheSize,
        items: cacheKeys.map(key => ({
          key,
          template: cache[key].template,
          tone: cache[key].tone,
          timestamp: cache[key].timestamp,
          lastAccessed: cache[key].lastAccessed
        }))
      };
    } catch (error) {
      console.error('Cache stats error:', error);
      return { count: 0, maxSize: this.maxCacheSize, items: [] };
    }
  }
}
