# 次点項目 構想・設計仕様書

## 1. 目的
本書は、最優先事項（staging環境整備 / 認証方式設計確定 / 最低限APIテスト追加）の完了後、次に着手するべき項目を整理した設計仕様書です。

対象:
- Web URL ルーティング
- グローバル状態管理
- Admin の Web 最適化
- Sentry / 監視導入

---

## 2. 前提
これらの項目は、以下が一定レベルで成立した後に進める前提とします。
- staging 環境で backend が公開されている
- env 分離が運用可能な状態になっている
- 認証方式の移行方針が確定している
- 最低限APIテストが導入されている

現状はこの前提が概ね満たされ、Web では JWT + cookie refresh を含む運用導線まで確認済みです。

---

## 2.5 イテレーション2 完了サマリー
イテレーション2では、当初の「デプロイはできるが UI は未復旧」状態から、以下までを完了しました。
- Expo Router の Web 入口から `App.tsx` を再利用し、主要MVP画面を Web で表示可能にした
- Vercel / Render 間の接続を見直し、Web から backend API へ接続できる状態へ復旧した
- onboarding / login / admin / vote / results の主要導線を確認した
- CORS preview origin 対応、Render 初回デプロイ時の Prisma schema 反映、async route error の吸収を実施した

## 2.6 現在の残件まとめ
イテレーション2完了時点で、次フェーズへ持ち越す主な残件は以下です。
- Expo Router を前提にした URL ベースルーティングの本格化
- `App.tsx` に集中している認証・選択中データ・画面遷移 state の分離
- Admin の Web 一覧最適化（table / filter / sort / paging）
- Render で `db push` に依存している初回デプロイ手順を、正式 migration 管理へ移行
- Web / backend / mobile の監視、エラー追跡、運用メトリクス整備

## 2.7 クローズ判断
イテレーション2は、**「Web で主要MVP導線を表示・利用できる状態まで戻す」** という目的に対して完了と判断します。
今後は「復旧フェーズ」ではなく、「Web ネイティブ最適化フェーズ」へ移行します。

ただし、次フェーズへの移行後も以下は残件です。
- URL 同期は入っているが route component 分割は未完了
- `App.tsx` に認証・選択中データ・画面遷移 state が集中している
- Admin 一覧は mobile 寄りで Web 最適化が未完了


## 2.6 イテレーション2の開始条件と目的
イテレーション2では、**「デプロイできるがUIは未復旧」状態から、WebでMVP画面が正しく見える状態へ戻す** ことを最優先にします。

最上位ゴール:
- Vercel 配備を維持したまま、Home / Events / Vote / History / Results / Avatar / My Page / Admin の既存UI資産を再接続する
- 少なくともトップ導線と主要画面が「文字列だけ」ではなくコンポーネントとして正常描画される状態にする
- 旧 `App.tsx` 主導構成と Expo Router 主導構成の責務分担を明確化する

---
## 3. Web URL ルーティング

### 3.1 目的
現在のタブ状態ベース遷移を、Webでも自然に扱える URL ベース遷移へ拡張します。

### 3.2 解決したい課題
- ページ再読込で状態が失われる
- URL共有ができない
- ブラウザの戻る/進むに弱い
- Web版の管理画面導線を強化しにくい

### 3.3 設計方針
- `tab` 中心の状態遷移から、route 定義中心の遷移へ移行
- 画面IDと URL パスをマッピング
- detail系は ID を URL に保持
  - `/events/:eventId`
  - `/results/:resultId`
- スマホでは従来導線を維持しつつ、Web ではURL同期を優先

### 3.4 初期ルート案
- `/`
- `/onboarding`
- `/home`
- `/events`
- `/events/:eventId`
- `/vote`
- `/history`
- `/results`
- `/results/:resultId`
- `/avatar`
- `/me`
- `/admin`

