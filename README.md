# BRIDGE Notes - Chrome Extension

AI 대화를 두 클릭으로 캡처하고 자동으로 정리하는 Chrome 확장 프로그램

![Version](https://img.shields.io/badge/version-1.2.0-blue)
![License](https://img.shields.io/badge/license-MIT-green)
![Chrome](https://img.shields.io/badge/chrome-v88+-yellow)

---

## 🎯 주요 기능

### 1. 두 클릭 캡처
- 시작점 클릭 → 끝점 클릭으로 간편한 범위 선택
- 원본 텍스트 즉시 표시
- Claude.ai, ChatGPT, Perplexity, Google Gemini 지원

### 2. AI 자동 정리
- **다단계 AI 처리 시스템**
  1. 대화 내용 분석
  2. 핵심 정보 추출 및 정리
  3. 자연스러운 표현으로 재구성
  4. 선택한 어조로 최적화
- 개인화/전문화 어조 선택
- 10-15초 내 자동 정리 완료

### 3. 스마트 캐싱
- 동일 내용 재처리 시 즉시 응답 (< 1초)
- 최대 10개 캐시, 7일 자동 만료
- 75% 비용 절감, 90% 시간 단축

### 4. 히스토리 관리
- 처리된 노트 자동 저장 (최대 50개)
- 과거 노트 빠른 검색 및 재사용
- 개별/전체 삭제 지원

---

## 📦 설치 방법

### Chrome Web Store (추천)
```
[Chrome Web Store 링크 추가 예정]
```

### 수동 설치 (개발자 모드)
1. 이 저장소 클론
   ```bash
   git clone https://github.com/bridge/bridge_notes.git
   cd bridge_notes
   ```

2. Chrome 확장프로그램 페이지 열기
   ```
   chrome://extensions/
   ```

3. "개발자 모드" 활성화 (우측 상단)

4. "압축해제된 확장 프로그램을 로드합니다" 클릭

5. `bridge_notes_extension` 폴더 선택

6. 확장프로그램 설치 완료 ✓

---

## 🚀 사용 방법

### 1단계: 대화 캡처
1. Claude.ai 또는 ChatGPT에서 대화 진행
2. 확장프로그램 아이콘 클릭 (Side Panel 열림)
3. "범위 선택 시작" 버튼 클릭
4. 캡처할 대화의 **시작점 클릭**
5. 캡처할 대화의 **끝점 클릭**
6. 원본 텍스트 즉시 표시 ✓

### 2단계: AI 정리
- 개인화/전문화 어조 선택
- "재생성" 버튼 클릭
- 10-15초 후 AI 정리 결과 자동 표시

### 3단계: 활용
- 📋 복사 버튼: AI 정리 결과 클립보드 복사
- 📄 원본 복사: 원본 텍스트 복사
- 🔄 재생성: 다른 어조로 다시 정리
- 📚 히스토리: 과거 노트 확인

---

## 🌐 지원 플랫폼

| 플랫폼 | 지원 여부 | 테스트 완료 |
|--------|-----------|-------------|
| Claude.ai | ✅ | ✅ |
| ChatGPT | ✅ | ✅ |
| Perplexity | ✅ | 🔄 |
| Google Gemini | ✅ | 🔄 |

---

## ⚙️ 설정

### 언어
- 한국어 (기본)
- English (준비 중)

### 사용 플랜
- Free: 5회/월
- Basic30: 30회/월
- Standard100: 100회/월
- MAX: 무제한

### 테마
- 시스템 설정 따라가기 (기본)
- 라이트 모드
- 다크 모드

### AI 정리 사용
- 활성화 (기본): AI 자동 정리 사용
- 비활성화: 원본 텍스트만 캡처

---

## 🏗️ 기술 스택

### Frontend
- Chrome Extension Manifest V3
- Vanilla JavaScript (ES6 Modules)
- CSS3 (Modular Architecture)

### Backend
- AI 기반 다단계 처리 시스템
- 클라우드 워크플로우 자동화
- RESTful API 통신

### Infrastructure
- 클라우드 호스팅
- Chrome Storage API (캐싱 및 히스토리)

---

## 📊 성능

| 지표 | 값 |
|------|-----|
| 첫 캡처 처리 시간 | ~12초 |
| 캐시 히트 시간 | < 1초 |
| 재생성 시간 (어조 변경) | ~10초 |
| 캐시 히트율 (예상) | 30-40% |
| 1회당 비용 | ~$0.033 |

---

## 📝 알려진 이슈

현재 알려진 이슈 및 해결 방안은 [KNOWN_ISSUES.md](KNOWN_ISSUES.md) 참조

주요 이슈:
1. 🔴 클로드 대화 내 코드 블록 및 특수 영역 캡처 누락
2. 🟡 전문화 스크립트 `** n/6 **` 마크다운 노출
3. 🟡 다크모드 어조 아이콘 배경 (확인 필요)

---

## 🗺️ 로드맵

계획된 기능은 [TODO.md](TODO.md) 참조

### 우선순위
1. **High**: 클로드 div 문제 해결, 전문화 스크립트 수정
2. **Medium**: AI/사용자 대화 구분, 영어 모드 지원
3. **Low**: 구글 로그인, 사용자 API 키 지원

---

## 🤝 기여

현재 비공개 프로젝트입니다.

---

## 📄 라이선스

MIT License

Copyright (c) 2025 BRIDGE

---

## 📞 문의

- **Product by:** BRIDGE
- **Version:** 1.2.0
- **Support:** [문의하기](mailto:support@bridge.com)

---

## 🔗 관련 문서

- [PHASE2_PLAN.md](PHASE2_PLAN.md) - Phase 2 구현 계획 및 기술 상세
- [TODO.md](TODO.md) - 작업 목록 및 우선순위
- [KNOWN_ISSUES.md](KNOWN_ISSUES.md) - 알려진 이슈 및 해결 방안
- [CHANGELOG.md](CHANGELOG.md) - 버전별 변경사항
- [claudedocs/CSS_ARCHITECTURE.md](claudedocs/CSS_ARCHITECTURE.md) - CSS 구조 문서

---

**"오늘의 삽질이 내일의 브릿지가 되는"** - 개인의 깨달음을 공공의 대화로 확장
