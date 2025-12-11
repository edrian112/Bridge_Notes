/**
 * History Component
 * Phase 2 - 처리된 노트 히스토리 관리
 */
export class History {
  constructor(historyService, toast = null) {
    this.historyService = historyService;
    this.toast = toast;

    // DOM 요소
    this.historySection = document.getElementById('historySection');
    this.historyList = document.getElementById('historyList');
    this.historyEmpty = document.getElementById('historyEmpty');
    this.clearHistoryBtn = document.getElementById('clearHistoryBtn');

    // 현재 선택된 항목
    this.selectedItem = null;

    // 이벤트 핸들러 바인딩
    this.initEventListeners();
  }

  /**
   * 이벤트 리스너 초기화
   */
  initEventListeners() {
    // 전체 삭제 버튼
    if (this.clearHistoryBtn) {
      this.clearHistoryBtn.addEventListener('click', () => this.handleClearHistory());
    }
  }

  /**
   * 히스토리 목록 렌더링
   */
  async render() {
    try {
      const history = await this.historyService.getHistory();

      if (history.length === 0) {
        this.showEmpty();
        return;
      }

      this.hideEmpty();
      this.historyList.innerHTML = '';

      history.forEach(item => {
        const itemElement = this.createHistoryItem(item);
        this.historyList.appendChild(itemElement);
      });
    } catch (error) {
      console.error('History render error:', error);
      if (this.toast) {
        this.toast.error('히스토리 로딩 실패');
      }
    }
  }

  /**
   * 히스토리 항목 HTML 생성
   * @param {Object} item - 히스토리 항목
   * @returns {HTMLElement}
   */
  createHistoryItem(item) {
    const div = document.createElement('div');
    div.className = 'history-item';
    div.dataset.id = item.id;

    const timeLabel = this.historyService.formatRelativeTime(item.timestamp);
    const toneLabel = item.tone === 'friendly' ? '개인화' : '전문화';

    div.innerHTML = `
      <div class="history-item-header">
        <span class="history-time">${timeLabel}</span>
        <span class="history-meta">${toneLabel}</span>
      </div>
      <div class="history-preview">${item.preview}</div>
      <button class="history-delete-btn" data-id="${item.id}" title="삭제">
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <path d="M10.5 3.5L3.5 10.5M3.5 3.5L10.5 10.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
        </svg>
      </button>
    `;

    // 클릭 이벤트 (항목 선택)
    div.addEventListener('click', (e) => {
      // 삭제 버튼 클릭은 무시
      if (e.target.closest('.history-delete-btn')) return;
      this.handleItemClick(item);
    });

    // 삭제 버튼 이벤트
    const deleteBtn = div.querySelector('.history-delete-btn');
    deleteBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.handleDeleteItem(item.id);
    });

    return div;
  }

  /**
   * 히스토리 항목 클릭 처리
   * @param {Object} item - 선택된 항목
   */
  handleItemClick(item) {
    this.selectedItem = item;

    // ResultArea로 이벤트 발생
    const event = new CustomEvent('historyItemSelected', {
      detail: item
    });
    document.dispatchEvent(event);

    // 결과 탭으로 자동 전환
    const resultTab = document.querySelector('[data-tab="result"]');
    if (resultTab) {
      resultTab.click();
    }
  }

  /**
   * 히스토리 항목 삭제
   * @param {string} id - 삭제할 항목 ID
   */
  async handleDeleteItem(id) {
    try {
      await this.historyService.deleteItem(id);
      await this.render();

      if (this.toast) {
        this.toast.success('히스토리 항목 삭제됨');
      }
    } catch (error) {
      console.error('Delete item error:', error);
      if (this.toast) {
        this.toast.error('삭제 실패');
      }
    }
  }

  /**
   * 전체 히스토리 삭제
   */
  async handleClearHistory() {
    const confirmed = confirm('모든 히스토리를 삭제하시겠습니까?');
    if (!confirmed) return;

    try {
      await this.historyService.clearHistory();
      await this.render();

      if (this.toast) {
        this.toast.success('히스토리 전체 삭제됨');
      }
    } catch (error) {
      console.error('Clear history error:', error);
      if (this.toast) {
        this.toast.error('삭제 실패');
      }
    }
  }

  /**
   * 빈 상태 표시
   */
  showEmpty() {
    if (this.historyList) {
      this.historyList.style.display = 'none';
    }
    if (this.historyEmpty) {
      this.historyEmpty.style.display = 'flex';
    }
    if (this.clearHistoryBtn) {
      this.clearHistoryBtn.disabled = true;
    }
  }

  /**
   * 빈 상태 숨김
   */
  hideEmpty() {
    if (this.historyList) {
      this.historyList.style.display = 'flex';
    }
    if (this.historyEmpty) {
      this.historyEmpty.style.display = 'none';
    }
    if (this.clearHistoryBtn) {
      this.clearHistoryBtn.disabled = false;
    }
  }

  /**
   * 히스토리 목록 새로고침
   */
  async refresh() {
    await this.render();
  }
}
