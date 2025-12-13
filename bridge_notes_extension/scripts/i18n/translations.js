/**
 * BRIDGE Notes - 번역 파일
 * UI 텍스트의 한국어/영어 번역
 */

export const translations = {
  ko: {
    // 헤더
    'header.title': 'BRIDGE Notes',
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
    'tab.pricing': '요금제',

    // 히스토리
    'history.clearAll': '전체삭제',
    'history.empty': '아직 저장된 노트가 없습니다',

    // 푸터
    'footer.settings': '설정',

    // 설정 모달
    'settings.title': '설정',
    'settings.googleLogin': 'Google로 로그인',
    'settings.googleLogout': 'Google에서 로그아웃',
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
    'settings.unlimited': '무제한',

    // 토스트 메시지
    'toast.settingsSaved': '설정이 저장되었습니다!',
    'toast.settingsReset': '설정이 기본값으로 재설정되었습니다!',
    'toast.copied': '클립보드에 복사되었습니다!',
    'toast.historyLoaded': '히스토리에서 불러왔습니다',
    'toast.googleLoginSoon': '구글 로그인 기능은 곧 제공될 예정입니다!',
    'toast.advancedPlanRequired': '다른 언어모델을 사용하려면 Standard100 이상 플랜이 필요합니다.',
    'toast.captureComplete': '캡처가 완료되었습니다!',
    'toast.selectionModeActivated': '범위 선택 모드가 활성화되었습니다!',
    'toast.captureCompleteNoAI': '캡처 완료 (AI 정리 미사용)',
    'toast.noOriginalText': '복사할 원문이 없습니다',
    'toast.originalCopied': '원문이 클립보드에 복사되었습니다!',
    'toast.noResultText': '복사할 결과가 없습니다',
    'toast.resultCopied': '결과가 클립보드에 복사되었습니다!',
    'toast.cachedResultLoaded': '캐시된 결과를 불러왔습니다',
    'toast.aiFailedOriginalAvailable': 'AI 처리에 실패했지만 원본은 사용 가능합니다',
    'toast.selectTone': '어조를 선택해주세요!',
    'toast.toneAdjustFailed': '어조 조정에 실패했습니다',
    'toast.historyLoadFailed': '히스토리 로딩 실패',
    'toast.historyItemDeleted': '히스토리 항목 삭제됨',
    'toast.historyDeleteFailed': '삭제 실패',
    'toast.historyAllDeleted': '히스토리 전체 삭제됨',
    'toast.noUsageRemaining': '사용 가능한 횟수가 없습니다. 플랜을 구매해주세요.',
    'toast.usageRemaining': '남은 사용 횟수: {count}회',
    'toast.usageExhausted': '사용 가능한 횟수를 모두 소진했습니다.',
    'toast.googleLoginProcessing': 'Google 로그인 중...',
    'toast.googleLoginSuccess': '{name}님, 환영합니다!',
    'toast.googleLoginFailed': 'Google 로그인에 실패했습니다.',
    'toast.googleLogoutSuccess': 'Google 로그아웃 완료',

    // 확인 메시지
    'confirm.resetSettings': '모든 설정을 기본값으로 재설정하시겠습니까?',
    'confirm.googleLogout': '{email} 계정에서 로그아웃하시겠습니까?',

    // 메시지 역할 라벨
    'role.user': '사용자',
    'role.ai': 'AI',

    // 플랜/가격
    'pricing.free': '무료',
    'pricing.period.forever': '영구',
    'pricing.period.times': '회',
    'pricing.period.month': '월',
    'pricing.badge.popular': '인기',
    'pricing.feature.usage': '사용횟수',
    'pricing.feature.history': '히스토리 {count}개 저장',
    'pricing.feature.tones': '두 종류의 모델 (개인화/전문화)',
    'pricing.feature.customModel': '사용자 API 지원',
    'pricing.feature.bridgePages': 'BRIDGE Pages 함께 사용',
    'pricing.button.current': '현재 플랜',
    'pricing.button.startFree': '무료로 시작',
    'pricing.button.purchase': '구매하기',
    'pricing.faq.title': '자주 묻는 질문',
    'pricing.faq.q1': '🎫 회권 플랜은 어떻게 사용하나요?',
    'pricing.faq.a1': 'Basic30과 Standard70은 구매 시 사용 횟수가 충전되며, 소진 시까지 사용 가능합니다. 무제한 횟수 사용을 원하시면 MAX 플랜을 선택해주세요.',
    'pricing.faq.q2': '⏱️ MAX 플랜은 언제까지 사용할 수 있나요?',
    'pricing.faq.a2': 'MAX 플랜은 월 구독제로, 매월 자동 갱신됩니다. 언제든지 구독을 취소할 수 있으며, 취소 시 다음 결제일까지 사용 가능합니다.',
    'pricing.faq.q3': '💳 결제 수단은 무엇이 있나요?',
    'pricing.faq.a3': '신용카드, 체크카드, 계좌이체를 지원합니다. 안전한 결제를 위해 PG사를 통해 처리됩니다.',
    'pricing.faq.q4': '🔄 플랜을 변경할 수 있나요?',
    'pricing.faq.a4': '네, 언제든지 상위 플랜으로 업그레이드 가능합니다. 기존 잔여 횟수는 유지되며, 추가 기능을 즉시 사용할 수 있습니다.',
    'pricing.faq.q5': '💰 환불 정책은 어떻게 되나요?',
    'pricing.faq.a5': '구매 후 7일 이내, 사용 전이라면 전액 환불이 가능합니다. 사용 후에는 잔여 횟수에 비례하여 환불해드립니다.',
    'pricing.toast.comingSoon': '플랜 구매 기능은 곧 제공될 예정입니다!',
    'pricing.toast.confirmPurchase': '정말로 {planName} 플랜을 구매하시겠습니까?',
    'pricing.toast.alreadyCurrent': '이미 현재 플랜입니다!',
    'pricing.toast.purchaseSuccess': '{planName} 플랜 구매가 완료되었습니다!',
    'pricing.toast.switchedToFree': '무료 플랜으로 전환되었습니다!',
    'pricing.toast.processing': '결제 처리 중...',
    'pricing.toast.limitReached': '무료 플랜의 사용 제한(5회)에 도달했습니다. 유료 플랜으로 업그레이드하세요!',
    'pricing.confirm.purchase': '{planName}을(를) 구매하시겠습니까?\n\n금액: ₩{price}/{period}\n\n※ 현재는 데모 모드입니다. 실제 결제는 진행되지 않습니다.',
    'pricing.error.payment': '결제 처리 중 오류가 발생했습니다.'
  },

  en: {
    // Header
    'header.title': 'BRIDGE Notes',
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
    'tab.pricing': 'Pricing',

    // History
    'history.clearAll': 'Clear All',
    'history.empty': 'No saved notes yet',

    // Footer
    'footer.settings': 'Settings',

    // Settings modal
    'settings.title': 'Settings',
    'settings.googleLogin': 'Sign in with Google',
    'settings.googleLogout': 'Sign out from Google',
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
    'toast.captureComplete': 'Capture completed!',
    'toast.selectionModeActivated': 'Selection mode activated!',
    'toast.captureCompleteNoAI': 'Capture complete (AI processing disabled)',
    'toast.noOriginalText': 'No original text to copy',
    'toast.originalCopied': 'Original text copied to clipboard!',
    'toast.noResultText': 'No result to copy',
    'toast.resultCopied': 'Result copied to clipboard!',
    'toast.cachedResultLoaded': 'Loaded cached result',
    'toast.aiFailedOriginalAvailable': 'AI processing failed but original text is available',
    'toast.selectTone': 'Please select a tone!',
    'toast.toneAdjustFailed': 'Tone adjustment failed',
    'toast.historyLoadFailed': 'Failed to load history',
    'toast.historyItemDeleted': 'History item deleted',
    'toast.historyDeleteFailed': 'Delete failed',
    'toast.historyAllDeleted': 'All history deleted',
    'toast.noUsageRemaining': 'No usage remaining. Please purchase a plan.',
    'toast.usageRemaining': 'Remaining usage: {count} times',
    'toast.usageExhausted': 'All available usage has been exhausted.',
    'toast.googleLoginProcessing': 'Signing in with Google...',
    'toast.googleLoginSuccess': 'Welcome, {name}!',
    'toast.googleLoginFailed': 'Google sign-in failed.',
    'toast.googleLogoutSuccess': 'Signed out from Google',

    // Confirm messages
    'confirm.resetSettings': 'Reset all settings to defaults?',
    'confirm.googleLogout': 'Sign out from {email}?',

    // Message role labels
    'role.user': 'User',
    'role.ai': 'AI',

    // Pricing/Plans
    'pricing.free': 'Free',
    'pricing.period.forever': 'Forever',
    'pricing.period.times': 'times',
    'pricing.period.month': 'month',
    'pricing.badge.popular': 'Popular',
    'pricing.feature.usage': 'Usage',
    'pricing.feature.history': 'Save {count} history items',
    'pricing.feature.tones': 'Two types of models (Personalized/Professional)',
    'pricing.feature.customModel': 'Custom API support',
    'pricing.feature.bridgePages': 'Use with BRIDGE Pages',
    'pricing.button.current': 'Current Plan',
    'pricing.button.startFree': 'Start Free',
    'pricing.button.purchase': 'Purchase',
    'pricing.faq.title': 'Frequently Asked Questions',
    'pricing.faq.q1': '🎫 How do usage-based plans work?',
    'pricing.faq.a1': 'Basic30 and Standard70 are prepaid plans that give you a set number of uses. They remain valid until depleted. For unlimited usage, choose the MAX plan.',
    'pricing.faq.q2': '⏱️ How long can I use the MAX plan?',
    'pricing.faq.a2': 'MAX plan is a monthly subscription that automatically renews. You can cancel anytime and continue using until the next billing date.',
    'pricing.faq.q3': '💳 What payment methods are supported?',
    'pricing.faq.a3': 'We accept credit cards, debit cards, and bank transfers. All payments are securely processed through our payment gateway.',
    'pricing.faq.q4': '🔄 Can I change my plan?',
    'pricing.faq.a4': 'Yes, you can upgrade to a higher plan anytime. Your remaining usage will be preserved, and additional features become immediately available.',
    'pricing.faq.q5': '💰 What is the refund policy?',
    'pricing.faq.a5': 'Full refunds are available within 7 days of purchase if unused. After use, refunds are prorated based on remaining usage.',
    'pricing.toast.comingSoon': 'Plan purchase feature coming soon!',
    'pricing.toast.confirmPurchase': 'Are you sure you want to purchase the {planName} plan?',
    'pricing.toast.alreadyCurrent': 'This is already your current plan!',
    'pricing.toast.purchaseSuccess': '{planName} plan purchase completed!',
    'pricing.toast.switchedToFree': 'Switched to Free plan!',
    'pricing.toast.processing': 'Processing payment...',
    'pricing.toast.limitReached': 'Free plan usage limit (5 times) reached. Please upgrade to a paid plan!',
    'pricing.confirm.purchase': 'Do you want to purchase {planName}?\n\nPrice: ₩{price}/{period}\n\n※ This is demo mode. No actual payment will be processed.',
    'pricing.error.payment': 'An error occurred while processing payment.'
  }
};
