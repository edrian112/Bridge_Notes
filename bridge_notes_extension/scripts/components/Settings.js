/**
 * Settings Component
 * Phase 2 - 사용자 설정 관리
 */

import { ErrorHandler } from './ErrorHandler.js';
import { i18n } from '../i18n/i18n.js';
import { GoogleAuthService } from '../services/GoogleAuthService.js';

export class Settings {
  constructor(toast = null, errorHandler = null, onThemeChange = null, apiService = null) {
    this.googleAuthService = new GoogleAuthService();
    this.settingsModal = document.getElementById('settingsModal');
    this.settingsBtn = document.getElementById('settingsBtn');
    this.closeSettingsBtn = document.getElementById('closeSettingsBtn');
    this.saveSettingsBtn = document.getElementById('saveSettingsBtn');
    this.resetSettingsBtn = document.getElementById('resetSettingsBtn');

    // Google 로그인 관련 요소
    this.googleLoginBtn = document.getElementById('googleLoginBtn');
    this.googleProfileArea = document.getElementById('googleProfileArea');
    this.profileAvatarBtn = document.getElementById('profileAvatarBtn');
    this.profileAvatar = document.getElementById('profileAvatar');
    this.profilePlanType = document.getElementById('profilePlanType');
    this.profileRemaining = document.getElementById('profileRemaining');

    // 설정 입력 요소
    this.languageSetting = document.getElementById('languageSetting');
    this.themeModeSetting = document.getElementById('themeModeSetting');
    this.useAiProcessingSetting = document.getElementById('useAiProcessingSetting');

    // 고급 설정 요소
    this.advancedSettingsToggle = document.getElementById('advancedSettingsToggle');
    this.advancedSettingsContent = document.getElementById('advancedSettingsContent');
    this.advancedSettingsBadge = document.getElementById('advancedSettingsBadge');
    this.shiftClickModeSetting = document.getElementById('shiftClickModeSetting');
    this.processApiUrl = document.getElementById('processApiUrl'); // 사용자 입력: 입력 AI 주소
    this.finalApiUrl = document.getElementById('finalApiUrl'); // 사용자 입력: 출력 AI 주소

    this.toast = toast;
    this.errorHandler = errorHandler;
    this.onThemeChange = onThemeChange; // 테마 변경 콜백
    this.apiService = apiService; // Phase 2: API Service for webhook management

    // 기본 설정값
    this.defaultSettings = {
      maxHistory: 3, // 프리 플랜: 3개, 유료 플랜: 10개
      language: 'ko', // 'ko' | 'en'
      shiftClickMode: 'div', // 'div' | 'text' - Shift+클릭 동작
      themeMode: 'system', // 'system' | 'light' | 'dark' - 테마 모드
      useAiProcessing: true, // AI 정리 기능 사용 여부
      isPaidPlan: false, // 플랜 상태 (false: 프리, true: 유료)
      planType: 'free', // 'free' | 'basic30' | 'standard100' | 'max'
      remainingUsage: 0, // 잔여 사용 횟수 (월정액은 -1로 표시)
      googleUser: null, // 구글 사용자 정보
      webhookUrl: '', // Phase 2: n8n Webhook URL (환경별 설정)
      processApiUrl: '', // Standard100+ 플랜: 사용자 입력 AI 주소 (입력 처리용)
      finalApiUrl: '' // Standard100+ 플랜: 사용자 출력 AI 주소 (어조 조정용)
    };

    this.currentSettings = { ...this.defaultSettings };

    this.init();
  }

  async init() {
    // 저장된 설정 불러오기
    await this.load();

    // 이벤트 리스너 등록
    this.attachEventListeners();

    // 시스템 테마 변경 감지
    const darkModeMediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    darkModeMediaQuery.addEventListener('change', (e) => {
      if (this.currentSettings.themeMode === 'system') {
        this.applyTheme(e.matches);
      }
    });

    // 언어 변경 감지 (다른 컴포넌트에서 언어 변경 시 Settings UI도 업데이트)
    i18n.onLanguageChange((lang) => {
      this.updateAdvancedSettingsAccess(); // placeholder 업데이트
      this.updateSelectOptions(); // select 옵션 텍스트 업데이트
      this.updateGoogleLoginButton(); // Google 로그인 버튼 텍스트 업데이트
    });

    // 플랜 업데이트 이벤트 리스너 (Pricing 탭에서 플랜 구매 시)
    window.addEventListener('planUpdated', async (event) => {
      await this.load(); // 설정 다시 로드
      this.updatePlanInfo(); // 프로필 영역 플랜 정보 업데이트
    });

    // 로그인 상태 초기화 (백그라운드에서 체크)
    this.initializeGoogleAuth();
  }

