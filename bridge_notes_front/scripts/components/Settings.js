/**
 * Settings Component
 * Phase 2 - 사용자 설정 관리
 */

import { ErrorHandler } from './ErrorHandler.js';

export class Settings {
  constructor(toast = null, errorHandler = null, onThemeChange = null, apiService = null) {
    this.settingsModal = document.getElementById('settingsModal');
    this.settingsBtn = document.getElementById('settingsBtn');
    this.closeSettingsBtn = document.getElementById('closeSettingsBtn');
    this.saveSettingsBtn = document.getElementById('saveSettingsBtn');
    this.resetSettingsBtn = document.getElementById('resetSettingsBtn');
    this.googleLoginBtn = document.getElementById('googleLoginBtn');

    // 설정 입력 요소
    this.languageSetting = document.getElementById('languageSetting');
    this.defaultTemplateSetting = document.getElementById('defaultTemplateSetting');
    this.defaultToneSetting = document.getElementById('defaultToneSetting');
    this.copyTargetSetting = document.getElementById('copyTargetSetting');
    this.darkModeSetting = document.getElementById('darkModeSetting');

    // 고급 설정 요소
    this.advancedSettingsToggle = document.getElementById('advancedSettingsToggle');
    this.advancedSettingsContent = document.getElementById('advancedSettingsContent');
    this.advancedSettingsBadge = document.getElementById('advancedSettingsBadge');
    this.shiftClickModeSetting = document.getElementById('shiftClickModeSetting');
    // Phase 2: 향후 Standard100+ 플랜용 (사용자 API 키 입력 - HTML에 disabled로 존재)
    this.claudeApiKey = document.getElementById('claudeApiKey');
    this.openaiApiKey = document.getElementById('openaiApiKey');

    this.toast = toast;
    this.errorHandler = errorHandler;
    this.onThemeChange = onThemeChange; // 테마 변경 콜백
    this.apiService = apiService; // Phase 2: API Service for webhook management

    // 기본 설정값
    this.defaultSettings = {
      maxHistory: 3, // 프리 플랜: 3개, 유료 플랜: 10개
      language: 'ko', // 'ko' | 'en'
      defaultTemplate: 'insight',
      defaultTone: 'friendly',
      copyTarget: 'original', // 'original' | 'final' - 클립보드 복사 대상
      shiftClickMode: 'div', // 'div' | 'text' - Shift+클릭 동작
      darkMode: false,
      isPaidPlan: false, // 플랜 상태 (false: 프리, true: 유료)
      planType: 'free', // 'free' | 'basic30' | 'standard100' | 'max'
      remainingUsage: 0, // 잔여 사용 횟수 (월정액은 -1로 표시)
      googleUser: null, // 구글 사용자 정보
      processApiUrl: 'http://161.118.209.89:5678/webhook/bridge-notes', // Phase 2: 우리가 운영하는 n8n Webhook (하드코딩)
      claudeApiKey: '', // Standard100+ 플랜: 사용자 Claude API 키
      openaiApiKey: ''  // Standard100+ 플랜: 사용자 OpenAI API 키
    };

    this.currentSettings = { ...this.defaultSettings };

    this.init();
  }

