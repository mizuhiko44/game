# 予測投票ゲーム MVP 設計書

## 1. アーキテクチャ
- **Backend**: Node.js + TypeScript + Express + Prisma
- **DB**: PostgreSQL
- **Mobile**: React Native (Expo)
- **認証方式(MVP)**: `x-user-id` ヘッダーによる簡易認証（本番ではJWT置換）
- **APIベースパス**: 業務APIは `/api` 配下

## 2. ディレクトリ構成

```txt
backend/
  prisma/schema.prisma
  prisma/seed.ts
  src/
    modules/      # 機能単位(オンボーディング, 投票, 結果など)
    middlewares/  # auth / error
    routes/
mobile/
  App.tsx
  src/lib/        # API client / 型
  src/screens/    # MVP画面
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
- アバター育成アイテムは初期所持なし（的中 + イベント設定時に報酬配布）

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

### 5.1 開発支援エンドポイント
- `GET /` : APIメタ情報
- `GET /api` : 公開/保護ルート一覧と認証要件
- `GET /health` : ヘルスチェック

## 6. 画面仕様（現状反映）
- Onboarding: ユーザー作成API連携済み
- Home: ホーム集約データAPI連携済み
- EventList: openイベント一覧API連携済み
- EventDetail: イベント詳細API連携済み（人気比率は簡易表示）
- Vote: 投票API連携済み
- VoteComplete: 投票完了データ表示に対応
- VoteHistory: 履歴API連携済み
- ResultList: 結果一覧API連携済み
- ResultDetail: 選択結果の詳細表示に対応（正解選択肢は未表示）
- Avatar: 取得API + 育成API連携済み
- MyPage: `/api/me` 連携済み

## 7. 直近の改善反映（運用知見）

### 7.1 API接続
- モバイルは単一APIクライアント (`mobile/src/lib/api.ts`) を利用
- デフォルトは Web開発向け `http://localhost:3000`
- `EXPO_PUBLIC_API_BASE_URL` で実機/LAN検証に対応
- `/api` パスの正規化ロジックを入れ、重複/欠落を防止

### 7.2 Avatar育成エラー対策
- 所持アイテム不足時は API が `400 insufficient items` を返却
- UI側は所持数0時に「使う」ボタンを無効化し、説明メッセージを表示
- これにより「押したら動作不能」の体験を回避

### 7.3 エラーハンドリング
- `HttpError` に加えて HTTP-like エラーをミドルウェアで4xx返却
- 不要な500化を抑制し、クライアント表示を安定化

## 8. 受け入れ済みフロー（現時点）
以下のE2E動作を確認済み:
- user onboarding
- x-user-id header based auth
- event list
- vote creation
- vote history
- result settlement
- idempotent settle behavior
- reward points
- reward item grant
- avatar level up
- passive effect update

## 9. 完成度を上げるための構想（次フェーズ）

### Phase A: MVP品質の安定化（最優先）
1. **入力/状態バリデーション統一**
   - Zodエラーの共通レスポンス化
   - フロント側エラー文言マッピング
2. **接続設定の環境分離**
   - Web / Android / iOS で API URL テンプレートを README に追加
3. **観測性向上**
   - request-id ログ
   - 主要APIのレスポンス時間計測
4. **最低限テスト追加**
   - vote / settle / avatar level-up のユニット + API統合テスト

### Phase B: UX向上（MVP範囲内）
1. EventDetail の人気比率をグラフ表示へ改善
2. ResultDetail に正解選択肢・結果時刻を追加
3. VoteComplete に次のおすすめイベント導線を追加
4. Homeおすすめイベントのロジック改善（地域 + 締切 + 未投票優先）

### Phase C: 拡張準備（MVP対象外機能を見据えた土台）
1. 認証のJWT化と管理者権限制御
2. 管理機能を簡易Web UI化
3. 集計基盤整備（ランキング・オッズ導入の前提データ）

## 10. MVPスコープ維持事項（非対象）
- 課金機能
- コメント機能
- フレンド機能


## 11. 現状の未実装 / 要改善ポイント（MVP内）
- EventDetail: 人気比率の見せ方は簡易表示（グラフUI未対応）
- ResultDetail: 正解選択肢の表示は未対応（API拡張が必要）
- VoteComplete: 推奨イベント導線・結果予定時刻の表示が未対応
- 管理API: MVPでは管理者認可が未実装（将来は権限分離が必要）
- テスト: 自動E2Eテストの整備は未完了（手動検証中心）
