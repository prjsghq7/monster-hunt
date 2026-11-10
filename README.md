# Monster Hunt: Last Stand

헌터 4명 중 하나를 골라 30초 안에 보스를 쓰러뜨리는 브라우저 슈팅 미니게임입니다. 빌드나 설치 없이 HTML · CSS · JavaScript만으로 동작하고, 설정과 랭킹은 로그인 없이 브라우저에 저장됩니다.

- 플레이: https://prjsghq7.github.io/monster-hunt/
- 포트폴리오: https://prjsghq7.github.io/ (AI 활용 › Monster Hunt)

## 게임 구성

| 항목 | 내용 |
|---|---|
| 헌터 4명 | Vanguard · Ranger · Arcanist · Berserker, 각자 다른 사격과 전용 스킬 |
| 보스 3종 | Golem · Wyrm · Eye, 보스마다 다른 공격 패턴 (낙석 · 브레스 · 저주 탄막 등) |
| 난이도 | EASY · NORMAL · HARD |
| 특성 | 시작 전에 고르는 추가 옵션 |
| 랭킹 | 기록을 브라우저(localStorage)에 보관 |

## 조작

| 입력 | 동작 |
|---|---|
| `W` `A` `S` `D` / 방향키 | 이동 |
| 마우스 이동 | 조준 |
| 왼쪽 버튼 (누르고 있기) | 사격 |
| 오른쪽 버튼 | 스킬 |
| `P` / `Esc` | 일시정지 |

## 헌터 스킬

| 헌터 | 스킬 | 기본 쿨타임 |
|---|---|---|
| Vanguard | DRAGON BURST: 4초 동안 5방향 분열 강화 사격 | 7초 |
| Ranger | SHADOW STEP: 1.0초 무적 | 6초 |
| Arcanist | ARCANE NOVA: 전방위 마력탄을 4차례 연속 폭발 (파동당 20발) | 7초 |
| Berserker | BLOOD RUSH: 피해와 크기(약 1.75배)가 커진 강화 사격 | 8초 |

## 실행 방법

빌드 과정이 없습니다. `index.html`을 브라우저로 열거나, 정적 서버로 실행합니다.

```bash
python -m http.server 8000
```

그다음 `http://localhost:8000`을 엽니다.

## 구조

```text
index.html   화면 구조 (선택 화면 · 전투 · 결과 · 설정)
styles.css   화면 스타일
game.js      게임 루프 · 이동 · 사격 · 스킬 · 보스 패턴 · 충돌 · 저장
assets/      헌터 · 보스 · 배경 이미지
```

## 만든 방식

K-뉴딜 SKT ALEPH 과정의 AI 활용 과제입니다. 코드 작성과 UI 구성은 AI에게 맡기고, 캐릭터별 역할과 스킬, 보스 패턴, 난이도, 조작 방식, 밸런스는 직접 플레이하며 정하고 고쳤습니다.

## 변경 기록

### v46

- 모든 헌터의 기본 스킬 쿨타임 1초 감소 (Vanguard 7초 · Ranger 6초 · Arcanist 7초 · Berserker 8초)
- Vanguard / DRAGON BURST: 지속시간 3초 → 4초, 3방향 → 5방향 분열 강화 사격
- Ranger / SHADOW STEP: 무적시간 0.9초 → 1.0초
- Arcanist / ARCANE NOVA: 스킬 중 강화 사격 제거, 사용 즉시 전방위 마력탄 4차례 연속 폭발 (파동당 20발, 파동마다 속도가 달라 겹쳐 퍼짐), 유도 특성과 무관하게 전방위 패턴 유지
- Berserker / BLOOD RUSH: 강화 사격 추가 피해 대폭 상승, 강화탄 크기 약 1.75배, 전용 오렌지 글로우와 반동 표현 추가
