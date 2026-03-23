# Web URLルーティング対応表

## 1. 目的
本書は、Expo Router を前提に Web URL ルーティングを本格化する際の対応表と auth guard 方針をまとめたメモです。

## 2. Route 対応表

| URL | tab / screen | 認証 | URLで保持する値 | 備考 |
| --- | --- | --- | --- | --- |
| `/` | Onboarding | public only | なし | 入口は onboarding と同義 |
| `/onboarding` | Onboarding | public only | なし | ログイン済みなら `/home` へ |
| `/home` | Home | auth | なし | ダッシュボード |
| `/events` | Events | auth | なし | イベント一覧 |
| `/events/:eventId` | EventDetail | auth | `eventId` | 詳細 deep link |
| `/vote?eventId=:eventId` | Vote | auth | `eventId` | EventDetail からの遷移を URL で保持 |
| `/vote/complete?eventId=:eventId` | VoteComplete | auth | `eventId` | 投票完了画面 |
| `/history` | History | auth | なし | 投票履歴 |
| `/results` | Results | auth | なし | 結果一覧 |
| `/results/:resultId` | ResultDetail | auth | `resultId` | 結果詳細 deep link |
| `/avatar` | Avatar | auth | なし | アバター画面 |
| `/me` | MyPage | auth | なし | マイページ |
| `/admin` | Admin | admin | なし | 非 admin は `/home` へ |

## 3. Auth guard 方針
- `public only` ルートは未ログイン専用とし、ログイン済みなら `/home` へ redirect する
- `auth` ルートはログイン必須とし、未ログインなら `/onboarding` へ redirect する
- `admin` ルートは `role=admin` 必須とし、一般ユーザーは `/home` へ redirect する
- 認可の最終判定は backend を正とし、Web 側 guard は導線制御に限定する

## 4. URL へ移す state
- `selectedEventId` は `/events/:eventId` と `/vote?eventId=:eventId` に移す
- `selectedResult` は object 保持をやめ、`/results/:resultId` の `resultId` を正とする
- detail の再表示は route param 起点で復元する
