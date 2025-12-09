// BRIDGE notes - Background Service Worker
// Phase 1: 기본 메시지 처리 및 Side Panel 관리

// Extension 설치 시
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    console.log('BRIDGE notes installed!');

    // 초기 설정
    chrome.storage.local.set({
      captures: [],
      settings: {
        autoSave: true,
        maxCaptures: 10
      }
    });
  } else if (details.reason === 'update') {
    console.log('BRIDGE notes updated!');
  }
});

// 툴바 아이콘 클릭 시 Side Panel 열기
chrome.action.onClicked.addListener((tab) => {
  chrome.sidePanel.open({ windowId: tab.windowId });
});

// 메시지 리스너
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('Background received message:', message);

  if (message.action === 'ping') {
    sendResponse({ success: true, message: 'pong' });
  }

  // Storage 저장 요청 처리
  if (message.action === 'saveCapture') {
    handleSaveCapture(message.data)
      .then(result => {
        sendResponse({ success: true, result });
        // Side Panel에 새로운 캡처 알림
        chrome.runtime.sendMessage({ action: 'reloadCaptures' });
      })
      .catch(error => {
        sendResponse({ success: false, error: error.message });
      });
    return true; // async response를 위해 필수
  }

  return true;
});

// 캡처 저장 함수
async function handleSaveCapture(captureData) {
  try {
    const result = await chrome.storage.local.get(['captures']);
    const captures = result.captures || [];

    // 새 캡처 추가
    captures.unshift({
      id: Date.now().toString(),
      text: captureData.text,
      timestamp: Date.now(),
      url: captureData.url
    });

    // 최대 10개까지만 저장
    if (captures.length > 10) {
      captures.pop();
    }

    await chrome.storage.local.set({ captures });
    console.log('Capture saved successfully');

    return { captureCount: captures.length };
  } catch (error) {
    console.error('Save capture failed:', error);
    throw error;
  }
}

// 탭 활성화 이벤트 (탭 전환)
chrome.tabs.onActivated.addListener(async (activeInfo) => {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🔄 [Background] Tab activated');
  console.log('  Tab ID:', activeInfo.tabId);
  console.log('  Window ID:', activeInfo.windowId);

  try {
    // Tab 정보 가져오기 (URL 포함)
    console.log('  🔍 Getting tab info...');
    const tab = await chrome.tabs.get(activeInfo.tabId);

    console.log('  📊 Tab info retrieved:');
    console.log('    URL exists:', tab.url ? '✅ YES' : '❌ NO');
    console.log('    URL type:', typeof tab.url);
    console.log('    URL value:', tab.url || '(undefined)');
    console.log('    Title:', tab.title?.substring(0, 40) || '(undefined)');

    // URL이 없으면 Side Panel이 직접 query하도록 null 전달
    if (!tab.url) {
      console.log('  ⚠️ URL not available - Side Panel will query directly');
    }

    // Side Panel에 탭 전환 알림 (URL이 없으면 null)
    console.log('  📤 Sending message to Side Panel...');
    await chrome.runtime.sendMessage({
      action: 'tab-activated',
      tabId: activeInfo.tabId,
      windowId: activeInfo.windowId,
      url: tab.url || null,  // undefined 대신 null 전달
      title: tab.title || null
    });
    console.log('  ✅ Message sent successfully');
    console.log('    Sent URL:', tab.url || '(null - Side Panel will query)');
  } catch (error) {
    // Side Panel이 열려있지 않으면 에러 발생 (정상)
    console.log('  ❌ Error occurred:');
    console.log('    Error type:', error.name);
    console.log('    Error message:', error.message);
  }
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
});

// 탭 업데이트 이벤트 (URL 변경, 페이지 로딩)
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' || changeInfo.url) {
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🔄 [Background] Tab updated');
    console.log('  Tab ID:', tabId);
    console.log('  Window ID:', tab.windowId);
    console.log('  URL:', tab.url);
    console.log('  Status:', changeInfo.status);

    try {
      // Side Panel에 탭 업데이트 알림
      await chrome.runtime.sendMessage({
        action: 'tab-updated',
        tabId: tabId,
        windowId: tab.windowId,
        url: tab.url,
        status: changeInfo.status
      });
      console.log('  ✅ Message sent to Side Panel');
    } catch (error) {
      // Side Panel이 열려있지 않으면 에러 발생 (정상)
      console.log('  ⚠️ Side Panel not open:', error.message);
    }
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  }
});

console.log('Bridge Notes: Background service worker loaded');