### 3.5 完了条件
- URL 直打ちで対象画面に遷移できる
- ブラウザ戻る/進むが自然に動作する
- detail 画面が URL 共有可能になる

---

## 4. グローバル状態管理

### 4.1 目的
認証状態・ユーザー情報・環境設定・選択中データを各画面のローカル state から分離し、Web/スマホ共通で扱いやすい構成にします。

### 4.2 管理対象
- auth session
- current user
- current environment
- selected event / selected result
- app config（authMode, appEnv, api base など）

### 4.3 設計方針
- まずは React Context + custom hooks で十分
- 状態が増えたら Zustand 等の導入を検討
- backend から取得した `/api/config` もグローバル参照可能にする

### 4.4 推奨 Store 分割
- `AuthStore`
- `ConfigStore`
- `NavigationStore`
- 必要なら `AdminStore`

### 4.5 完了条件
- App.tsx の状態責務が大幅に減る
- auth / config / selected entity を hooks 経由で参照できる
- URL routing 導入時にも状態の責務分離が維持できる

---

## 5. Admin の Web 最適化

### 5.1 目的
現在のモバイル寄り Admin UI を、Web利用時に一覧性・操作性の高い管理画面へ発展させます。

### 5.2 改善対象
- イベント作成フォーム
- 未精算イベント一覧
- 登録者一覧
- 結果登録導線

### 5.3 Web 最適化案
- 左: イベント一覧 / 右: 詳細・結果登録 の2カラム
- 登録者一覧はカード表示からテーブル表示へ変更
- イベントフィルタ（status / category / eventType）追加
- 検索 / ソート / ページングの導入
- 結果登録時の確認モーダル追加

### 5.4 将来見据える項目
- 監査ログ表示
- 誰が正解登録したか表示
- 誤登録時の再設定フロー管理

### 5.5 完了条件
- Webブラウザ上で Admin 操作がモバイルより効率的に行える
- 一覧から対象イベントを素早く検索・選択できる
- 結果登録導線が確認付きで安全になる

---

## 6. Sentry / 監視導入

### 6.1 目的
障害や例外が発生した際に、Web / スマホ / backend のどこで問題が起きたか追える状態にします。

### 6.2 導入対象
- mobile: crash / runtime error
- web: client error / route error
- backend: exception / 5xx / latency

### 6.3 最低限の観測項目
- request id
- user id / auth mode / app env
- route / endpoint
- response status
- error stack
- app version / platform

### 6.4 設計方針
- client は Sentry を第一候補
- backend も Sentry か同等の error tracking を導入
- health / uptime は別ツールで監視
- staging / production で通知先を分離

### 6.5 完了条件
- 500系エラー発生時に通知される
- client crash が再現ログ付きで追える
- staging と production を誤検知なく区別できる

---

## 7. 推奨実施順序
1. Web URL ルーティングの本格化
2. グローバル状態管理の整理
3. Admin の Web 最適化
4. Prisma migration 正式化とデプロイ手順の安定化
5. Sentry / 監視導入

### 理由
- URL routing と state 管理は Web UX の基盤
- Admin 最適化はその上に乗せると作りやすい
- 監視は並行可能だが、構造が見えてから入れるとラベル設計しやすい

---

## 8. 次フェーズの実装単位案

### Phase A
- Web UI 復旧
- `App.tsx` と `app/` の接続方針確定
- Home / Events / Vote の最短復旧

### Phase B
- URL routing
- Config / Auth store
- selected event / result state 移管

### Phase C
- Admin web layout 最適化
- table / filter / sort 追加

### Phase C
- Prisma migration 正式化
- Render / staging / production のデプロイ手順固定化

### Phase D
- Sentry / monitoring
- request-id / release version / env tagging

---

## 9. 成果物イメージ
- Web/スマホ共通ルーティング設計書
- グローバル状態管理設計
- Admin Web UI ワイヤー案
- 監視/通知運用手順書
