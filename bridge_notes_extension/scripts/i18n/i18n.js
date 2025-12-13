/**
 * BRIDGE Notes - i18n (국제화) 유틸리티
 * 동적 언어 전환 지원
 */

import { translations } from './translations.js';

class I18n {
  constructor() {
    this.currentLanguage = 'ko'; // 기본 언어
    this.translations = translations;
    this.listeners = []; // 언어 변경 리스너
  }

  /**
   * 현재 언어 설정
   * @param {string} lang - 'ko' 또는 'en'
   */
  setLanguage(lang) {
    if (this.translations[lang]) {
      this.currentLanguage = lang;
      this.applyTranslations();
      this.notifyListeners(lang);
      console.log(`Language changed to: ${lang}`);
    } else {
      console.warn(`Language '${lang}' not supported, using 'ko'`);
      this.currentLanguage = 'ko';
    }
  }

  /**
   * 현재 언어 가져오기
   * @returns {string}
   */
  getLanguage() {
    return this.currentLanguage;
  }

  /**
   * 번역 텍스트 가져오기
   * @param {string} key - 번역 키 (예: 'header.title')
   * @param {Object} params - 동적 파라미터 (선택적)
   * @returns {string}
   */
  t(key, params = {}) {
    const langData = this.translations[this.currentLanguage] || this.translations['ko'];
    let text = langData[key];

    if (!text) {
      console.warn(`Translation key not found: ${key}`);
      return key;
    }

    // 동적 파라미터 치환 (예: {count})
    Object.keys(params).forEach(param => {
      text = text.replace(new RegExp(`{${param}}`, 'g'), params[param]);
    });

    return text;
  }

  /**
   * DOM에 번역 적용
   * data-i18n 속성을 가진 모든 요소에 번역 적용
   */
  applyTranslations() {
    // data-i18n 속성이 있는 모든 요소 선택
    const elements = document.querySelectorAll('[data-i18n]');

    elements.forEach(el => {
      const key = el.getAttribute('data-i18n');
      const translation = this.t(key);

      // 줄바꿈 처리 (\n을 <br>로 변환)
      if (translation.includes('\n')) {
        el.innerHTML = translation.replace(/\n/g, '<br>');
      } else {
        el.textContent = translation;
      }
    });

    // data-i18n-placeholder 속성 처리
    const placeholderElements = document.querySelectorAll('[data-i18n-placeholder]');
    placeholderElements.forEach(el => {
      const key = el.getAttribute('data-i18n-placeholder');
      el.placeholder = this.t(key);
    });

    // data-i18n-title 속성 처리
    const titleElements = document.querySelectorAll('[data-i18n-title]');
    titleElements.forEach(el => {
      const key = el.getAttribute('data-i18n-title');
      el.title = this.t(key);
    });

    // HTML lang 속성 업데이트
    document.documentElement.lang = this.currentLanguage;
  }

  /**
   * 언어 변경 리스너 등록
   * @param {Function} callback - 언어 변경 시 호출될 콜백
   */
  onLanguageChange(callback) {
    if (typeof callback === 'function') {
      this.listeners.push(callback);
    }
  }

  /**
   * 언어 변경 리스너 제거
   * @param {Function} callback
   */
  offLanguageChange(callback) {
    this.listeners = this.listeners.filter(cb => cb !== callback);
  }

  /**
   * 모든 리스너에게 언어 변경 알림
   * @param {string} lang
   */
  notifyListeners(lang) {
    this.listeners.forEach(callback => {
      try {
        callback(lang);
      } catch (error) {
        console.error('Error in language change listener:', error);
      }
    });
  }

  /**
   * 지원되는 언어 목록
   * @returns {Array}
   */
  getSupportedLanguages() {
    return Object.keys(this.translations);
  }

  /**
   * 특정 요소의 번역 업데이트
   * @param {HTMLElement} element
   */
  translateElement(element) {
    if (!element) return;

    const key = element.getAttribute('data-i18n');
    if (key) {
      const translation = this.t(key);
      if (translation.includes('\n')) {
        element.innerHTML = translation.replace(/\n/g, '<br>');
      } else {
        element.textContent = translation;
      }
    }

    const placeholderKey = element.getAttribute('data-i18n-placeholder');
    if (placeholderKey) {
      element.placeholder = this.t(placeholderKey);
    }

    const titleKey = element.getAttribute('data-i18n-title');
    if (titleKey) {
      element.title = this.t(titleKey);
    }
  }
}

// 싱글톤 인스턴스 생성 및 내보내기
export const i18n = new I18n();