  /**
   * Google OAuth 초기화 (로그인 상태 복원)
   */
  async initializeGoogleAuth() {
    try {
      const user = await this.googleAuthService.checkLoginStatus();
      if (user) {
        this.currentSettings.googleUser = user;
        this.updateGoogleLoginButton();
        console.log('Google login restored:', user.email);
      }
    } catch (error) {
      console.error('Failed to initialize Google auth:', error);
    }
  }

  /**
   * 이벤트 리스너 등록
   */
  attachEventListeners() {
    // 설정 열기
    this.settingsBtn.addEventListener('click', () => this.open());

    // 설정 닫기
    this.closeSettingsBtn.addEventListener('click', () => this.close());

    // 오버레이 클릭 시 닫기
    this.settingsModal.querySelector('.settings-modal-overlay').addEventListener('click', () => {
      this.close();
    });

    // ESC 키로 닫기
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.isOpen()) {
        this.close();
      }
    });

    // 저장 버튼
    this.saveSettingsBtn.addEventListener('click', () => this.save());

    // 재설정 버튼
    this.resetSettingsBtn.addEventListener('click', () => this.reset());

    // 구글 로그인/로그아웃 버튼
    this.googleLoginBtn.addEventListener('click', () => this.handleGoogleLogin());
    this.profileAvatarBtn.addEventListener('click', () => this.handleGoogleLogout());

    // 테마 모드 실시간 적용
    this.themeModeSetting.addEventListener('change', () => {
      const themeMode = this.themeModeSetting.value;
      if (themeMode === 'system') {
        const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        this.applyTheme(isDark);
      } else {
        this.applyTheme(themeMode === 'dark');
      }
    });

    // 언어 설정 실시간 적용
    this.languageSetting.addEventListener('change', () => {
      const language = this.languageSetting.value;
      i18n.setLanguage(language);
      // select 옵션 텍스트도 번역 적용
      this.updateSelectOptions();
    });

    // 고급 설정 토글
    this.advancedSettingsToggle.addEventListener('click', () => {
      this.toggleAdvancedSettings();
    });
  }

  /**
   * 설정 모달 열기
   */
  open() {
    this.settingsModal.style.display = 'flex';

    // 현재 설정값을 UI에 반영
    this.renderSettings();
  }

  /**
   * 설정 모달 닫기
   */
  close() {
    this.settingsModal.style.display = 'none';
  }

  /**
   * 모달이 열려있는지 확인
   */
  isOpen() {
    return this.settingsModal.style.display === 'flex';
  }

  /**
   * 현재 설정값을 UI에 렌더링
   */
  renderSettings() {
    this.languageSetting.value = this.currentSettings.language;
    this.themeModeSetting.value = this.currentSettings.themeMode;
    this.useAiProcessingSetting.checked = this.currentSettings.useAiProcessing !== false;

    // 고급 설정
    this.shiftClickModeSetting.value = this.currentSettings.shiftClickMode;

    // Phase 2: 사용자 API 주소 (Standard100+ 플랜용)
    if (this.processApiUrl) {
      this.processApiUrl.value = this.currentSettings.processApiUrl || '';
    }
    if (this.finalApiUrl) {
      this.finalApiUrl.value = this.currentSettings.finalApiUrl || '';
    }

    // 구글 로그인 버튼 상태 업데이트
    this.updateGoogleLoginButton();

    // 플랜에 따른 히스토리 설정 업데이트
    this.updateHistorySettings();

    // 잔여 사용 횟수 업데이트
    this.updateRemainingUsage();

    // 고급 설정 뱃지 및 버튼 상태 업데이트
    this.updateAdvancedSettingsAccess();
  }

  /**
   * 플랜에 따른 히스토리 설정 업데이트
   */
  updateHistorySettings() {
    const planType = this.currentSettings.planType || 'free';
    const isPaid = planType !== 'free';
    const maxHistory = isPaid ? 10 : 3;

    // 플랜이 변경되면 maxHistory 자동 업데이트
    if (this.currentSettings.maxHistory !== maxHistory) {
      this.currentSettings.maxHistory = maxHistory;
    }

    // isPaidPlan 상태도 동기화
    this.currentSettings.isPaidPlan = isPaid;

    // 프로필 영역 플랜 정보 업데이트 (로그인 상태일 때만)
    if (this.currentSettings.googleUser) {
      this.updatePlanInfo();
    }
  }

  /**
   * 잔여 사용 횟수 업데이트
   */
  updateRemainingUsage() {
    // 프로필 영역 플랜 정보 업데이트 (로그인 상태일 때만)
    if (this.currentSettings.googleUser) {
      this.updatePlanInfo();
    }
  }

  /**
   * UI에서 설정값 읽기
   */
  readSettingsFromUI() {
    // maxHistory는 플랜에 따라 자동 설정
    const planType = this.currentSettings.planType || 'free';
    const maxHistory = planType !== 'free' ? 10 : 3;

    return {
      maxHistory: maxHistory,
      language: this.languageSetting.value,
      shiftClickMode: this.shiftClickModeSetting.value,
      themeMode: this.themeModeSetting.value,
      useAiProcessing: this.useAiProcessingSetting.checked,
      isPaidPlan: this.currentSettings.isPaidPlan,
      planType: this.currentSettings.planType,
      remainingUsage: this.currentSettings.remainingUsage,
      googleUser: this.currentSettings.googleUser,
      webhookUrl: this.currentSettings.webhookUrl, // 하드코딩된 n8n Webhook URL
      processApiUrl: this.processApiUrl?.value.trim() || '', // 사용자 입력 AI 주소
      finalApiUrl: this.finalApiUrl?.value.trim() || '' // 사용자 출력 AI 주소
    };
  }

  /**
   * 설정 저장
   */
  async save() {
    try {
      // UI에서 설정값 읽기
      const newSettings = this.readSettingsFromUI();

      // Chrome Storage에 저장
      const saved = await ErrorHandler.safeStorageSet({ settings: newSettings });

      if (!saved) {
        if (this.errorHandler) {
          this.errorHandler.handle(
            new Error('Failed to save settings'),
            'saveSettings',
            { customMessage: '설정 저장에 실패했습니다.' }
          );
        }
        return;
      }

      // 현재 설정 업데이트
      this.currentSettings = newSettings;

      // 테마 적용
      if (newSettings.themeMode === 'system') {
        const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        this.applyTheme(isDark);
      } else {
        this.applyTheme(newSettings.themeMode === 'dark');
      }

      // 성공 메시지
      if (this.toast) {
        this.toast.success(i18n.t('toast.settingsSaved'));
      }

      // 모달 닫기
      this.close();

      console.log('Settings saved:', this.currentSettings);
    } catch (error) {
      if (this.errorHandler) {
        this.errorHandler.handle(error, 'saveSettings');
      } else {
        console.error('Failed to save settings:', error);
      }
    }
  }

  /**
   * 설정 불러오기
   */
  async load() {
    try {
      // settings 객체와 최상위 플랜 정보 모두 가져오기
      const result = await ErrorHandler.safeStorageGet(['settings', 'planType', 'remainingUsage', 'planPurchaseDate']);

      if (result.settings) {
        this.currentSettings = {
          ...this.defaultSettings,
          ...result.settings
        };
      } else {
        this.currentSettings = { ...this.defaultSettings };
      }

      // Pricing.js에서 저장한 최상위 키 확인 (우선순위: 최상위 > settings 내부)
      if (result.planType !== undefined) {
        this.currentSettings.planType = result.planType;
      }
      if (result.remainingUsage !== undefined) {
        this.currentSettings.remainingUsage = result.remainingUsage;
      }
      if (result.planPurchaseDate !== undefined) {
        this.currentSettings.planPurchaseDate = result.planPurchaseDate;
      }

      // 테마 적용
      if (this.currentSettings.themeMode === 'system') {
        const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        this.applyTheme(isDark);
      } else {
        this.applyTheme(this.currentSettings.themeMode === 'dark');
      }

      console.log('Settings loaded:', this.currentSettings);
    } catch (error) {
      if (this.errorHandler) {
        this.errorHandler.handle(error, 'loadSettings', { silent: true });
      } else {
        console.error('Failed to load settings:', error);
      }

      // 에러 시 기본값 사용
      this.currentSettings = { ...this.defaultSettings };
    }
  }

  /**
   * 기본값으로 재설정
   */
  async reset() {
    try {
      // 확인 메시지
      const confirmed = confirm(i18n.t('confirm.resetSettings'));
      if (!confirmed) return;

      // 기본값으로 설정
      this.currentSettings = { ...this.defaultSettings };

      // Chrome Storage에 저장
      const saved = await ErrorHandler.safeStorageSet({ settings: this.currentSettings });

      if (!saved) {
        if (this.errorHandler) {
          this.errorHandler.handle(
            new Error('Failed to reset settings'),
            'resetSettings',
            { customMessage: '설정 재설정에 실패했습니다.' }
          );
        }
        return;
      }

      // UI 업데이트
      this.renderSettings();

      // 테마 적용
      this.applyTheme(this.currentSettings.darkMode);

      // 성공 메시지
      if (this.toast) {
        this.toast.success(i18n.t('toast.settingsReset'));
      }

      // 언어도 기본값(ko)으로 재설정
      i18n.setLanguage('ko');
      this.updateSelectOptions();

      console.log('Settings reset to default');
    } catch (error) {
      if (this.errorHandler) {
        this.errorHandler.handle(error, 'resetSettings');
      } else {
        console.error('Failed to reset settings:', error);
      }
    }
  }

  /**
   * 테마 적용
   */
  applyTheme(isDarkMode) {
    if (isDarkMode) {
      document.body.classList.add('dark-mode');
    } else {
      document.body.classList.remove('dark-mode');
    }

    // 테마 변경 콜백 호출
    if (this.onThemeChange) {
      this.onThemeChange(isDarkMode);
    }
  }

  /**
   * 현재 설정 가져오기
   */
  getSettings() {
    return { ...this.currentSettings };
  }

  /**
   * 특정 설정값 가져오기
   */
  getSetting(key) {
    return this.currentSettings[key];
  }

  /**
   * 특정 설정값 업데이트 (프로그래매틱)
   */
  async updateSetting(key, value) {
    try {
      this.currentSettings[key] = value;

      // 플랜 타입 변경 시 처리
      if (key === 'planType') {
        this.updateHistorySettings();
        this.updateRemainingUsage();
        this.updateAdvancedSettingsAccess();
      }

      // 잔여 사용 횟수 변경 시 처리
      if (key === 'remainingUsage') {
        this.updateRemainingUsage();
      }

      // 레거시 isPaidPlan 변경 시 처리 (하위 호환성)
      if (key === 'isPaidPlan') {
        const newMaxHistory = value ? 10 : 3;
        this.currentSettings.maxHistory = newMaxHistory;
        this.updateHistorySettings();
        this.updateAdvancedSettingsAccess();
      }

      const saved = await ErrorHandler.safeStorageSet({ settings: this.currentSettings });

      if (!saved) {
        throw new Error('Failed to save setting');
      }

      // 테마 설정이 변경된 경우
      if (key === 'themeMode') {
        if (value === 'system') {
          const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
          this.applyTheme(isDark);
        } else {
          this.applyTheme(value === 'dark');
        }
      }

      console.log(`Setting updated: ${key} = ${value}`);
      return true;
    } catch (error) {
      if (this.errorHandler) {
        this.errorHandler.handle(error, 'updateSetting', { silent: true });
      }
      return false;
    }
  }

  /**
   * 구글 로그인 버튼/프로필 카드 상태 업데이트
   */
  updateGoogleLoginButton() {
    if (!this.googleLoginBtn || !this.googleProfileArea) return;

    if (this.currentSettings.googleUser) {
      // 로그인된 상태 - 프로필 영역 표시
      this.googleLoginBtn.style.display = 'none';
      this.googleProfileArea.style.display = 'block';

      // 프로필 이미지 설정 (Google 제공 이미지 또는 기본 아바타)
      const user = this.currentSettings.googleUser;
      if (user.picture) {
        this.profileAvatar.src = user.picture;
      } else {
        // 기본 아바타 (첫 글자로 생성)
        const initial = (user.name || user.email).charAt(0).toUpperCase();
        this.profileAvatar.alt = initial;
        // SVG 데이터 URI로 기본 아바타 생성 (Google 스타일 색상)
        const svg = `data:image/svg+xml,${encodeURIComponent(`
          <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40">
            <rect width="40" height="40" fill="%234285f4"/>
            <text x="50%" y="50%" font-size="18" font-weight="500" fill="white" text-anchor="middle" dominant-baseline="central" font-family="system-ui, -apple-system, sans-serif">
              ${initial}
            </text>
          </svg>
        `)}`;
        this.profileAvatar.src = svg;
      }

      // 플랜 타입과 잔여량 업데이트
      this.updatePlanInfo();
    } else {
      // 로그아웃 상태 - 로그인 버튼 표시
      this.googleLoginBtn.style.display = 'flex';
      this.googleProfileArea.style.display = 'none';
    }
  }

  /**
   * 플랜 정보 업데이트 (프로필 영역)
   */
  updatePlanInfo() {
    const planType = this.currentSettings.planType || 'free';
    const remaining = this.currentSettings.remainingUsage;

    // 플랜 타입 표시 (Pricing.js와 일치)
    const planNames = {
      'free': 'Free',
      'basic30': 'Basic30',
      'standard70': 'Standard70',
      'max': 'MAX'
    };
    this.profilePlanType.textContent = planNames[planType] || 'Free';

    // 잔여량 표시
    if (planType === 'free' || planType === 'max') {
      this.profileRemaining.textContent = '∞';
    } else {
      this.profileRemaining.textContent = remaining || 0;
    }
  }

  /**
   * 고급 설정 접근 권한 업데이트
   */
  updateAdvancedSettingsAccess() {
    const isPaid = this.currentSettings.isPaidPlan;

    if (isPaid) {
      // Standard100 이상 플랜: 입력 가능
      this.processApiUrl.disabled = false;
      this.finalApiUrl.disabled = false;
      this.processApiUrl.placeholder = i18n.t('settings.apiKeyPlaceholder');
      this.finalApiUrl.placeholder = i18n.t('settings.apiKeyPlaceholder');
      this.advancedSettingsBadge.textContent = i18n.t('settings.apiKeyBadge');
      this.advancedSettingsBadge.classList.remove('free');
    } else {
      // Free, Basic30 플랜: 입력 불가 (보기만 가능)
      this.processApiUrl.disabled = true;
      this.finalApiUrl.disabled = true;
      this.processApiUrl.placeholder = i18n.t('settings.apiKeyDisabled');
      this.finalApiUrl.placeholder = i18n.t('settings.apiKeyDisabled');
      this.advancedSettingsBadge.textContent = i18n.t('settings.apiKeyBadge');
      this.advancedSettingsBadge.classList.add('free');
    }
  }

  /**
   * 고급 설정 토글
   */
  toggleAdvancedSettings() {
    const isOpen = this.advancedSettingsContent.style.display === 'block';

    if (isOpen) {
      // 닫기
      this.advancedSettingsContent.style.display = 'none';
      this.advancedSettingsToggle.classList.remove('open');
    } else {
      // 열기
      this.advancedSettingsContent.style.display = 'block';
      this.advancedSettingsToggle.classList.add('open');

      // Free, Basic30 플랜이면 안내 메시지 표시
      if (!this.currentSettings.isPaidPlan && this.toast) {
        this.toast.info(i18n.t('toast.advancedPlanRequired'), 3000);
      }
    }
  }

  /**
   * Select 옵션 텍스트 업데이트 (언어 변경 시)
   */
  updateSelectOptions() {
    // 테마 모드 옵션
    const themeOptions = this.themeModeSetting.querySelectorAll('option');
    themeOptions.forEach(option => {
      const key = option.getAttribute('data-i18n');
      if (key) {
        option.textContent = i18n.t(key);
      }
    });

    // Shift+클릭 옵션
    const shiftClickOptions = this.shiftClickModeSetting.querySelectorAll('option');
    shiftClickOptions.forEach(option => {
      const key = option.getAttribute('data-i18n');
      if (key) {
        option.textContent = i18n.t(key);
      }
    });
  }

  /**
   * 구글 로그인 처리
   */
  async handleGoogleLogin() {
    try {
      // 로그인 시도
      if (this.toast) {
        this.toast.info(i18n.t('toast.googleLoginProcessing'));
      }

      const user = await this.googleAuthService.login();
      this.currentSettings.googleUser = user;
      this.updateGoogleLoginButton();

      if (this.toast) {
        this.toast.success(
          i18n.t('toast.googleLoginSuccess')
            .replace('{name}', user.name || user.email)
        );
      }
    } catch (error) {
      console.error('Google login error:', error);

      if (this.toast) {
        this.toast.error(i18n.t('toast.googleLoginFailed'));
      }

      if (this.errorHandler) {
        this.errorHandler.handle(error, 'handleGoogleLogin');
      }
    }
  }

  /**
   * 구글 로그아웃 처리
   */
  async handleGoogleLogout() {
    try {
      const currentUser = this.currentSettings.googleUser;
      if (!currentUser) return;

      // 로그아웃 확인
      const confirmed = confirm(
        i18n.t('confirm.googleLogout')
          .replace('{email}', currentUser.email)
      );

      if (!confirmed) return;

      // GoogleAuthService로 로그아웃 (Storage 제거 + 토큰 revoke)
      await this.googleAuthService.logout();

      // currentSettings 업데이트
      this.currentSettings.googleUser = null;

      // UI 업데이트
      this.updateGoogleLoginButton();

      if (this.toast) {
        this.toast.success(i18n.t('toast.googleLogoutSuccess'));
      }
    } catch (error) {
      console.error('Google logout error:', error);

      if (this.toast) {
        this.toast.error(i18n.t('toast.googleLoginFailed'));
      }

      if (this.errorHandler) {
        this.errorHandler.handle(error, 'handleGoogleLogout');
      }
    }
  }

  /**
   * 사용 횟수 차감 (파이널텍스트 생성 시 호출)
   */
  async decrementUsage() {
    const planType = this.currentSettings.planType || 'free';

    // 프리 플랜이나 월정액은 차감하지 않음
    if (planType === 'free' || planType === 'max') {
      return true;
    }

    // 30회권, 100회권은 차감
    const remaining = this.currentSettings.remainingUsage || 0;

    if (remaining <= 0) {
      if (this.toast) {
        this.toast.error(i18n.t('toast.noUsageRemaining'));
      }
      return false;
    }

    // 1회 차감
    await this.updateSetting('remainingUsage', remaining - 1);

    // 횟수가 떨어지면 알림
    if (remaining - 1 <= 5 && remaining - 1 > 0) {
      if (this.toast) {
        this.toast.info(i18n.t('toast.usageRemaining').replace('{count}', remaining - 1), 3000);
      }
    } else if (remaining - 1 === 0) {
      if (this.toast) {
        this.toast.error(i18n.t('toast.usageExhausted'));
      }
    }

    return true;
  }

  /**
   * 사용 가능 여부 확인
   */
  canUseService() {
    const planType = this.currentSettings.planType || 'free';
    const remaining = this.currentSettings.remainingUsage || 0;

    // 프리 플랜은 항상 사용 가능
    if (planType === 'free') {
      return true;
    }

    // 월정액은 항상 사용 가능
    if (planType === 'max') {
      return true;
    }

    // 30회권, 100회권은 잔여 횟수 확인
    return remaining > 0;
  }
}
