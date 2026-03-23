# 予測投票ゲーム 設計仕様書

## 1. 文書の目的
本書は、予測投票ゲームMVPの現行実装を前提に、システム構成・データモデル・業務ルール・API・画面・運用上の前提をまとめた設計仕様書です。

本仕様書の対象は以下です。
- backend API（Node.js / TypeScript / Express / Prisma）
- DBスキーマ（PostgreSQL）
- mobile UI（Expo / React Native）
- web 配備構成（Expo Router / static export / Vercel）
- MVP運用ルール（簡易認証、イベント運用、結果反映、アバター育成）

---

## 2. システム概要

### 2.1 目的
ユーザーは予測イベントに対してポイントを使って投票し、正解した場合に報酬ポイントやアイテムを獲得できます。
管理者相当の利用者はイベントを作成し、正解選択肢を事前登録できます。イベントは締切時刻・結果時刻に応じて自動的に状態遷移し、結果精算が行われます。

### 2.2 MVPの特徴
- 認証は `AUTH_MODE` に応じて `x-user-id` ヘッダーまたは Bearer JWT を利用
- イベントは `global` / `local` をサポート
- 投票は「1ユーザー × 1イベント = 1回」のみ
- 正解時の報酬は固定倍率（MVPでは `inputBetPoints * 2`）
- 管理画面から正解選択肢を事前登録可能
- Home で直近の結果通知を表示
- Admin で簡易メトリクスと Web コンソール表示をサポート
- `voteEndAt` / `resultAt` に基づく自動状態更新を実装
- アバターのパッシブ効果と育成アイテム利用を実装

### 2.3 現在の実装ステータス（2026-03-23 / イテレーション2完了時点）
- backend API と React Native 向け MVP UI 本体は、引き続き `mobile/App.tsx` を中心に維持されています。
- Web 配備向けには Expo Router を導入し、`mobile/index.js` から `expo-router/entry` を起動、`mobile/app/index.tsx` で `App.tsx` を再利用する構成へ接続済みです。
- `node ./node_modules/expo/bin/cli export --platform web` により静的ファイルを書き出し、Vercel での Web デプロイを継続可能な状態です。
- Render 側では Prisma schema 未作成時の初回デプロイ対策として `start:render` を使い、`db push` と seed により API 起動を安定化しています。
- Web では UI 表示、onboarding / login / home、admin 操作、投票、結果確認まで確認済みであり、イテレーション2の目標としていた「主要MVP導線の Web 復旧」は達成済みです。
- JWT 運用は、web で httpOnly refresh cookie + in-memory access token を用いるデフォルト導線まで実装済みです。
- 一方で、route component 分割の本格化、App 状態責務の整理、Admin の一覧最適化、migration 正式化、監視導入などは次フェーズの残件です。

---

## 3. アーキテクチャ

### 3.1 全体構成
- **Backend**: Node.js + TypeScript + Express + Prisma
- **Database**: PostgreSQL
- **Mobile**: React Native (Expo)
- **運用前提**: 単一APIサーバー + 単一DB構成のMVP

### 3.2 ディレクトリ構成

```txt
backend/
  prisma/
    schema.prisma        # DB定義
    seed.ts              # サンプルデータ投入
  src/
    app.ts               # Expressアプリ
    server.ts            # 起動エントリ
    config/              # 環境変数読込
    lib/                 # prisma/logger/avatar-level など
    middlewares/         # auth / error
    modules/             # 機能別コントローラ
    routes/              # APIルーティング
mobile/
  App.tsx                # 既存MVP UI本体（現在は主にネイティブ/旧構成側の実装資産）
  index.js               # Expo Router entry
  app/                   # Web向けルート定義
    _layout.tsx          # Router layout
    index.tsx            # Web 入口。既存 App.tsx を再利用
  src/
    components/          # 共通UI
    lib/                 # API client / 型 / session
    screens/             # MVP画面群
docs/
  mvp-design.md          # 本設計仕様書
```

### 3.3 APIベースパス
- 業務APIは `/api` 配下
- 公開API:
  - `GET /`
  - `GET /health`
  - `GET /api`

