// BRIDGE notes - Content Script
// Phase 1: 두 클릭으로 AI 대화 캡처
// 개선사항: 동적 DOM 대응, 스크롤 처리, 개인정보 필터링

class BRIDGENotesCapture {
  constructor() {
    this.selectionMode = false;
    this.startRange = null;
    this.endRange = null;
    this.overlay = null;
    this.previewModal = null;
    this.capturedText = "";
    this.highlightedRanges = [];

    this.init();
  }

  init() {
    // 메시지 리스너 등록
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      if (message.action === "ping") {
        // Side panel의 준비 상태 확인 요청
        sendResponse({ ready: true });
        return true;
      } else if (message.action === "startSelection") {
        this.activateSelectionMode();
        sendResponse({ success: true });
        return true;
      } else if (message.action === "cancelSelection") {
        // 사이드패널에서 ESC 눌렀을 때 호출됨
        console.log("BRIDGE notes: Cancel requested from sidepanel");
        if (this.selectionMode) {
          this.deactivateSelectionMode();
          sendResponse({ success: true, canceled: true });
        } else {
          sendResponse({ success: true, canceled: false });
        }
        return true;
      }
      return true;
    });

    console.log("BRIDGE notes: Content script loaded and ready");
  }

  activateSelectionMode() {
    if (this.selectionMode) {
      this.deactivateSelectionMode();
      return;
    }

    console.log("BRIDGE notes: Activating selection mode");
    this.selectionMode = true;
    this.startRange = null;
    this.endRange = null;

    // 오버레이 표시
    this.showOverlay("🎯 시작 지점을 클릭하세요");

    // 모든 이벤트 핸들러를 bind하여 등록 (this 컨텍스트 일관성 확보)
    this.boundHandleClick = this.handleClick.bind(this);
    this.boundHandleKeyDown = this.handleKeyDown.bind(this);
    this.boundHandleMouseOver = this.handleMouseOver.bind(this);
    this.boundHandleMouseOut = this.handleMouseOut.bind(this);

    // 클릭 이벤트 리스너 등록
    document.addEventListener("click", this.boundHandleClick, true);

    // ESC 키로 취소 - window 레벨에서 캡처
    window.addEventListener("keydown", this.boundHandleKeyDown, true);

    // 호버 효과 추가
    document.addEventListener("mouseover", this.boundHandleMouseOver, true);
    document.addEventListener("mouseout", this.boundHandleMouseOut, true);
  }

  deactivateSelectionMode() {
    console.log("BRIDGE notes: Deactivating selection mode");
    this.selectionMode = false;
    this.startRange = null;
    this.endRange = null;

    // bound된 이벤트 리스너 모두 제거
    if (this.boundHandleClick) {
      document.removeEventListener("click", this.boundHandleClick, true);
      console.log("BRIDGE notes: Click listener removed");
      this.boundHandleClick = null;
    }

    if (this.boundHandleKeyDown) {
      window.removeEventListener("keydown", this.boundHandleKeyDown, true);
      console.log("BRIDGE notes: Keydown listener removed from window");
      this.boundHandleKeyDown = null;
    }

    if (this.boundHandleMouseOver) {
      document.removeEventListener("mouseover", this.boundHandleMouseOver, true);
      this.boundHandleMouseOver = null;
    }

    if (this.boundHandleMouseOut) {
      document.removeEventListener("mouseout", this.boundHandleMouseOut, true);
      this.boundHandleMouseOut = null;
    }

    console.log("BRIDGE notes: All listeners removed");

    // 오버레이 제거
    this.hideOverlay();

    // 하이라이트 제거
    this.clearHighlights();
  }

  async handleClick(e) {
    if (!this.selectionMode) return;

    e.preventDefault();
    e.stopPropagation();

    // 오버레이나 미리보기 모달 클릭 무시
    if (
      e.target.closest(".bridge-notes-overlay") ||
      e.target.closest(".bridge-notes-preview")
    ) {
      return;
    }

    // Shift 키 감지
    const isShiftPressed = e.shiftKey;
    let range = null;

    if (isShiftPressed) {
      // Shift+클릭: 설정값에 따라 동작
      const shiftClickMode = await this.getShiftClickModeSetting();

      if (shiftClickMode === 'text') {
        // 텍스트 정밀 선택
        range = this.createTextRangeFromPoint(e.clientX, e.clientY);
        if (!range) {
          // fallback: div 전체 선택
          console.log("BRIDGE notes: Text range not available, falling back to div");
          const clickedElement = document.elementFromPoint(e.clientX, e.clientY);
          const messageDiv = this.findMessageElement(clickedElement);
          if (messageDiv) {
            range = this.createRangeFromElement(messageDiv);
          }
        }
      } else {
        // div 전체 선택
        const clickedElement = document.elementFromPoint(e.clientX, e.clientY);
        const messageDiv = this.findMessageElement(clickedElement);
        if (messageDiv) {
          range = this.createRangeFromElement(messageDiv);
        }
      }
    } else {
      // 일반 클릭: Auto-detect (텍스트 vs div)
      const textRange = this.createTextRangeFromPoint(e.clientX, e.clientY);

      if (textRange) {
        // 텍스트 노드 클릭 -> 텍스트 정밀 선택
        range = textRange;
        console.log("BRIDGE notes: Text node detected - text-level selection");
      } else {
        // 여백/margin 클릭 -> div 전체 선택
        const clickedElement = document.elementFromPoint(e.clientX, e.clientY);
        const messageDiv = this.findMessageElement(clickedElement);
        if (messageDiv) {
          range = this.createRangeFromElement(messageDiv);
          console.log("BRIDGE notes: Whitespace detected - div-level selection");
        }
      }
    }

    if (!range) {
      console.log("BRIDGE notes: Could not create range");
      return;
    }

    if (!this.startRange) {
      // 첫 번째 클릭 - 시작 범위
      this.startRange = range.cloneRange();
      console.log("BRIDGE notes: Start range selected");
      this.highlightRange(this.startRange, "start");
      this.showOverlay("✅ 끝 지점을 클릭하세요");
    } else {
      // 두 번째 클릭 - 끝 범위
      this.endRange = range.cloneRange();
      console.log("BRIDGE notes: End range selected");
      this.highlightRange(this.endRange, "end");

      // 텍스트 추출
      this.extractTextFromRanges(this.startRange, this.endRange).then(
        (extractedText) => {
          if (extractedText) {
            this.capturedText = extractedText;

            // 미리보기 팝업 스킵하고 바로 sidepanel에 전송
            this.deactivateSelectionMode();
            this.clearHighlights();

            // Sidepanel에 캡처 완료 알림
            this.notifySidePanel(extractedText);
          }
        }
      );
    }
  }

  handleKeyDown(e) {
    if (e.key === "Escape" && this.selectionMode) {
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
      console.log("BRIDGE notes: ESC pressed, deactivating selection mode");
      this.deactivateSelectionMode();
      return false;
    }
  }

  handleMouseOver(e) {
    if (!this.selectionMode) return;

    const target = e.target;
    const messageElement = this.findMessageElement(target);

    if (messageElement && messageElement !== this.startElement) {
      messageElement.classList.add("bridge-notes-hover");
    }
  }

  handleMouseOut(e) {
    if (!this.selectionMode) return;

    const target = e.target;
    const messageElement = this.findMessageElement(target);

    if (messageElement) {
      messageElement.classList.remove("bridge-notes-hover");
    }
  }

  createRangeFromElement(element) {
    // 요소 전체를 포함하는 Range 생성 (첫 번째 텍스트 노드 ~ 마지막 텍스트 노드)
    const firstTextNode = this.findFirstTextNode(element);
    const lastTextNode = this.findLastTextNode(element);

    if (!firstTextNode || !lastTextNode) {
      console.log("BRIDGE notes: Could not find text nodes in element");
      return null;
    }

    const range = document.createRange();

    // 첫 번째 텍스트 노드의 시작점
    range.setStart(firstTextNode, 0);

    // 마지막 텍스트 노드의 끝점
    range.setEnd(lastTextNode, lastTextNode.length);

    return range;
  }

  findLastTextNode(element) {
    // 요소 내에서 마지막 텍스트 노드 찾기 (숨겨진 요소 제외)
    let lastTextNode = null;

    const walker = document.createTreeWalker(
      element,
      NodeFilter.SHOW_TEXT,
      {
        acceptNode: (node) => {
          // 공백만 있는 노드는 제외
          if (!node.nodeValue || node.nodeValue.trim().length === 0) {
            return NodeFilter.FILTER_REJECT;
          }

          // 부모 요소가 숨겨져 있으면 제외
          let parent = node.parentElement;
          while (parent && parent !== element) {
            try {
              const style = window.getComputedStyle(parent);

              // 숨김 스타일 체크
              if (
                style.display === 'none' ||
                style.visibility === 'hidden' ||
                style.opacity === '0'
              ) {
                return NodeFilter.FILTER_REJECT;
              }

              // 접근성 전용 요소 체크
              if (
                parent.hasAttribute('aria-hidden') ||
                parent.classList.contains('sr-only') ||
                parent.classList.contains('screen-reader-only') ||
                parent.classList.contains('visually-hidden')
              ) {
                return NodeFilter.FILTER_REJECT;
              }

              // 너비나 높이가 0인 요소 (숨겨진 요소)
              if (style.width === '0px' || style.height === '0px') {
                return NodeFilter.FILTER_REJECT;
              }
            } catch (error) {
              // getComputedStyle 실패시 무시하고 계속
              console.debug('Could not compute style:', error);
            }

            parent = parent.parentElement;
          }

          return NodeFilter.FILTER_ACCEPT;
        }
      }
    );

    // 모든 텍스트 노드를 순회하며 마지막 노드 찾기
    while (walker.nextNode()) {
      lastTextNode = walker.currentNode;
    }

    return lastTextNode;
  }

  async getShiftClickModeSetting() {
    // Chrome Storage에서 shiftClickMode 설정 가져오기
    try {
      const result = await chrome.storage.local.get(['settings']);
      const settings = result.settings || {};
      return settings.shiftClickMode || 'div'; // 기본값: div
    } catch (error) {
      console.error('BRIDGE notes: Failed to get shiftClickMode setting:', error);
      return 'div'; // fallback
    }
  }

  createTextRangeFromPoint(x, y) {
    // 클릭한 위치의 텍스트 노드에서 정밀한 Range 생성
    // caretRangeFromPoint: 클릭 위치의 정확한 텍스트 노드와 오프셋 반환
    try {
      let range;

      // 표준 브라우저 (Chrome)
      if (document.caretRangeFromPoint) {
        range = document.caretRangeFromPoint(x, y);
      }
      // Firefox
      else if (document.caretPositionFromPoint) {
        const position = document.caretPositionFromPoint(x, y);
        if (position) {
          range = document.createRange();
          range.setStart(position.offsetNode, position.offset);
          range.collapse(true);
        }
      }

      // Range가 생성되었고, 텍스트 노드를 가리키는지 확인
      if (range && range.startContainer.nodeType === Node.TEXT_NODE) {
        return range;
      }

      return null;
    } catch (error) {
      console.debug('BRIDGE notes: createTextRangeFromPoint failed:', error);
      return null;
    }
  }

  findFirstTextNode(element) {
    // 요소 내에서 첫 번째 텍스트 노드 찾기 (숨겨진 요소 제외)
    const walker = document.createTreeWalker(
      element,
      NodeFilter.SHOW_TEXT,
      {
        acceptNode: (node) => {
          // 공백만 있는 노드는 제외
          if (!node.nodeValue || node.nodeValue.trim().length === 0) {
            return NodeFilter.FILTER_REJECT;
          }

          // 부모 요소가 숨겨져 있으면 제외
          let parent = node.parentElement;
          while (parent && parent !== element) {
            try {
              const style = window.getComputedStyle(parent);

              // 숨김 스타일 체크
              if (
                style.display === 'none' ||
                style.visibility === 'hidden' ||
                style.opacity === '0'
              ) {
                return NodeFilter.FILTER_REJECT;
              }

              // 접근성 전용 요소 체크
              if (
                parent.hasAttribute('aria-hidden') ||
                parent.classList.contains('sr-only') ||
                parent.classList.contains('screen-reader-only') ||
                parent.classList.contains('visually-hidden')
              ) {
                return NodeFilter.FILTER_REJECT;
              }

              // 너비나 높이가 0인 요소 (숨겨진 요소)
              if (style.width === '0px' || style.height === '0px') {
                return NodeFilter.FILTER_REJECT;
              }
            } catch (error) {
              // getComputedStyle 실패시 무시하고 계속
              console.debug('Could not compute style:', error);
            }

            parent = parent.parentElement;
          }

          return NodeFilter.FILTER_ACCEPT;
        }
      }
    );

    return walker.nextNode();
  }

  findMessageElement(element) {
    // 동적 DOM 대응: 안정적인 속성 우선 타겟팅
    // aria-label, role, data-* 속성 등 변경되지 않는 속성 우선 사용

    let current = element;
    let depth = 0;
    const maxDepth = 15;

    while (current && current !== document.body && depth < maxDepth) {
      // 안정적인 속성 패턴 (우선순위 높음)
      // aria-label, role 등은 접근성 때문에 잘 변경되지 않음
      if (
        current.matches('[role="article"]') ||
        current.matches('[role="region"]') ||
        current.matches('[aria-label*="message"]') ||
        current.matches('[aria-label*="Message"]')
      ) {
        return current;
      }

      // Claude.ai - 다중 선택자 패턴
      if (
        current.matches('[data-testid*="message"]') ||
        current.matches('[data-testid*="Message"]') ||
        current.matches(".font-claude-message") ||
        current.matches('[class*="Message"]') ||
        current.matches("article")
      ) {
        return current;
      }

      // ChatGPT - 다중 선택자 패턴
      if (
        current.matches("[data-message-author-role]") ||
        current.matches("[data-message-id]") ||
        current.matches(".group\\/conversation-turn") ||
        current.matches('[class*="message"]') ||
        current.matches("article")
      ) {
        return current;
      }

      // Perplexity - 다중 선택자 패턴
      if (
        current.matches('[class*="Answer"]') ||
        current.matches('[class*="Question"]') ||
        current.matches(".prose") ||
        current.matches("article")
      ) {
        return current;
      }

      current = current.parentElement;
      depth++;
    }

    return element;
  }

  async extractTextFromRanges(startRange, endRange) {
    if (!startRange || !endRange) return "";

    try {
      // 두 Range를 하나의 Range로 결합
      const selectionRange = document.createRange();

      // 시작과 끝의 위치 비교
      const comparison = startRange.compareBoundaryPoints(Range.START_TO_START, endRange);

      if (comparison <= 0) {
        // startRange가 endRange보다 앞에 있음 (정상)
        selectionRange.setStart(startRange.startContainer, startRange.startOffset);
        selectionRange.setEnd(endRange.endContainer, endRange.endOffset);
      } else {
        // endRange가 startRange보다 앞에 있음 (역순 선택)
        selectionRange.setStart(endRange.startContainer, endRange.startOffset);
        selectionRange.setEnd(startRange.endContainer, startRange.endOffset);
      }

      // Range에서 텍스트 추출
      const extractedText = this.extractTextFromRange(selectionRange);

      // 메시지 역할 감지를 위해 컨테이너 요소 찾기
      const container = selectionRange.commonAncestorContainer;
      const messageElement = container.nodeType === Node.TEXT_NODE
        ? this.findMessageElement(container.parentElement)
        : this.findMessageElement(container);

      // 역할 감지
      const role = this.detectMessageRole(messageElement);

      // 포맷팅
      return `${role}: ${extractedText}`;

    } catch (error) {
      console.error("BRIDGE notes: Error extracting text from ranges", error);
      return "";
    }
  }

  extractTextFromRange(range) {
    // Range에서 텍스트 추출 (수동 DOM 순회로 모든 중간 요소 포함)
    try {
      // 공통 조상 요소 찾기
      let commonAncestor = range.commonAncestorContainer;

      // 텍스트 노드인 경우 부모 요소 사용
      if (commonAncestor.nodeType === Node.TEXT_NODE) {
        commonAncestor = commonAncestor.parentElement;
      }

      console.log("BRIDGE notes: Extracting range from", commonAncestor.nodeName);

      // 모든 자식 요소를 순회하며 범위 내에 있는 요소 수집
      const allElements = Array.from(commonAncestor.querySelectorAll('*'));
      const elementsInRange = [];

      // 범위의 시작과 끝 위치 계산
      const rangeRect = range.getBoundingClientRect();

      for (const element of allElements) {
        try {
          // 각 요소에 대한 범위 생성
          const elementRange = document.createRange();
          elementRange.selectNodeContents(element);

          // 요소가 선택 범위와 겹치는지 확인
          const elementRect = element.getBoundingClientRect();

          // 범위와 교차하는지 체크
          if (this.rangesIntersect(range, elementRange)) {
            elementsInRange.push(element);
          }
        } catch (e) {
          // 일부 요소는 Range 생성 실패 가능 (무시)
        }
      }

      console.log(`BRIDGE notes: Found ${elementsInRange.length} elements in range`);

      // 수집된 요소들을 임시 div에 복제
      const tempDiv = document.createElement('div');

      if (elementsInRange.length > 0) {
        elementsInRange.forEach(element => {
          const clone = element.cloneNode(true);
          tempDiv.appendChild(clone);
        });
      } else {
        // 요소를 찾지 못한 경우 fallback: cloneContents 사용
        console.log("BRIDGE notes: No elements found, using fallback method");
        return this.extractTextFromRangeFallback(range);
      }

      // 제거할 요소들 (확장)
      const selectorsToRemove = [
        "button",
        '[role="button"]',
        ".copy-button",
        '[class*="copy"]',
        '[class*="CopyButton"]',
        "svg",
        '[aria-hidden="true"]',
        '[class*="toolbar"]',
        '[class*="Toolbar"]',
        "img",
        "video",
        "audio",
        // 접근성 전용 텍스트 제거
        '[class*="sr-only"]',
        '[class*="screen-reader"]',
        '[class*="visually-hidden"]',
        '[role="presentation"]',
        '[aria-label]:empty',
        // 숨겨진 요소 제거
        '[style*="display: none"]',
        '[style*="visibility: hidden"]',
        '[hidden]',
      ];

      selectorsToRemove.forEach((selector) => {
        tempDiv.querySelectorAll(selector).forEach((el) => el.remove());
      });

      // 실제로 보이지 않는 요소 제거
      this.removeHiddenElements(tempDiv);

      // 텍스트 추출
      let text = tempDiv.innerText || tempDiv.textContent || "";

      // 중복 라인 제거 + 정리
      text = this.cleanDuplicateLines(text);

      console.log(`BRIDGE notes: Extracted ${text.length} characters`);

      return text;
    } catch (error) {
      console.error("BRIDGE notes: Error in extractTextFromRange", error);
      // Fallback to original method
      return this.extractTextFromRangeFallback(range);
    }
  }

  rangesIntersect(range1, range2) {
    // 두 Range가 겹치는지 확인
    try {
      // range1이 range2보다 완전히 앞에 있는지
      if (range1.compareBoundaryPoints(Range.END_TO_START, range2) < 0) {
        return false;
      }
      // range1이 range2보다 완전히 뒤에 있는지
      if (range1.compareBoundaryPoints(Range.START_TO_END, range2) > 0) {
        return false;
      }
      // 그 외의 경우는 겹침
      return true;
    } catch (e) {
      return false;
    }
  }

  extractTextFromRangeFallback(range) {
    // Fallback: 원래 방식 (cloneContents)
    const fragment = range.cloneContents();
    const tempDiv = document.createElement('div');
    tempDiv.appendChild(fragment);

    const selectorsToRemove = [
      "button", '[role="button"]', ".copy-button", '[class*="copy"]',
      '[class*="CopyButton"]', "svg", '[aria-hidden="true"]',
      '[class*="toolbar"]', '[class*="Toolbar"]', "img", "video", "audio",
      '[class*="sr-only"]', '[class*="screen-reader"]',
      '[class*="visually-hidden"]', '[role="presentation"]',
      '[aria-label]:empty', '[style*="display: none"]',
      '[style*="visibility: hidden"]', '[hidden]',
    ];

    selectorsToRemove.forEach((selector) => {
      tempDiv.querySelectorAll(selector).forEach((el) => el.remove());
    });

    this.removeHiddenElements(tempDiv);
    let text = tempDiv.innerText || tempDiv.textContent || "";
    text = this.cleanDuplicateLines(text);

    return text;
  }

  removeHiddenElements(element) {
    // 숨겨진 요소를 제거하는 헬퍼 함수
    const allElements = element.querySelectorAll('*');
    allElements.forEach(el => {
      // 스타일이 없는 요소는 스킵 (에러 방지)
      if (!el.parentElement) return;

      try {
        const style = window.getComputedStyle(el);
        // display: none 또는 visibility: hidden인 요소 제거
        if (style.display === 'none' || style.visibility === 'hidden') {
          el.remove();
          return;
        }
        // 너비나 높이가 0인 요소 제거 (숨겨진 접근성 텍스트)
        if (style.width === '0px' || style.height === '0px' || style.opacity === '0') {
          el.remove();
          return;
        }
      } catch (error) {
        // getComputedStyle 실패시 무시
        console.debug('Could not compute style for element:', error);
      }
    });
  }

  cleanDuplicateLines(text) {
    // 중복 라인을 정리하는 함수
    // 1. 기본 정리: 연속된 공백 및 빈 줄 정리
    text = text
      .replace(/[ \t]+/g, ' ')           // 연속된 공백을 하나로
      .replace(/\n\s*\n\s*\n/g, '\n\n')  // 3개 이상 연속 빈 줄을 2개로
      .trim();

    // 2. 중복 라인 제거
    const lines = text.split('\n');
    const uniqueLines = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();

      // 빈 줄은 연속되지 않게만 유지
      if (line === '') {
        if (uniqueLines.length > 0 && uniqueLines[uniqueLines.length - 1] !== '') {
          uniqueLines.push('');
        }
        continue;
      }

      // 바로 이전 라인과 동일하면 스킵 (연속 중복 제거)
      if (i > 0 && line === lines[i - 1].trim()) {
        continue;
      }

      uniqueLines.push(lines[i]); // 원본 줄 유지 (공백 포함)
    }

    return uniqueLines.join('\n').trim();
  }

  detectMessageRole(element) {
    // 메시지 역할 감지 (사용자 vs AI)

    const elementText =
      element.className + " " + (element.getAttribute("data-testid") || "");

    // Claude
    if (elementText.includes("user") || elementText.includes("human")) {
      return "사용자";
    }
    if (elementText.includes("claude") || elementText.includes("assistant")) {
      return "Claude";
    }

    // ChatGPT
    if (element.querySelector('[data-message-author-role="user"]')) {
      return "사용자";
    }
    if (element.querySelector('[data-message-author-role="assistant"]')) {
      return "ChatGPT";
    }

    // Perplexity
    if (elementText.toLowerCase().includes("question")) {
      return "사용자";
    }
    if (elementText.toLowerCase().includes("answer")) {
      return "Perplexity";
    }

    return "AI";
  }

  highlightRange(range, type = "start") {
    if (!range) return;

    try {
      // Range를 span 요소로 감싸서 하이라이트
      const span = document.createElement('span');
      span.className = `bridge-notes-highlight bridge-notes-${type}`;

      // Range의 내용을 복사하여 span으로 감싸기
      const contents = range.extractContents();
      span.appendChild(contents);
      range.insertNode(span);

      // 하이라이트된 요소 추적
      this.highlightedRanges.push(span);
    } catch (error) {
      console.error("BRIDGE notes: Error highlighting range", error);
    }
  }

  clearHighlights() {
    // 하이라이트된 span 요소들 제거하고 원래 텍스트로 복원
    this.highlightedRanges.forEach((span) => {
      if (span.parentNode) {
        // span의 내용을 부모 노드로 이동
        while (span.firstChild) {
          span.parentNode.insertBefore(span.firstChild, span);
        }
        // span 제거
        span.parentNode.removeChild(span);
      }
    });

    // 배열 초기화
    this.highlightedRanges = [];

    // 기존 방식의 하이라이트도 제거 (호환성)
    document.querySelectorAll(".bridge-notes-highlight").forEach((el) => {
      el.classList.remove(
        "bridge-notes-highlight",
        "bridge-notes-start",
        "bridge-notes-end",
        "bridge-notes-hover"
      );
    });
  }

  showOverlay(message) {
    if (!this.overlay) {
      this.overlay = document.createElement("div");
      this.overlay.className = "bridge-notes-overlay";
      document.body.appendChild(this.overlay);
    }

    this.overlay.innerHTML = `
      <div class="bridge-notes-overlay-content">
        <div class="bridge-notes-overlay-message">${message}</div>
        <div class="bridge-notes-overlay-hint">ESC 키로 취소</div>
      </div>
    `;

    this.overlay.style.display = "flex";
  }

  hideOverlay() {
    if (this.overlay) {
      this.overlay.style.display = "none";
    }
  }

  showPreview(text) {
    // 개인정보 감지
    const hasPersonalInfo = this.detectPersonalInfo(text);

    // 미리보기 모달 생성
    if (!this.previewModal) {
      this.previewModal = document.createElement("div");
      this.previewModal.className = "bridge-notes-preview";
      document.body.appendChild(this.previewModal);
    }

    const previewText =
      text.substring(0, 500) + (text.length > 500 ? "..." : "");

    // 개인정보 경고 메시지
    const privacyWarning = hasPersonalInfo
      ? `
      <div class="bridge-notes-privacy-warning">
        ⚠️ 이메일, 전화번호 등 개인정보가 감지되었습니다. 공유 전 확인해주세요.
      </div>
    `
      : "";

    this.previewModal.innerHTML = `
      <div class="bridge-notes-preview-content">
        <div class="bridge-notes-preview-header">
          <h3>📋 캡처 완료!</h3>
          <button class="bridge-notes-preview-close" id="closePreview">✕</button>
        </div>

        <div class="bridge-notes-preview-body">
          ${privacyWarning}
          <div class="bridge-notes-preview-text">${this.escapeHtml(
            previewText
          )}</div>
          <div class="bridge-notes-preview-stats">
            총 ${text.length}자 캡처됨
          </div>
        </div>

        <div class="bridge-notes-preview-actions">
          <button class="bridge-notes-btn bridge-notes-btn-primary" id="copyToClipboard">
            📋 클립보드에 복사
          </button>
          <button class="bridge-notes-btn bridge-notes-btn-secondary" id="retryCapture">
            🔄 다시 선택
          </button>
        </div>
      </div>
    `;

    this.previewModal.style.display = "flex";

    // 이벤트 리스너 등록
    document
      .getElementById("closePreview")
      .addEventListener("click", () => this.hidePreview());
    document
      .getElementById("copyToClipboard")
      .addEventListener("click", () => this.copyToClipboard());
    document
      .getElementById("retryCapture")
      .addEventListener("click", () => this.retryCapture());
  }

  detectPersonalInfo(text) {
    // 개인정보 패턴 감지
    const patterns = {
      email: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
      phone: /(\d{2,3}[-.\s]?\d{3,4}[-.\s]?\d{4})|(\d{10,11})/g,
      creditCard: /\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}/g,
      ssn: /\d{3}[-\s]?\d{2}[-\s]?\d{4}/g,
    };

    for (const [type, pattern] of Object.entries(patterns)) {
      if (pattern.test(text)) {
        console.log(`Personal info detected: ${type}`);
        return true;
      }
    }

    return false;
  }

  hidePreview() {
    if (this.previewModal) {
      this.previewModal.style.display = "none";
    }
    this.clearHighlights();
  }

  async copyToClipboard() {
    try {
      await navigator.clipboard.writeText(this.capturedText);

      // 성공 메시지
      const btn = document.getElementById("copyToClipboard");
      const originalText = btn.innerHTML;
      btn.innerHTML = "✅ 복사 완료!";
      btn.style.background = "#10b981";

      // 저장소에 저장
      await this.saveCapture(this.capturedText);

      setTimeout(() => {
        btn.innerHTML = originalText;
        btn.style.background = "";
        this.hidePreview();
      }, 1500);
    } catch (error) {
      console.error("Copy to clipboard failed:", error);
      alert("클립보드 복사에 실패했습니다.");
    }
  }

  async saveCapture(text) {
    try {
      // Background script를 통해 저장 (CSP 문제 회피)
      const response = await chrome.runtime.sendMessage({
        action: "saveCapture",
        data: {
          text: text,
          url: window.location.href,
        },
      });

      if (response && response.success) {
        console.log("Capture saved successfully");
      } else {
        throw new Error(response?.error || "Save failed");
      }
    } catch (error) {
      console.error("Save capture failed:", error);
    }
  }

  retryCapture() {
    this.hidePreview();
    this.clearHighlights();
    this.activateSelectionMode();
  }

  escapeHtml(text) {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML.replace(/\n/g, "<br>");
  }

  notifySidePanel(text) {
    // Sidepanel에 캡처 완료 메시지 전송
    try {
      chrome.runtime.sendMessage(
        {
          action: "captureComplete",
          text: text,
        },
        (response) => {
          if (chrome.runtime.lastError) {
            console.log(
              "Sidepanel notification failed:",
              chrome.runtime.lastError.message
            );
          } else {
            console.log("Sidepanel notified successfully");
          }
        }
      );
    } catch (error) {
      console.error("Failed to notify sidepanel:", error);
    }
  }
}

// 초기화
const bridgeNotes = new BRIDGENotesCapture();
