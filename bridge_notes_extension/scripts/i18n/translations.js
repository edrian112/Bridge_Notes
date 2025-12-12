/**
 * BRIDGE Notes - 번역 파일
 * UI 텍스트의 한국어/영어 번역
 */

export const translations = {
  ko: {
    // 헤더
    'header.title': 'BRIDGE notes',
    'header.subtitle': 'AI와의 대화를 두 클릭으로 캡처',

    // 메인 버튼
    'button.startCapture': '범위 선택 시작',

    // 빈 상태
    'empty.title': '아직 캡처된 내용이 없습니다',
    'empty.description': '위의 "범위 선택 시작" 버튼을 눌러\nAI 대화 내용을 캡처해보세요',

    // 어조 선택
    'tone.friendly': '개인화',
    'tone.formal': '전문화',

    // 결과 영역
    'result.copy': '복사',
    'result.regenerate': '재생성',
    'result.placeholder': 'AI가 정리한 내용이 여기 표시됩니다...',
    'result.loading': 'AI가 노트를 정리하고 있습니다...',

    // 탭
    'tab.main': 'BRIDGE Notes',
    'tab.history': '히스토리',
    'tab.pricing': '플랜',

    // 히스토리
    'history.clearAll': '전체삭제',
    'history.empty': '아직 저장된 노트가 없습니다',

    // 푸터
    'footer.settings': '설정',

    // 설정 모달
    'settings.title': '설정',
    'settings.googleLogin': 'Google로 로그인',
    'settings.language': '언어',
    'settings.plan': '사용 플랜',
    'settings.remaining': '잔여량',
    'settings.theme': '테마',
    'settings.themeSystem': '시스템 설정 따라가기',
    'settings.themeLight': '라이트 모드',
    'settings.themeDark': '다크 모드',
    'settings.useAi': 'AI 정리 사용',
    'settings.advanced': '고급 설정',
    'settings.shiftClick': 'Shift+클릭',
    'settings.shiftClickDiv': '선택 대화의 처음부터',
    'settings.shiftClickText': '선택 대화의 글자부터',
    'settings.apiKey': '사용자 API 키',
    'settings.apiKeyBadge': 'Standard100 이상',
    'settings.apiKeyDesc': 'API 키는 서버에 AES-256-GCM으로 암호화되어 안전하게 저장됩니다.',
    'settings.inputApiKey': '입력 AI 모델 API 키',
    'settings.inputApiKeyDesc': '통찰 정리, 지식 정리 버튼을 눌렀을 때 연결되는 AI',
    'settings.outputApiKey': '출력 AI 모델 API 키',
    'settings.outputApiKeyDesc': '개인화, 전문화 버튼을 눌렀을 때 연결되는 AI',
    'settings.apiKeyPlaceholder': 'sk-ant-... 또는 sk-...',
    'settings.apiKeyDisabled': 'Standard100 이상 플랜에서 사용 가능',
    'settings.info': '정보',
    'settings.infoDesc': 'AI 대화를 두 클릭으로 캡처하고 정리하는 확장 프로그램',
    'settings.supportedSites': '지원 사이트:',
    'settings.copyright': 'Product by BRIDGE',
    'settings.reset': '재설정',
    'settings.save': '저장',
    'settings.devTools': '개발자 도구',
    'settings.devToolsDesc': '플랜 구매 시뮬레이션 (개발 전용)',
    'settings.unlimited': '무제한',

    // 토스트 메시지
    'toast.settingsSaved': '설정이 저장되었습니다!',
    'toast.settingsReset': '설정이 기본값으로 재설정되었습니다!',
    'toast.copied': '클립보드에 복사되었습니다!',
    'toast.historyLoaded': '히스토리에서 불러왔습니다',
    'toast.googleLoginSoon': '구글 로그인 기능은 곧 제공될 예정입니다!',
    'toast.advancedPlanRequired': '다른 언어모델을 사용하려면 Standard100 이상 플랜이 필요합니다.',

    // 확인 메시지
    'confirm.resetSettings': '모든 설정을 기본값으로 재설정하시겠습니까?',

    // 메시지 역할 라벨
    'role.user': '사용자',
    'role.ai': 'AI'
  },

  en: {
    // Header
    'header.title': 'BRIDGE notes',
    'header.subtitle': 'Capture AI conversations in two clicks',

    // Main button
    'button.startCapture': 'Start Selection',

    // Empty state
    'empty.title': 'No captured content yet',
    'empty.description': 'Click the "Start Selection" button above\nto capture AI conversation content',

    // Tone selection
    'tone.friendly': 'Friendly',
    'tone.formal': 'Formal',

    // Result area
    'result.copy': 'Copy',
    'result.regenerate': 'Regenerate',
    'result.placeholder': 'AI-organized content will appear here...',
    'result.loading': 'AI is organizing your notes...',

    // Tabs
    'tab.main': 'BRIDGE Notes',
    'tab.history': 'History',
    'tab.pricing': 'Plans',

    // History
    'history.clearAll': 'Clear All',
    'history.empty': 'No saved notes yet',

    // Footer
    'footer.settings': 'Settings',

    // Settings modal
    'settings.title': 'Settings',
    'settings.googleLogin': 'Sign in with Google',
    'settings.language': 'Language',
    'settings.plan': 'Current Plan',
    'settings.remaining': 'Remaining',
    'settings.theme': 'Theme',
    'settings.themeSystem': 'Follow system settings',
    'settings.themeLight': 'Light mode',
    'settings.themeDark': 'Dark mode',
    'settings.useAi': 'Use AI Processing',
    'settings.advanced': 'Advanced Settings',
    'settings.shiftClick': 'Shift+Click',
    'settings.shiftClickDiv': 'From start of selected message',
    'settings.shiftClickText': 'From clicked character',
    'settings.apiKey': 'Custom API Key',
    'settings.apiKeyBadge': 'Standard100+',
    'settings.apiKeyDesc': 'API keys are securely stored with AES-256-GCM encryption.',
    'settings.inputApiKey': 'Input AI Model API Key',
    'settings.inputApiKeyDesc': 'AI connected when using insight/knowledge buttons',
    'settings.outputApiKey': 'Output AI Model API Key',
    'settings.outputApiKeyDesc': 'AI connected when using friendly/formal buttons',
    'settings.apiKeyPlaceholder': 'sk-ant-... or sk-...',
    'settings.apiKeyDisabled': 'Available for Standard100+ plans',
    'settings.info': 'Information',
    'settings.infoDesc': 'A Chrome extension to capture and organize AI conversations',
    'settings.supportedSites': 'Supported sites:',
    'settings.copyright': 'Product by BRIDGE',
    'settings.reset': 'Reset',
    'settings.save': 'Save',
    'settings.devTools': 'Developer Tools',
    'settings.devToolsDesc': 'Plan purchase simulation (dev only)',
    'settings.unlimited': 'Unlimited',

    // Toast messages
    'toast.settingsSaved': 'Settings saved!',
    'toast.settingsReset': 'Settings reset to defaults!',
    'toast.copied': 'Copied to clipboard!',
    'toast.historyLoaded': 'Loaded from history',
    'toast.googleLoginSoon': 'Google login coming soon!',
    'toast.advancedPlanRequired': 'Standard100+ plan required to use custom AI models.',

    // Confirm messages
    'confirm.resetSettings': 'Reset all settings to defaults?',

    // Message role labels
    'role.user': 'User',
    'role.ai': 'AI'
  }
};