### 3.4 Web配備アーキテクチャの現状
- Web の起動エントリは `mobile/package.json` の `main = index.js` です。
- `mobile/index.js` は `expo-router/entry` を読み込み、Expo Router ベースで Web ルーティングを開始します。
- `mobile/app.json` では `plugins = ["expo-router"]` と `web.output = "static"` を設定し、Vercel 配備しやすい静的エクスポート前提にしています。
- `mobile/app/index.tsx` は現在 `App.tsx` を再エクスポートしており、既存の AppShell / Home / Events / Vote / Admin などを Web でも利用します。
- そのため Web は「プレースホルダー表示」段階を脱し、既存 MVP 画面群を暫定的に Router 配下へ接続した構成です。
- `mobile/src/lib/router.ts` による URL 同期は入っているものの、画面分割や data loader を伴う Expo Router 本来の route 構成にはまだ移行途中です。

---

## 4. 認証・権限制御

### 4.1 認証方式
`AUTH_MODE` により認証方式を切り替えます。
- `mvp_header`: 保護APIは `x-user-id` ヘッダー必須
- `jwt_transition`: Bearer token を優先しつつ、一般APIのみ `x-user-id` との併用を許可
- `jwt_required`: 保護APIは Bearer JWT 必須

ログイン/認証APIでは access token / refresh token を返却し、refresh token は `AuthSession` にハッシュ保存して失効管理します。

### 4.2 権限制御の現状
- 一般保護APIは `authMiddleware` により認証済みユーザーのみ利用可能
- Admin API は `adminMiddleware` により `role=admin` を必須化
- `jwt_transition` / `jwt_required` では Admin API に Bearer token を必須化し、`x-user-id` のみでの管理操作は不可
- 権限制御は role ベースまで実装済みで、policy/permission 単位の細分化は未実装

---

## 5. ドメインモデル

### 5.1 主なエンティティ
- **User**: ユーザー基本情報、所持ポイント
- **Avatar**: ユーザーのアバター情報
- **AvatarPassiveEffect**: ベット消費軽減などの効果
- **ItemMaster**: 育成アイテム定義
- **UserItem**: ユーザーの所持アイテム
- **Event**: 予測イベント本体
- **EventOption**: イベントの選択肢
- **Vote**: ユーザーの投票
- **EventResult**: 正解選択肢の登録情報
- **PointTransaction**: ポイント増減履歴

### 5.2 イベント種別
- `eventType`
  - `global`: 全体向けイベント
  - `local`: 地域限定イベント

### 5.3 イベントカテゴリ
- `sports`
- `economy`
- `entertainment`
- `local`

### 5.4 イベント状態
- `scheduled`: 開始前
- `open`: 投票受付中
- `closed`: 投票締切済み・結果未精算
- `settled`: 結果精算済み

### 5.5 投票状態
- `pending`: 未精算
- `won`: 的中
- `lost`: 不的中

---

## 6. イベントライフサイクル設計

### 6.1 状態遷移
イベント状態は以下の規則で遷移します。

1. `scheduled -> open`
   - `startAt <= now`
   - かつ `voteEndAt > now`

2. `scheduled/open -> closed`
   - `voteEndAt <= now`

3. `closed/open/scheduled -> settled`
   - `resultAt <= now`
   - かつ `EventResult`（正解選択肢登録済み）が存在する

### 6.2 自動反映の実行タイミング
以下のAPI呼び出し時にイベントの自動同期を実施します。
- `GET /api/events`
- `GET /api/events/:eventId`
- `GET /api/events/:eventId/participants`
- `POST /api/votes`
- `GET /api/votes/history`
- `GET /api/home`
- `GET /api/results`
- `GET /api/me`
- `POST /api/admin/events/settle`

### 6.3 自動精算処理
`resultAt` を過ぎ、かつ正解選択肢が登録済みのイベントに対して以下を実施します。
- `event_results.settledAt` を更新
- `votes.status` を `pending -> won/lost` に更新
- 的中ユーザーへ `rewardPoints = inputBetPoints * 2` を付与
- `point_transactions` に `reward` を記録
- イベントに報酬アイテム設定がある場合、的中ユーザーへ `user_items` を付与
- `events.status = settled` に更新