  async init() {
    // 저장된 설정 불러오기
    await this.load();

    // 이벤트 리스너 등록
    this.attachEventListeners();
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

    // 구글 로그인 버튼
    this.googleLoginBtn.addEventListener('click', () => this.handleGoogleLogin());

    // 다크 모드 실시간 적용
    this.darkModeSetting.addEventListener('change', () => {
      this.applyTheme(this.darkModeSetting.checked);
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
    this.defaultTemplateSetting.value = this.currentSettings.defaultTemplate;
    this.defaultToneSetting.value = this.currentSettings.defaultTone;
    this.copyTargetSetting.value = this.currentSettings.copyTarget;
    this.darkModeSetting.checked = this.currentSettings.darkMode;

    // 고급 설정
    this.shiftClickModeSetting.value = this.currentSettings.shiftClickMode;

    // Phase 2: 향후 사용자 API 키 (현재는 disabled, Standard100+ 플랜용)
    // this.claudeApiKey.value = this.currentSettings.claudeApiKey || '';
    // this.openaiApiKey.value = this.currentSettings.openaiApiKey || '';

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

    // 플랜 정보 텍스트 업데이트 (현재 플랜 강조)
    const planInfoEl = document.getElementById('historyPlanInfo');
    if (planInfoEl) {
      const plans = {
        free: '<strong style="color: #667eea;">Free</strong>',
        basic30: '<strong style="color: #667eea;">Basic30</strong>',
        standard100: '<strong style="color: #667eea;">Standard100</strong>',
        max: '<strong style="color: #667eea;">MAX</strong>'
      };

      planInfoEl.innerHTML = plans[planType] || plans.free;
    }
  }

  /**
   * 잔여 사용 횟수 업데이트
   */
  updateRemainingUsage() {
    const remainingEl = document.getElementById('remainingUsage');
    if (!remainingEl) return;

    const planType = this.currentSettings.planType || 'free';
    const remaining = this.currentSettings.remainingUsage || 0;

    if (planType === 'free') {
      remainingEl.innerHTML = `<strong style="color: #9ca3af;">${remaining}</strong>`;
    } else if (planType === 'max') {
      remainingEl.innerHTML = '<strong style="color: #667eea;">무제한 ∞</strong>';
    } else {
      const color = remaining > 10 ? '#10b981' : remaining > 0 ? '#f59e0b' : '#ef4444';
      remainingEl.innerHTML = `<strong style="color: ${color};">${remaining}</strong>`;
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
      defaultTemplate: this.defaultTemplateSetting.value,
      defaultTone: this.defaultToneSetting.value,
      copyTarget: this.copyTargetSetting.value,
      shiftClickMode: this.shiftClickModeSetting.value,
      darkMode: this.darkModeSetting.checked,
      isPaidPlan: this.currentSettings.isPaidPlan,
      planType: this.currentSettings.planType,
      remainingUsage: this.currentSettings.remainingUsage,
      googleUser: this.currentSettings.googleUser,
      processApiUrl: this.currentSettings.processApiUrl, // 하드코딩된 URL 유지
      claudeApiKey: this.currentSettings.claudeApiKey, // 향후 사용
      openaiApiKey: this.currentSettings.openaiApiKey  // 향후 사용
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

      // Phase 2: Webhook URL을 APIService에 저장
      if (this.apiService && newSettings.processApiUrl) {
        try {
          await this.apiService.setWebhookUrl(newSettings.processApiUrl);
          console.log("Webhook URL updated in APIService");
        } catch (error) {
          console.error("Failed to update webhook URL:", error);
          if (this.toast) {
            this.toast.warning("설정은 저장되었으나 Webhook URL 형식을 확인해주세요");
          }
        }
      }

      // 테마 적용
      this.applyTheme(newSettings.darkMode);

      // 성공 메시지
      if (this.toast) {
        this.toast.success('설정이 저장되었습니다!');
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
      const result = await ErrorHandler.safeStorageGet(['settings']);

      if (result.settings) {
        this.currentSettings = {
          ...this.defaultSettings,
          ...result.settings
        };
      } else {
        this.currentSettings = { ...this.defaultSettings };
      }

      // 테마 적용
      this.applyTheme(this.currentSettings.darkMode);

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
      const confirmed = confirm('모든 설정을 기본값으로 재설정하시겠습니까?');
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
        this.toast.success('설정이 기본값으로 재설정되었습니다!');
      }

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
      if (key === 'darkMode') {
        this.applyTheme(value);
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
   * 구글 로그인 버튼 상태 업데이트
   */
  updateGoogleLoginButton() {
    if (!this.googleLoginBtn) return;

    if (this.currentSettings.googleUser) {
      // 로그인된 상태
      this.googleLoginBtn.innerHTML = `
        <svg width="18" height="18" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg">
          <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z" fill="#4285F4"/>
          <path d="M9.003 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.96v2.332C2.438 15.983 5.482 18 9.003 18z" fill="#34A853"/>
          <path d="M3.964 10.712c-.18-.54-.282-1.117-.282-1.71 0-.593.102-1.17.282-1.71V4.96H.957C.347 6.175 0 7.55 0 9.002c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
          <path d="M9.003 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.464.891 11.426 0 9.003 0 5.482 0 2.438 2.017.96 4.958L3.967 7.29c.708-2.127 2.692-3.71 5.036-3.71z" fill="#EA4335"/>
        </svg>
        <span>${this.currentSettings.googleUser.name || this.currentSettings.googleUser.email}</span>
      `;
      this.googleLoginBtn.style.background = '#f0f7ff';
      this.googleLoginBtn.style.borderColor = '#4285F4';
    } else {
      // 로그아웃 상태
      this.googleLoginBtn.innerHTML = `
        <svg width="18" height="18" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg">
          <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z" fill="#4285F4"/>
          <path d="M9.003 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.96v2.332C2.438 15.983 5.482 18 9.003 18z" fill="#34A853"/>
          <path d="M3.964 10.712c-.18-.54-.282-1.117-.282-1.71 0-.593.102-1.17.282-1.71V4.96H.957C.347 6.175 0 7.55 0 9.002c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
          <path d="M9.003 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.464.891 11.426 0 9.003 0 5.482 0 2.438 2.017.96 4.958L3.967 7.29c.708-2.127 2.692-3.71 5.036-3.71z" fill="#EA4335"/>
        </svg>
        <span>Google로 로그인</span>
      `;
      this.googleLoginBtn.style.background = '';
      this.googleLoginBtn.style.borderColor = '';
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
      this.processApiUrl.placeholder = 'https://다른-언어모델-주소.com/정리';
      this.finalApiUrl.placeholder = 'https://다른-언어모델-주소.com/말투변경';
      this.advancedSettingsBadge.textContent = 'Standard100 이상';
      this.advancedSettingsBadge.classList.remove('free');
    } else {
      // Free, Basic30 플랜: 입력 불가 (보기만 가능)
      this.processApiUrl.disabled = true;
      this.finalApiUrl.disabled = true;
      this.processApiUrl.placeholder = 'Standard100 이상 플랜에서 사용 가능';
      this.finalApiUrl.placeholder = 'Standard100 이상 플랜에서 사용 가능';
      this.advancedSettingsBadge.textContent = 'Standard100 이상';
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
        this.toast.info('다른 언어모델을 사용하려면 Standard100 이상 플랜이 필요합니다.', 3000);
      }
    }
  }

  /**
   * 구글 로그인 처리
   */
  async handleGoogleLogin() {
    // TODO: 실제 구글 OAuth 로그인 구현
    if (this.toast) {
      this.toast.info('구글 로그인 기능은 곧 제공될 예정입니다!', 3000);
    }

    console.log('Google login requested');

    // 임시: 로그인 시뮬레이션 (개발 단계)
    // this.currentSettings.googleUser = {
    //   email: 'user@example.com',
    //   name: 'Test User'
    // };
    // this.updateGoogleLoginButton();
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
        this.toast.error('사용 가능한 횟수가 없습니다. 플랜을 구매해주세요.');
      }
      return false;
    }

    // 1회 차감
    await this.updateSetting('remainingUsage', remaining - 1);

    // 횟수가 떨어지면 알림
    if (remaining - 1 <= 5 && remaining - 1 > 0) {
      if (this.toast) {
        this.toast.info(`남은 사용 횟수: ${remaining - 1}회`, 3000);
      }
    } else if (remaining - 1 === 0) {
      if (this.toast) {
        this.toast.error('사용 가능한 횟수를 모두 소진했습니다.');
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
