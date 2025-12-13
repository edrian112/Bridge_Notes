/**
 * TabNavigation Component
 * 메인, 히스토리, 과금 페이지 간 탭 전환 및 오버레이 관리
 */

export class TabNavigation {
  constructor() {
    this.tabButtons = document.querySelectorAll('.main-tab-btn');
    this.tabPanes = document.querySelectorAll('.main-tab-pane');
    this.overlay = document.getElementById('tabOverlay');
    this.currentTab = 'main'; // 기본 탭 (메인 화면)

    this.init();
  }

  init() {
    // 탭 버튼 클릭 이벤트
    this.tabButtons.forEach(button => {
      button.addEventListener('click', () => {
        const tabName = button.getAttribute('data-tab');
        this.switchTab(tabName);
      });
    });

    // 초기 탭 표시 (main = 오버레이 숨김)
    this.switchTab(this.currentTab);
  }

  /**
   * 탭 전환 및 오버레이 표시/숨김
   */
  switchTab(tabName) {
    this.currentTab = tabName;

    // 모든 탭 버튼 비활성화
    this.tabButtons.forEach(btn => {
      btn.classList.remove('active');
    });

    // 선택된 탭 버튼 활성화
    const activeButton = document.querySelector(`[data-tab="${tabName}"]`);
    if (activeButton) {
      activeButton.classList.add('active');
    }

    // main 탭인 경우: 오버레이 숨김
    if (tabName === 'main') {
      this.hideOverlay();
    }
    // history 또는 pricing 탭인 경우: 오버레이 표시
    else {
      this.showOverlay(tabName);
    }

    console.log(`Switched to tab: ${tabName}`);
  }

  /**
   * 오버레이 표시 및 컨텐츠 전환
   */
  showOverlay(tabName) {
    if (!this.overlay) return;

    // 모든 탭 패널 비활성화
    this.tabPanes.forEach(pane => {
      pane.classList.remove('active');
      pane.style.display = 'none';
    });

    // 선택된 탭 패널 활성화
    const activePane = document.getElementById(`${tabName}Tab`);
    if (activePane) {
      activePane.classList.add('active');
      activePane.style.display = 'block';
    }

    // 오버레이 표시
    this.overlay.classList.add('active');
  }

  /**
   * 오버레이 숨김
   */
  hideOverlay() {
    if (!this.overlay) return;

    // 오버레이 숨김
    this.overlay.classList.remove('active');

    // 모든 탭 패널 비활성화
    this.tabPanes.forEach(pane => {
      pane.classList.remove('active');
      pane.style.display = 'none';
    });
  }

  /**
   * 현재 활성 탭 가져오기
   */
  getCurrentTab() {
    return this.currentTab;
  }

  /**
   * 특정 탭으로 프로그래매틱하게 전환
   */
  goToTab(tabName) {
    this.switchTab(tabName);
  }
}