### 6.4 冪等性
- 未精算票 (`pending`) のみを精算対象にすることで重複報酬を防止
- 結果登録済み・精算済みイベントに同じ結果を再送しても、結果の再配布は行わない
- 精算済みイベントで異なる正解選択肢への変更は不可

---

## 7. 業務ルール

### 7.1 ユーザー登録
- オンボーディング時に初期ポイント `1000pt` を付与
- `point_transactions` に `initial` を記録

### 7.2 投票ルール
- 1ユーザーが同一イベントに投票できるのは1回のみ
- 制約は `@@unique([userId, eventId])`
- `betPoints >= minBetPoints` が必須
- `event.status = open` かつ `startAt <= now < voteEndAt` のときのみ投票可

### 7.3 実消費ポイント
アバターの割引効果を加味して消費ポイントを算出します。

```txt
actualConsumedPoints = floor(inputBetPoints * (100 - discountPercent) / 100)
actualConsumedPoints = max(1, actualConsumedPoints)
```

### 7.4 的中報酬
- MVPでは固定倍率: `rewardPoints = inputBetPoints * 2`
- 不的中時の `rewardPoints = 0`

### 7.5 ポイント台帳
- 投票時は `transactionType = bet`
- 的中報酬時は `transactionType = reward`
- 初期付与時は `transactionType = initial`
- ポイント増減は原則すべて `point_transactions` に記録する

### 7.6 アイテム報酬
- イベントに `rewardItemId` と `rewardItemQuantity > 0` が設定されている場合のみ配布
- 的中者に対して `user_items` を加算

### 7.7 アバター育成
- `POST /api/avatar/level-up` で所持アイテムを消費して経験値を獲得
- 所持不足時はエラー返却
- パッシブ効果（例: `bet_cost_discount`）を持つ

---

## 8. 管理機能仕様

### 8.1 イベント作成
管理画面または `POST /api/admin/events` でイベントを作成可能です。

入力項目:
- eventType
- regionCode（local時必須）
- category
- title
- description
- startAt
- voteEndAt
- resultAt
- minBetPoints
- rewardItemId
- rewardItemQuantity
- options

バリデーション:
- `voteEndAt > startAt`
- `resultAt > voteEndAt`
- 選択肢は2件以上、重複不可

### 8.2 正解選択肢の登録
`POST /api/admin/events/settle` は、現仕様では「即時精算API」ではなく、以下の役割を持ちます。
- 正解選択肢の事前登録
- 未精算イベントの正解更新
- `resultAt` が既に過ぎている場合の即時自動精算トリガー

### 8.3 管理APIレスポンス
返却項目:
- `idempotent`
- `settlementTriggered`
- `eventStatus`
- `eventResult`
- `processedVoteCount`
- `winnerCount`
- `totalRewardPoints`
- `rewardedItemUserCount`

---

## 9. API仕様

### 9.1 公開API
- `POST /api/users/onboarding`
- `POST /api/users/login`
- `POST /api/auth/login`
- `POST /api/auth/refresh`
- `GET /`
- `GET /health`
- `GET /api`
- `GET /api/config`

### 9.2 保護API
- `GET /api/auth/me`
- `POST /api/auth/logout`
- `GET /api/home`
- `GET /api/events`
- `GET /api/events/:eventId`
- `GET /api/events/:eventId/participants`
- `POST /api/votes`
- `GET /api/votes/history`
- `GET /api/results`
- `GET /api/avatar`
- `POST /api/avatar/level-up`
- `GET /api/me`
- `GET /api/admin/users`
- `GET /api/admin/metrics`
- `POST /api/admin/events`
- `POST /api/admin/events/settle`

### 9.3 一覧APIの基本仕様
#### `GET /api/events`
主なクエリ:
- `status`
- `type`
- `regionCode`

補足:
- `status=open` は投票可能イベントのみ対象
- `status=closed` は `closed` と `settled` を含む
- レスポンスには以下を含む
  - `options`
  - `result`
  - `participantCount`
  - `myVote`

### 9.4 結果API
#### `GET /api/results`
- ログインユーザー自身の精算済み投票のみ返却
- `Vote.status != pending` が対象

### 9.5 マイページAPI
#### `GET /api/me`
返却情報:
- nickname
- regionCode
- totalPoints
- totalVotes
- hitRate
- avatarLevel
- winningStreak
- bestWinningStreak

