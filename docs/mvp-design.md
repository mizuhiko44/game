# 予測投票ゲーム MVP 設計書

## 1. アーキテクチャ
- **Backend**: Node.js + TypeScript + Express + Prisma
- **DB**: PostgreSQL
- **Mobile**: React Native (Expo) 画面雛形
- **認証方式(MVP)**: `x-user-id` ヘッダーによる簡易認証（本番ではJWT置換）

## 2. ディレクトリ構成

```
backend/
  prisma/schema.prisma
  src/
    modules/    # 機能単位(オンボーディング, 投票, 結果など)
    middlewares/
    routes/
mobile/
  App.tsx
  src/screens/  # MVP画面雛形
docs/
  mvp-design.md
```

## 3. ドメインと主な責務
- Users: 初回登録、1000pt付与、プロフィール
- Events: global/local イベント一覧・詳細
- Votes: 1イベント1回投票、投票コスト計算、履歴
- Results: 結果一覧
- Avatar: パッシブ効果、育成アイテム消費、レベルアップ
- Admin: 結果確定（冪等）

## 4. MVPビジネスルール
- 新規登録時に1000ptを付与し、`point_transactions` に `initial` 記録
- 1イベント1ユーザー1回投票（`@@unique([userId, eventId])`）
- 実消費ポイント:
  - `actualConsumedPoints = Math.floor(inputBetPoints * (100 - discountPercent) / 100)`
  - `actualConsumedPoints = Math.max(1, actualConsumedPoints)`
- 結果確定時の報酬:
  - MVP固定 `rewardPoints = inputBetPoints * 2`
- ポイント増減は必ず `point_transactions` に記録
- 結果確定は `event_results.eventId` の一意制約で冪等化

## 5. API設計（MVP）
- `POST /api/users/onboarding`
- `GET /api/home`
- `GET /api/events`
- `GET /api/events/:eventId`
- `POST /api/votes`
- `GET /api/votes/history`
- `GET /api/results`
- `GET /api/avatar`
- `POST /api/avatar/level-up`
- `GET /api/me`
- `POST /api/admin/events/settle`

## 6. 画面雛形（MVP）
- Onboarding
- Home
- EventList
- EventDetail
- Vote
- VoteComplete
- ResultList
- ResultDetail
- VoteHistory
- Avatar
- MyPage

## 7. 今後拡張を見据えた設計ポイント
- コメント、フレンド、課金は独立モジュールとして追加可能
- `point_transactions` を監査ログとして活用
- オッズやランキングは votes/results 集計拡張で追加可能
