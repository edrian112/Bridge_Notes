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

    // 키보드 이벤트 - document와 window 양쪽에 등록 (포커스 문제 해결)
    document.addEventListener("keydown", this.boundHandleKeyDown, true);
    window.addEventListener("keydown", this.boundHandleKeyDown, true);

    // body에 포커스를 주어 키 이벤트 확실하게 캡처
    if (document.body) {
      document.body.setAttribute("tabindex", "-1");
      document.body.focus();
    }

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
      document.removeEventListener("keydown", this.boundHandleKeyDown, true);
      window.removeEventListener("keydown", this.boundHandleKeyDown, true);
      console.log("BRIDGE notes: Keydown listeners removed");
      this.boundHandleKeyDown = null;
    }

    // body tabindex 제거
    if (document.body) {
      document.body.removeAttribute("tabindex");
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
    if (!this.selectionMode) return;

    // ESC: 선택 모드 취소
    if (e.key === "Escape") {
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
      console.log("BRIDGE notes: ESC pressed, deactivating selection mode");
      this.deactivateSelectionMode();
      return false;
    }

    // Cmd+ArrowUp/Down (Mac) 또는 Ctrl+ArrowUp/Down (Windows/Linux): 스크롤
    const isModifierPressed = e.metaKey || e.ctrlKey; // metaKey = Cmd (Mac), ctrlKey = Ctrl (Win/Linux)

    if (isModifierPressed && (e.key === "ArrowUp" || e.key === "ArrowDown")) {
      e.preventDefault();
      e.stopPropagation();

      const scrollAmount = 300; // 스크롤 이동 거리 (픽셀)
      const direction = e.key === "ArrowUp" ? -1 : 1;

      window.scrollBy({
        top: scrollAmount * direction,
        behavior: "smooth"
      });

      console.log(`BRIDGE notes: Scroll ${e.key === "ArrowUp" ? "up" : "down"} by ${scrollAmount}px`);
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
    // TreeWalker API를 사용한 텍스트 추출 (코드 블록, 테이블, 리스트 포함)
    try {
      // 메시지 컨테이너를 찾아서 더 넓은 범위에서 순회
      const findMessageContainer = (node) => {
        let current = node.nodeType === Node.TEXT_NODE ? node.parentElement : node;
        let depth = 0;
        const maxDepth = 30;

        while (current && current !== document.body && depth < maxDepth) {
          const classes = current.className || '';
          // Claude 메시지 컨테이너 또는 대화 영역
          if (
            classes.includes('font-claude') ||
            classes.includes('group/conversation') ||
            classes.includes('conversation') ||
            classes.includes('message') ||
            current.hasAttribute('data-testid') ||
            current.tagName === 'ARTICLE' ||
            current.tagName === 'MAIN'
          ) {
            return current;
          }
          current = current.parentElement;
          depth++;
        }
        return node.nodeType === Node.TEXT_NODE ? node.parentElement : node;
      };

      // 시작과 끝 컨테이너에서 메시지 레벨까지 올라가기
      const startContainer = findMessageContainer(range.startContainer);
      const endContainer = findMessageContainer(range.endContainer);

      // 두 컨테이너의 공통 조상 찾기
      let rootElement = startContainer;
      while (rootElement && !rootElement.contains(endContainer)) {
        rootElement = rootElement.parentElement;
      }

      // 공통 조상을 못 찾으면 document.body 사용
      if (!rootElement) {
        rootElement = document.body;
      }

      console.log("BRIDGE notes: TreeWalker root element", {
        tag: rootElement.tagName,
        class: rootElement.className,
        startTag: startContainer.tagName,
        endTag: endContainer.tagName
      });

      // 범위 내 모든 노드를 수집할 결과 배열
      const extractedParts = [];

      // 특수 요소 태그 목록 (코드 블록, 테이블, 리스트)
      const specialTags = new Set(['PRE', 'CODE', 'TABLE', 'THEAD', 'TBODY', 'TR', 'TH', 'TD', 'UL', 'OL', 'LI', 'BLOCKQUOTE']);

      // 제외할 요소 선택자
      const excludeSelectors = [
        'button', '[role="button"]', '.copy-button', '[class*="copy"]',
        '[class*="CopyButton"]', 'svg', '[aria-hidden="true"]',
        '[class*="toolbar"]', '[class*="Toolbar"]', 'img', 'video', 'audio',
        '[class*="sr-only"]', '[class*="screen-reader"]',
        '[class*="visually-hidden"]', '[role="presentation"]',
        '[style*="display: none"]', '[style*="visibility: hidden"]', '[hidden]'
      ];

      // 요소가 제외 대상인지 확인
      const shouldExclude = (element) => {
        if (!element || element.nodeType !== Node.ELEMENT_NODE) return false;
        return excludeSelectors.some(selector => {
          try {
            return element.matches(selector);
          } catch {
            return false;
          }
        });
      };

      // 요소가 숨겨져 있는지 확인
      const isHidden = (element) => {
        if (!element || element.nodeType !== Node.ELEMENT_NODE) return false;
        try {
          const style = window.getComputedStyle(element);
          return style.display === 'none' ||
                 style.visibility === 'hidden' ||
                 style.opacity === '0' ||
                 style.width === '0px' ||
                 style.height === '0px';
        } catch {
          return false;
        }
      };

      // TreeWalker 생성 - 텍스트 노드와 요소 노드 모두 순회
      const walker = document.createTreeWalker(
        rootElement,
        NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT,
        {
          acceptNode: (node) => {
            // 요소 노드 처리
            if (node.nodeType === Node.ELEMENT_NODE) {
              // 제외 대상이거나 숨겨진 요소면 해당 서브트리 전체 스킵
              if (shouldExclude(node) || isHidden(node)) {
                return NodeFilter.FILTER_REJECT;
              }
              return NodeFilter.FILTER_SKIP; // 요소 자체는 스킵, 자식은 순회
            }

            // 텍스트 노드 처리
            if (node.nodeType === Node.TEXT_NODE) {
              // 빈 텍스트 노드 스킵
              if (!node.textContent.trim()) {
                return NodeFilter.FILTER_SKIP;
              }

              // 범위 내에 있는지 확인
              const nodeRange = document.createRange();
              nodeRange.selectNode(node);

              // 노드가 선택 범위와 교차하는지 확인
              const isIntersecting = range.compareBoundaryPoints(Range.END_TO_START, nodeRange) <= 0 &&
                                    range.compareBoundaryPoints(Range.START_TO_END, nodeRange) >= 0;

              return isIntersecting ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_SKIP;
            }

            return NodeFilter.FILTER_SKIP;
          }
        }
      );

      // 이전에 처리한 특수 요소 추적 (중복 방지)
      const processedSpecialElements = new Set();

      // 노드 순회
      let currentNode = walker.nextNode();
      while (currentNode) {
        if (currentNode.nodeType === Node.TEXT_NODE) {
          // 텍스트 노드의 부모 확인
          let parent = currentNode.parentElement;
          let specialParent = null;

          // 특수 요소(코드, 테이블, 리스트) 부모 찾기
          // rootElement 제한 없이 document.body까지 탐색
          while (parent && parent !== document.body) {
            if (specialTags.has(parent.tagName)) {
              specialParent = parent;
              // PRE나 TABLE, UL/OL까지 올라가기 (최상위 특수 요소)
              if (parent.tagName === 'PRE' || parent.tagName === 'TABLE' ||
                  parent.tagName === 'UL' || parent.tagName === 'OL') {
                console.log("BRIDGE notes: Found special element", parent.tagName, parent.className);
                break;
              }
            }
            parent = parent.parentElement;
          }

          if (specialParent && !processedSpecialElements.has(specialParent)) {
            // 특수 요소 전체를 한 번에 처리
            processedSpecialElements.add(specialParent);

            // 특수 요소의 포맷된 텍스트 추출
            const formattedText = this.extractFormattedContent(specialParent);
            if (formattedText) {
              extractedParts.push(formattedText);
            }
          } else if (!specialParent) {
            // 일반 텍스트 노드
            const text = currentNode.textContent;
            if (text.trim()) {
              extractedParts.push(text);
            }
          }
          // specialParent가 있지만 이미 처리된 경우는 스킵
        }

        currentNode = walker.nextNode();
      }

      // 결과 조합
      let text = extractedParts.join('\n');

      // 중복 라인 제거 + 정리
      text = this.cleanDuplicateLines(text);

      console.log(`BRIDGE notes: TreeWalker extracted ${text.length} characters, ${extractedParts.length} parts`);

      // 결과가 없으면 fallback 사용
      if (!text.trim()) {
        console.log("BRIDGE notes: TreeWalker returned empty, using fallback");
        return this.extractTextFromRangeFallback(range);
      }

      return text;
    } catch (error) {
      console.error("BRIDGE notes: Error in extractTextFromRange (TreeWalker)", error);
      // Fallback to original method
      return this.extractTextFromRangeFallback(range);
    }
  }

  extractFormattedContent(element) {
    // 특수 요소(코드 블록, 테이블, 리스트)에서 포맷된 텍스트 추출
    const tagName = element.tagName;

    try {
      // 코드 블록 (PRE, CODE)
      if (tagName === 'PRE' || tagName === 'CODE') {
        return this.extractCodeBlock(element);
      }

      // 테이블
      if (tagName === 'TABLE') {
        return this.extractTable(element);
      }

      // 리스트 (UL, OL)
      if (tagName === 'UL' || tagName === 'OL') {
        return this.extractList(element, tagName === 'OL');
      }

      // 인용문
      if (tagName === 'BLOCKQUOTE') {
        return this.extractBlockquote(element);
      }

      // 기타: 일반 텍스트 추출
      return element.textContent || '';
    } catch (error) {
      console.error("BRIDGE notes: Error extracting formatted content", error);
      return element.textContent || '';
    }
  }

  extractCodeBlock(element) {
    // 코드 블록에서 텍스트 추출 (줄바꿈 보존)
    // PRE 안의 CODE 또는 PRE 자체
    const codeElement = element.tagName === 'PRE'
      ? (element.querySelector('code') || element)
      : element;

    // 코드 언어 감지 (class에서 language-xxx 추출)
    let language = '';
    const classList = codeElement.className || '';
    const langMatch = classList.match(/language-(\w+)/);
    if (langMatch) {
      language = langMatch[1];
    }

    // 코드 내용 추출 (innerText로 줄바꿈 보존)
    let code = codeElement.innerText || codeElement.textContent || '';

    // 마크다운 코드 블록 형식으로 반환
    const fence = '```';
    return `${fence}${language}\n${code.trim()}\n${fence}`;
  }

  extractTable(element) {
    // 테이블에서 마크다운 형식으로 텍스트 추출
    const rows = element.querySelectorAll('tr');
    if (rows.length === 0) return element.textContent || '';

    const tableData = [];
    let maxCols = 0;

    // 모든 행 처리
    rows.forEach((row, rowIndex) => {
      const cells = row.querySelectorAll('th, td');
      const rowData = [];

      cells.forEach(cell => {
        const text = (cell.textContent || '').trim().replace(/\|/g, '\\|'); // | 이스케이프
        rowData.push(text);
      });

      maxCols = Math.max(maxCols, rowData.length);
      tableData.push(rowData);
    });

    if (tableData.length === 0) return '';

    // 마크다운 테이블 형식으로 변환
    const lines = [];

    tableData.forEach((row, index) => {
      // 열 수 맞추기
      while (row.length < maxCols) {
        row.push('');
      }
      lines.push('| ' + row.join(' | ') + ' |');

      // 첫 행 다음에 구분선 추가
      if (index === 0) {
        lines.push('| ' + row.map(() => '---').join(' | ') + ' |');
      }
    });

    return lines.join('\n');
  }

  extractList(element, isOrdered) {
    // 리스트에서 마크다운 형식으로 텍스트 추출
    const items = element.querySelectorAll(':scope > li');
    if (items.length === 0) return element.textContent || '';

    const lines = [];

    items.forEach((item, index) => {
      // 직접 텍스트 내용 (중첩 리스트 제외)
      let text = '';
      item.childNodes.forEach(child => {
        if (child.nodeType === Node.TEXT_NODE) {
          text += child.textContent;
        } else if (child.nodeType === Node.ELEMENT_NODE &&
                   child.tagName !== 'UL' && child.tagName !== 'OL') {
          text += child.textContent;
        }
      });
      text = text.trim();

      // 마커 추가
      const marker = isOrdered ? `${index + 1}.` : '-';
      if (text) {
        lines.push(`${marker} ${text}`);
      }

      // 중첩 리스트 처리
      const nestedLists = item.querySelectorAll(':scope > ul, :scope > ol');
      nestedLists.forEach(nestedList => {
        const nestedIsOrdered = nestedList.tagName === 'OL';
        const nestedText = this.extractList(nestedList, nestedIsOrdered);
        // 들여쓰기 추가
        const indentedLines = nestedText.split('\n').map(line => '  ' + line);
        lines.push(...indentedLines);
      });
    });

    return lines.join('\n');
  }

  extractBlockquote(element) {
    // 인용문에서 마크다운 형식으로 텍스트 추출
    const text = element.textContent || '';
    const lines = text.split('\n').filter(line => line.trim());
    return lines.map(line => '> ' + line.trim()).join('\n');
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