---

## 10. 画面仕様

### 10.1 Onboarding
- ニックネーム、地域、アバター種別を指定してユーザー作成

### 10.2 Home
- ユーザー概要
- おすすめイベント
- 締切が近いイベント
- 精算済みイベント
- 直近の投票結果通知（的中/不的中メッセージ）

### 10.3 EventList
- openイベント一覧を表示
- 参加メンバー表示に対応
- `voteEndAt` までの残り時間を表示
- `resultAt` までの残り時間を表示

### 10.4 EventDetail
- イベント詳細、選択肢、参加状況、人気集計を表示

### 10.5 Vote
- openイベントに対する投票
- 最低ベット額と参加人数を表示
- 投票後は完了画面へ遷移可能

### 10.6 VoteHistory
- クローズ済み/精算済みイベントを履歴表示
- 自分の投票結果確認に利用

### 10.7 ResultList / ResultDetail
- 自分の精算済み投票結果一覧
- イベント名、選択肢、正解選択肢、報酬を表示

### 10.8 Avatar
- アバター情報取得
- 所持アイテム使用によるレベルアップ
- 所持数不足時は操作を制御

### 10.9 MyPage
- ユーザーのポイント、投票数、的中率、連勝情報を表示

### 10.10 Admin
- イベント作成
- ユーザー一覧確認
- 未精算イベント選択
- 正解選択肢登録
- 自動精算結果サマリー確認
- 管理メトリクス表示
- Web レイアウト時の簡易管理コンソール表示

---

## 11. モバイル接続仕様

### 11.1 APIクライアント
- `mobile/src/lib/api.ts` を利用
- デフォルト接続先は `http://localhost:3000`
- `EXPO_PUBLIC_API_BASE_URL` で上書き可能

### 11.2 APIパスの扱い
- `/api` の重複や欠落を避けるため正規化処理を実装

### 11.3 実機確認
- LAN内端末からの確認時は `EXPO_PUBLIC_API_BASE_URL=http://<PCのIP>:3000` を指定

---

## 12. ログ・運用

### 12.1 ログ
- request / warn / error をログ出力
- `LOG_DIR` 指定時はファイル出力あり
- 既定保存先: `backend/logs/`

### 12.2 Seedデータ
初期検証用に以下のサンプルデータを投入可能です。
- デモユーザー
- global event
- local event
- 初期アバター/効果
- アイテムマスタ

---

## 13. 非機能要件（MVP前提）

### 13.1 整合性
- 投票・精算・ポイント付与はDBトランザクションで処理
- 冪等性を考慮し、重複精算を防止

### 13.2 保守性
- backendは機能単位で `modules/*` に分離
- Zodで入力バリデーション
- PrismaでDBアクセスを一元化

### 13.3 拡張性
将来の拡張候補:
- policy/permission ベースの詳細権限制御
- ランキング/オッズ導入
- Push通知・メール通知などの外部通知
- 本番向け監視・トレーシング連携
- バックグラウンドジョブ基盤

---

## 14. MVPスコープ外
- 課金機能
- コメント機能
- フレンド機能
- policy/permission ベースの厳密な権限制御
- リアルタイム通知
- 高度なランキング/レコメンド

---

## 15. 現時点の制約・既知課題
- Bearer JWT と web の cookie refresh 運用は実装済みだが、production 向け鍵ローテーションや外部監視通知は未完了
- 自動テストは CI 上の backend smoke test / mobile typecheck 中心で、E2E は未整備
- mobileの表示はMVP水準であり、UI/UXの改善余地あり
- 通知は Home 画面の結果通知までで、Push通知やバックグラウンドジョブ基盤は未実装
- 監視は簡易メトリクスまでで、外部監視SaaS連携やアラート運用は未実装
- 単一サーバー前提のため、大規模運用向けの分散設計は未対応

---

## 16. 今後の改善候補
1. API統合テスト・E2Eテスト追加
2. JWT production hardening（鍵ローテーション / 失効運用 / 通知連携）
3. Push通知や非同期ジョブによるイベント結果通知の導入
4. Home/Result UX改善
5. 外部監視・アラート基盤追加
6. Web管理画面の操作性改善
