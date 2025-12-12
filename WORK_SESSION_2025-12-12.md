# BRIDGE Notes - 작업 세션 기록 (2025-12-12)

## 📌 시작 커밋
```
f1af922 Docs: Add project documentation with business logic protection
```

---

## ✅ 완료된 작업

### 1. AI/사용자 대화 구분 기능
**커밋**: `dcd2242` - Feature: Add AI/User message distinction in original text area

**변경 파일**:
- `bridge_notes_extension/content.js` - extractTextFromRange() 수정
- `bridge_notes_extension/scripts/components/ResultArea.js` - formatOriginalText(), parseMessages() 추가
- `bridge_notes_extension/styles/components/result-area.css` - 메시지 블록 스타일
- `bridge_notes_extension/styles/dark-mode.css` - 다크모드 스타일

**구현 내용**:
- 캡처 시 각 메시지의 역할(사용자/AI) 자동 감지
- `[역할]\n내용` 형식의 구조화된 텍스트 반환
- 사용자 메시지: 보라색 계열 배경 + 왼쪽 테두리
- AI 메시지: 초록색 계열 배경 + 왼쪽 테두리
- 라이트/다크 모드 지원

---

### 2. 영어 모드 (i18n) 지원
**커밋**: `d8e4edf` - Feature: Add i18n support for English/Korean language switching

**새로 생성된 파일**:
- `bridge_notes_extension/scripts/i18n/translations.js` - 번역 데이터 (60+ 키)
- `bridge_notes_extension/scripts/i18n/i18n.js` - i18n 유틸리티 클래스

**변경 파일**:
- `bridge_notes_extension/sidepanel.html` - data-i18n 속성 추가
- `bridge_notes_extension/scripts/sidepanel.js` - i18n 초기화
- `bridge_notes_extension/scripts/components/Settings.js` - 언어 변경 핸들러

**구현 내용**:
- JavaScript 기반 동적 i18n 시스템 (Chrome i18n API 대신)
- 설정에서 언어 선택 시 실시간 UI 번역
- 싱글톤 패턴의 i18n 클래스
- `data-i18n`, `data-i18n-placeholder`, `data-i18n-title` 속성 지원

---

## 🔜 다음 작업: 구글 로그인 구현

### 개요
Google OAuth 2.0을 사용하여 사용자 인증 구현. 플랜 관리 및 사용량 추적의 기반.

### 단계별 구현 가이드

#### Phase 1: Chrome Extension OAuth 설정 (프론트엔드)

**Step 1.1: manifest.json 수정**
```json
{
  "permissions": [
    "identity",
    "identity.email"
  ],
  "oauth2": {
    "client_id": "YOUR_CLIENT_ID.apps.googleusercontent.com",
    "scopes": [
      "https://www.googleapis.com/auth/userinfo.email",
      "https://www.googleapis.com/auth/userinfo.profile"
    ]
  }
}
```

**Step 1.2: Google Cloud Console 설정**
1. https://console.cloud.google.com 접속
2. 새 프로젝트 생성 또는 기존 프로젝트 선택
3. "API 및 서비스" → "사용자 인증 정보"
4. "사용자 인증 정보 만들기" → "OAuth 클라이언트 ID"
5. 애플리케이션 유형: "Chrome 앱"
6. 애플리케이션 ID: Chrome Extension ID 입력
   - `chrome://extensions`에서 확인
   - 개발 모드에서는 임시 ID, 배포 시 고정 ID

**Step 1.3: 인증 서비스 생성**
```javascript
// scripts/services/AuthService.js
export class AuthService {
  constructor() {
    this.user = null;
    this.token = null;
  }

  // Chrome Identity API로 로그인
  async login() {
    return new Promise((resolve, reject) => {
      chrome.identity.getAuthToken({ interactive: true }, (token) => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
          return;
        }
        this.token = token;
        this.fetchUserInfo(token).then(resolve).catch(reject);
      });
    });
  }

  // 사용자 정보 가져오기
  async fetchUserInfo(token) {
    const response = await fetch(
      'https://www.googleapis.com/oauth2/v2/userinfo',
      {
        headers: { Authorization: `Bearer ${token}` }
      }
    );
    this.user = await response.json();
    return this.user;
  }

  // 로그아웃
  async logout() {
    return new Promise((resolve) => {
      chrome.identity.removeCachedAuthToken({ token: this.token }, () => {
        this.user = null;
        this.token = null;
        resolve();
      });
    });
  }

  // 로그인 상태 확인
  isLoggedIn() {
    return !!this.user;
  }

  // 저장된 토큰으로 자동 로그인 시도
  async tryAutoLogin() {
    return new Promise((resolve) => {
      chrome.identity.getAuthToken({ interactive: false }, (token) => {
        if (token) {
          this.token = token;
          this.fetchUserInfo(token).then(resolve).catch(() => resolve(null));
        } else {
          resolve(null);
        }
      });
    });
  }
}
```

