# Changelog

All notable changes to the Bridge Notes Chrome Extension will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [1.2.0] - 2025-12-12

### Added
- 히스토리 기능: 처리된 노트 자동 저장 (최대 50개, LRU)
- 히스토리 탭에서 과거 노트 목록 확인
- 히스토리 항목 클릭 시 결과 탭 자동 전환
- 개별/전체 삭제 기능
- 캐싱 시스템: Chrome Storage 기반 LRU 캐시
- SHA-256 해시 기반 캐시 키
- 7일 만료, 최대 10개 항목
- 캐시 히트 시 즉시 결과 표시 (< 1초)

### Changed
- 설정 UI 정리: 기본 어조 설정 제거, 복사 대상 설정 제거
- 시스템 테마 지원 추가 (system/light/dark)
- 다크모드 .status-message 스타일 개선
- 메인 화면 어조 선택 기능 추가 (빈 상태에서 미리 선택)

### Fixed
- 히스토리 불러오기 시 원본 텍스트 표시 버그 수정
- originalText.textContent 사용으로 변경

### Removed
- Progress UI 제거 (사용자 피드백 반영)
- 진행 단계 표시 대신 단순 로딩 텍스트로 복원

---

## [1.1.0] - 2025-12-11

### Added
- Regenerate 최적화: 중간 결과 캐싱으로 성능 개선
- 75% 비용 절감, 90% 시간 단축 (90초 → 10초)
- 어조 변경 시 전체 재처리 없이 빠른 응답
- APIService에 캐시 파라미터 추가
- 백엔드 워크플로우 분기 처리 최적화

### Changed
- 2번 API 호출 → 1번 최적화 (단일 요청 처리)
- 백엔드에서 전체 파이프라인 통합 처리
- Extension에서 중복 호출 제거

---

## [1.0.0] - 2025-12-10

### Added
- CSS 모듈화: 2621줄 단일 파일 → 13개 모듈 파일
  - base.css + 10개 컴포넌트 + dark-mode.css
- Floating 전체 캡처 버튼 (비활성화 상태)
  - 범위 선택 모드에서만 표시
  - 클릭 이벤트 처리 개선
  - 미작동 이슈로 임시 비활성화 (KNOWN_ISSUES.md #3)

### Changed
- 확장프로그램 기본 구조 완성
- Chrome Extension Manifest V3
- 다단계 AI 파이프라인 구현
- 범위 선택 기능 (Two-click capture)
- 원본 텍스트 즉시 표시
- AI 자동 정리 시스템
- 어조 선택 (개인화/전문화)
- 클립보드 복사 기능

### Fixed
- 헤더와 "범위 선택 시작" 버튼 상단 고정 (sticky positioning)
- 다크모드 푸터 배경색 추가
- 어조 버튼 이름 변경: "친근하게" → "개인화", "정중하게" → "전문화"

---

## Known Issues

현재 알려진 이슈는 [KNOWN_ISSUES.md](KNOWN_ISSUES.md) 참조

## Upcoming Features

계획된 기능은 [TODO.md](TODO.md) 참조

---

**Project Repository:** [Bridge Notes](https://github.com/bridge/bridge_notes)
**Documentation:** See [PHASE2_PLAN.md](../docs/technical/PHASE2_PLAN.md) for technical details
