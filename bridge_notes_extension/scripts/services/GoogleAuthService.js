/**
 * Google OAuth 인증 서비스
 * Chrome Identity API를 사용한 구글 로그인
 */

import { ErrorHandler } from '../components/ErrorHandler.js';

export class GoogleAuthService {
  constructor() {
    this.user = null;
    this.token = null;
  }

  /**
   * 구글 로그인 실행
   * @returns {Promise<Object>} 사용자 정보 { email, name, picture }
   */
  async login() {
    try {
      // Chrome Identity API로 OAuth 토큰 획득
      const token = await this.getAuthToken(true);

      if (!token) {
        throw new Error('Failed to get auth token');
      }

      this.token = token;

      // 토큰으로 사용자 정보 가져오기
      const userInfo = await this.getUserInfo(token);

      // 사용자 정보 저장
      this.user = {
        email: userInfo.email,
        name: userInfo.name,
        picture: userInfo.picture,
        id: userInfo.id
      };

      // Chrome Storage에 저장
      await ErrorHandler.safeStorageSet({
        googleUser: this.user,
        googleToken: token,
        googleLoginTime: Date.now()
      });

      console.log('Google login successful:', this.user.email);
      return this.user;

    } catch (error) {
      console.error('Google login failed:', error);
      throw error;
    }
  }

  /**
   * 구글 로그아웃
   */
  async logout() {
    try {
      // Chrome Storage에서 제거
      await ErrorHandler.safeStorageRemove(['googleUser', 'googleToken', 'googleLoginTime']);

      // 토큰 revoke
      if (this.token) {
        await this.revokeToken(this.token);
      }

      this.user = null;
      this.token = null;

      console.log('Google logout successful');
      return true;

    } catch (error) {
      console.error('Google logout failed:', error);
      throw error;
    }
  }

  /**
   * 로그인 상태 확인
   * @returns {Promise<Object|null>} 로그인되어 있으면 사용자 정보, 아니면 null
   */
  async checkLoginStatus() {
    try {
      const result = await ErrorHandler.safeStorageGet(['googleUser', 'googleToken', 'googleLoginTime']);

      if (!result.googleUser || !result.googleToken) {
        return null;
      }

      // 토큰이 7일 이상 경과했으면 만료로 간주
      const loginTime = result.googleLoginTime || 0;
      const daysSinceLogin = (Date.now() - loginTime) / (1000 * 60 * 60 * 24);

      if (daysSinceLogin > 7) {
        console.log('Token expired, logging out');
        await this.logout();
        return null;
      }

      // 토큰 유효성 검증
      const isValid = await this.validateToken(result.googleToken);

      if (!isValid) {
        console.log('Token invalid, logging out');
        await this.logout();
        return null;
      }

      this.user = result.googleUser;
      this.token = result.googleToken;

      return this.user;

    } catch (error) {
      console.error('Failed to check login status:', error);
      return null;
    }
  }

  /**
   * Chrome Identity API로 OAuth 토큰 획득
   * @param {boolean} interactive - 사용자 상호작용 허용 여부
   * @returns {Promise<string>} Access token
   */
  async getAuthToken(interactive = false) {
    return new Promise((resolve, reject) => {
      chrome.identity.getAuthToken({ interactive }, (token) => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
        } else {
          resolve(token);
        }
      });
    });
  }

  /**
   * 토큰으로 사용자 정보 가져오기
   * @param {string} token - Access token
   * @returns {Promise<Object>} 사용자 정보
   */
  async getUserInfo(token) {
    const response = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    if (!response.ok) {
      throw new Error('Failed to get user info');
    }

    return await response.json();
  }

  /**
   * 토큰 유효성 검증
   * @param {string} token - Access token
   * @returns {Promise<boolean>} 유효하면 true
   */
  async validateToken(token) {
    try {
      const response = await fetch(`https://www.googleapis.com/oauth2/v1/tokeninfo?access_token=${token}`);
      return response.ok;
    } catch (error) {
      console.error('Token validation failed:', error);
      return false;
    }
  }

  /**
   * 토큰 revoke
   * @param {string} token - Access token
   */
  async revokeToken(token) {
    return new Promise((resolve, reject) => {
      chrome.identity.removeCachedAuthToken({ token }, () => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
        } else {
          // Google에도 revoke 요청
          fetch(`https://accounts.google.com/o/oauth2/revoke?token=${token}`)
            .then(() => resolve())
            .catch(reject);
        }
      });
    });
  }

  /**
   * 현재 로그인된 사용자 정보 가져오기
   * @returns {Object|null} 사용자 정보
   */
  getCurrentUser() {
    return this.user;
  }

  /**
   * 현재 토큰 가져오기
   * @returns {string|null} Access token
   */
  getToken() {
    return this.token;
  }
}