**Step 1.4: Settings.js 수정**
```javascript
// handleGoogleLogin() 메서드 수정
async handleGoogleLogin() {
  try {
    const user = await this.authService.login();

    // 사용자 정보 저장
    this.currentSettings.googleUser = {
      email: user.email,
      name: user.name,
      picture: user.picture
    };

    // UI 업데이트
    this.updateLoginUI(user);

    if (this.toast) {
      this.toast.success(i18n.t('toast.loginSuccess'));
    }
  } catch (error) {
    console.error('Google login failed:', error);
    if (this.toast) {
      this.toast.error(i18n.t('toast.loginFailed'));
    }
  }
}
```

---

#### Phase 2: 백엔드 API 구축 (서버)

**Step 2.1: 필요한 엔드포인트**
```
POST /api/auth/verify     - 토큰 검증 및 사용자 등록/조회
GET  /api/user/profile    - 사용자 정보 조회
GET  /api/user/usage      - 사용량 조회
POST /api/user/usage      - 사용량 증가
GET  /api/user/plan       - 플랜 정보 조회
```

**Step 2.2: 토큰 검증 로직 (Node.js 예시)**
```javascript
const { OAuth2Client } = require('google-auth-library');
const client = new OAuth2Client(CLIENT_ID);

async function verifyToken(token) {
  const ticket = await client.verifyIdToken({
    idToken: token,
    audience: CLIENT_ID
  });
  return ticket.getPayload();
}
```

**Step 2.3: 데이터베이스 스키마 (예시)**
```sql
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  google_id VARCHAR(255) UNIQUE NOT NULL,
  email VARCHAR(255) NOT NULL,
  name VARCHAR(255),
  picture_url TEXT,
  plan_type VARCHAR(50) DEFAULT 'free',
  usage_count INT DEFAULT 0,
  usage_limit INT DEFAULT 5,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

---

#### Phase 3: 프론트엔드-백엔드 연동

**Step 3.1: API 호출 추가**
```javascript
// APIService.js에 추가
async verifyUser(token) {
  const response = await fetch(`${this.baseUrl}/api/auth/verify`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    }
  });
  return response.json();
}

async getUserUsage() {
  const response = await fetch(`${this.baseUrl}/api/user/usage`, {
    headers: {
      'Authorization': `Bearer ${this.authToken}`
    }
  });
  return response.json();
}
```

**Step 3.2: 사용량 체크 로직**
```javascript
async canProcess() {
  if (!this.authService.isLoggedIn()) {
    // 비로그인 사용자: 로컬 카운트
    const localUsage = await this.getLocalUsage();
    return localUsage < 5; // 무료 5회
  }

  const usage = await this.apiService.getUserUsage();
  return usage.remaining > 0;
}
```

---

#### Phase 4: UI 업데이트

**Step 4.1: 로그인 상태 표시**
- 설정 모달에 로그인/로그아웃 버튼
- 로그인 시 프로필 사진 + 이름 표시
- 남은 사용 횟수 표시

**Step 4.2: 번역 키 추가 (translations.js)**
```javascript
// 한국어
'toast.loginSuccess': '로그인되었습니다',
'toast.loginFailed': '로그인에 실패했습니다',
'toast.logoutSuccess': '로그아웃되었습니다',
'settings.loggedInAs': '{name}님으로 로그인됨',
'settings.usageRemaining': '남은 사용량: {count}회',

// 영어
'toast.loginSuccess': 'Successfully logged in',
'toast.loginFailed': 'Login failed',
'toast.logoutSuccess': 'Successfully logged out',
'settings.loggedInAs': 'Logged in as {name}',
'settings.usageRemaining': 'Remaining usage: {count}',
```

---

### 테스트 체크리스트

- [ ] Chrome Extension OAuth 클라이언트 ID 발급
- [ ] manifest.json에 identity 권한 추가
- [ ] AuthService 클래스 구현
- [ ] 로그인 버튼 클릭 → Google 로그인 팝업 표시
- [ ] 로그인 성공 후 사용자 정보 저장
- [ ] 페이지 새로고침 후 자동 로그인 유지
- [ ] 로그아웃 기능 동작
- [ ] 백엔드 API 연동 (Phase 2 이후)

---

### 참고 문서

- [Chrome Identity API](https://developer.chrome.com/docs/extensions/reference/identity/)
- [Google OAuth 2.0 for Chrome Extensions](https://developer.chrome.com/docs/extensions/mv3/tut_oauth/)
- [Google Cloud Console](https://console.cloud.google.com)

---

## 📁 현재 브랜치

```
claude/show-todo-list-01AWohLiCxYHMHKMZmp2owQ1
```

## 🔗 커밋 히스토리 (이번 세션)

```
d8e4edf Feature: Add i18n support for English/Korean language switching
dcd2242 Feature: Add AI/User message distinction in original text area
f1af922 Docs: Add project documentation with business logic protection (시작점)
```

---

**작성일**: 2025-12-12
**다음 작업**: 구글 로그인 Phase 1 (Chrome Extension OAuth 설정)
