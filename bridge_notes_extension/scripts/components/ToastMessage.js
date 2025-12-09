/**
 * ToastMessage Component
 * Photoshop 스타일 floating toast 메시지
 */
export class ToastMessage {
  constructor(elementId = 'statusMessage') {
    this.element = document.getElementById(elementId);
    if (!this.element) {
      console.error(`Toast element with id '${elementId}' not found`);
    }
  }

  /**
   * 토스트 메시지 표시
   * @param {string} text - 표시할 메시지
   * @param {string} type - 메시지 타입 ('success' | 'error' | 'info')
   * @param {number} duration - 표시 시간 (ms, 기본 3000)
   */
  show(text, type = 'info', duration = 3000) {
    if (!this.element) return;

    this.element.textContent = text;
    this.element.className = `status-message ${type}`;
    this.element.style.display = 'block';

    // 자동 숨김 (duration이 0이면 자동 숨김 안함)
    if (duration > 0) {
      setTimeout(() => {
        this.hide();
      }, duration);
    }
  }

  /**
   * 토스트 메시지 숨김
   */
  hide() {
    if (!this.element) return;
    this.element.style.display = 'none';
  }

  /**
   * 성공 메시지 표시
   */
  success(text, duration = 3000) {
    this.show(text, 'success', duration);
  }

  /**
   * 에러 메시지 표시
   */
  error(text, duration = 3000) {
    this.show(text, 'error', duration);
  }

  /**
   * 경고 메시지 표시
   */
  warning(text, duration = 3000) {
    this.show(text, 'warning', duration);
  }

  /**
   * 정보 메시지 표시
   */
  info(text, duration = 3000) {
    this.show(text, 'info', duration);
  }
}
