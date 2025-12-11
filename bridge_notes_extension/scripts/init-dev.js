/**
 * 개발 환경 초기화 스크립트
 * config.local.js가 있으면 자동으로 Webhook URL 설정
 */

// config.local.js를 동적으로 로드 시도
async function initDevEnvironment() {
  try {
    // config.local.js가 있는지 확인
    const config = await import('./config.local.js');

    if (config.WEBHOOK_URL) {
      // Chrome Storage에 Webhook URL 저장
      await chrome.storage.local.set({
        webhookUrl: config.WEBHOOK_URL
      });
      console.log('[Dev] Webhook URL configured from config.local.js');
    }
  } catch (error) {
    // config.local.js가 없으면 무시 (프로덕션 환경)
    console.log('[Production] Using backend server for webhook');
  }
}

// Extension 설치/업데이트 시 자동 실행
chrome.runtime.onInstalled.addListener(() => {
  initDevEnvironment();
});

// Extension 시작 시 실행
initDevEnvironment();
