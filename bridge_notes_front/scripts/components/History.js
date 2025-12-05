/**
 * History Component
 * Phase 2 - 최근 캡처 저장 및 관리
 */
import { ErrorHandler } from './ErrorHandler.js';

export class History {
  constructor(onSelect = null, errorHandler = null, tabNavigation = null) {
    this.historyList = document.getElementById('historyList');
    this.historyCount = document.getElementById('historyCount');
    this.clearAllBtn = document.getElementById('clearAllHistoryBtn');
    this.onSelect = onSelect; // 히스토리 아이템 선택 시 콜백
    this.errorHandler = errorHandler; // ErrorHandler 인스턴스
    this.tabNavigation = tabNavigation; // TabNavigation 인스턴스
    this.maxHistorySize = 10; // 최대 히스토리 개수

    this.init();
  }

  async init() {
    // 전체삭제 버튼 이벤트 리스너
    if (this.clearAllBtn) {
      this.clearAllBtn.addEventListener('click', () => this.clearAll());
    }

    // 저장된 히스토리 불러오기
    await this.load();
  }

  /**
   * Chrome Storage에서 히스토리 불러오기
   */
  async load() {
    try {
      const result = await ErrorHandler.safeStorageGet(['captures']);
      const captures = result.captures || [];

      this.render(captures);
      this.updateCount(captures.length);
    } catch (error) {
      if (this.errorHandler) {
        this.errorHandler.handle(error, 'loadHistory', { silent: true });
      } else {
        console.error('Failed to load history:', error);
      }
    }
  }

  /**
   * 히스토리 리스트 렌더링
   */
  render(captures) {
    if (!this.historyList) return;

    // 빈 상태
    if (captures.length === 0) {
      this.historyList.innerHTML = '<div class="history-empty">아직 캡처한 내용이 없습니다</div>';
      return;
    }

    // 히스토리 아이템 생성 (최근 3개만 표시)
    const recentCaptures = captures.slice(0, 3);
    this.historyList.innerHTML = recentCaptures.map((capture, index) => {
      const preview = this.getPreview(capture.text);
      const timeAgo = this.getTimeAgo(capture.timestamp);

      return `
        <div class="history-item" data-id="${capture.id}">
          <div class="history-item-header">
            <span class="history-item-time">${timeAgo}</span>
            <button class="history-item-delete" data-id="${capture.id}" title="삭제">✕</button>
          </div>
          <div class="history-item-preview">${preview}</div>
        </div>
      `;
    }).join('');

    // 이벤트 리스너 등록
    this.attachEventListeners();
  }

  /**
   * 이벤트 리스너 등록
   */
  attachEventListeners() {
    // 히스토리 아이템 클릭
    this.historyList.querySelectorAll('.history-item').forEach(item => {
      item.addEventListener('click', async (e) => {
        // 삭제 버튼 클릭은 무시
        if (e.target.classList.contains('history-item-delete')) {
          return;
        }

        const id = item.dataset.id;
        await this.loadCapture(id);
      });
    });

    // 삭제 버튼 클릭
    this.historyList.querySelectorAll('.history-item-delete').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const id = btn.dataset.id;
        await this.deleteCapture(id);
      });
    });
  }

  /**
   * 특정 캡처 불러오기
   */
  async loadCapture(id) {
    try {
      const result = await ErrorHandler.safeStorageGet(['captures']);
      const captures = result.captures || [];
      const capture = captures.find(c => c.id === id);

      if (capture && this.onSelect) {
        this.onSelect(capture.text);

        // 메인 탭으로 자동 전환
        if (this.tabNavigation) {
          this.tabNavigation.goToTab('main');
        }
      }
    } catch (error) {
      if (this.errorHandler) {
        this.errorHandler.handle(error, 'loadCapture');
      } else {
        console.error('Failed to load capture:', error);
      }
    }
  }

  /**
   * 특정 캡처 삭제
   */
  async deleteCapture(id) {
    try {
      const result = await ErrorHandler.safeStorageGet(['captures']);
      let captures = result.captures || [];

      // 해당 ID 제외하고 필터링
      captures = captures.filter(c => c.id !== id);

      const saved = await ErrorHandler.safeStorageSet({ captures });

      if (!saved) {
        if (this.errorHandler) {
          this.errorHandler.handle(
            new Error('Failed to save after delete'),
            'deleteCapture'
          );
        }
        return;
      }

      // 리스트 다시 렌더링
      this.render(captures);
      this.updateCount(captures.length);
    } catch (error) {
      if (this.errorHandler) {
        this.errorHandler.handle(error, 'deleteCapture');
      } else {
        console.error('Failed to delete capture:', error);
      }
    }
  }

  /**
   * 히스토리 카운트 업데이트
   */
  updateCount(count) {
    if (this.historyCount) {
      this.historyCount.textContent = count;
    }
  }

  /**
   * 텍스트 미리보기 (첫 100자)
   */
  getPreview(text) {
    if (!text) return '';
    const cleanText = text.replace(/\n/g, ' ').trim();
    return cleanText.length > 100 ? cleanText.substring(0, 100) + '...' : cleanText;
  }

  /**
   * 상대 시간 표시
   */
  getTimeAgo(timestamp) {
    const now = Date.now();
    const diff = now - timestamp;

    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return '방금 전';
    if (minutes < 60) return `${minutes}분 전`;
    if (hours < 24) return `${hours}시간 전`;
    if (days < 7) return `${days}일 전`;

    const date = new Date(timestamp);
    return `${date.getMonth() + 1}/${date.getDate()}`;
  }

  /**
   * 전체 히스토리 삭제
   */
  async clearAll() {
    // 확인 대화상자
    if (!confirm('모든 히스토리를 삭제하시겠습니까?')) {
      return;
    }

    try {
      // 빈 배열로 저장
      const saved = await ErrorHandler.safeStorageSet({ captures: [] });

      if (!saved) {
        if (this.errorHandler) {
          this.errorHandler.handle(
            new Error('Failed to clear history'),
            'clearAll'
          );
        }
        return;
      }

      // 리스트 다시 렌더링
      this.render([]);
      this.updateCount(0);

      console.log('All history cleared');
    } catch (error) {
      if (this.errorHandler) {
        this.errorHandler.handle(error, 'clearAll');
      } else {
        console.error('Failed to clear history:', error);
      }
    }
  }
}
