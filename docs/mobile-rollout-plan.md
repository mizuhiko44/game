# 予測投票ゲーム スマホ展開構想

## 1. 目的
本書は、現在のMVPを「ローカル確認用アプリ」から「実際にスマートフォンへ配布して検証・運用できる構成」へ発展させるための構想を整理したものです。

対象は以下です。
- iPhone / Android 実機での動作確認
- テスター配布
- 小規模本番運用を見据えた構成
- 認証・監視・配布・運用ルールの整理

---

## 2. 現状
現在の構成はMVP検証向けです。

- mobile は Expo ベース
- backend は Node.js + Express + Prisma
- DB は PostgreSQL
- 認証は `x-user-id` による簡易方式
- API接続先はローカルPC上のサーバーを前提
- 運用は開発者ローカル環境中心

このままでは以下の理由でスマホ展開には不十分です。
- 実機がローカルPCに依存する
- 認証が本番向けでない
- HTTPS / ドメイン / 配布導線が未整備
- 障害監視やアプリ更新導線が未整備

---

## 3. スマホ展開のゴール

### 3.1 短期ゴール
- 社内/関係者に iPhone / Android で配布できる
- 実機から安定して backend API にアクセスできる
- ユーザー登録、イベント閲覧、投票、結果確認、Admin操作が最低限動く

### 3.2 中期ゴール
- TestFlight / Google Play 内部テストで配布できる
- 本番相当の認証とログ監視を導入する
- 小規模ユーザーで継続的に検証できる

### 3.3 長期ゴール
- 一般公開可能な構成にする
- スケーラブルなAPI / DB / 配信基盤へ発展させる
- Push通知や分析基盤を導入する

---

## 4. 推奨アーキテクチャ

### 4.1 全体像
スマホ展開では以下の構成を推奨します。

- **mobile**: Expo / React Native
- **backend API**: HTTPS公開された Node.js API
- **DB**: マネージド PostgreSQL
- **認証**: JWT またはセッションベース認証
- **配布**: TestFlight / Google Play Internal Testing / Expo EAS
- **監視**: アプリクラッシュ監視 + APIログ監視

### 4.2 構成イメージ

```txt
[ iPhone / Android App ]
          |
          | HTTPS
          v
[ Public API Domain ]
          |
          v
[ Node.js / Express Backend ]
          |
          v
[ Managed PostgreSQL ]
```

### 4.3 環境分離
最低でも以下の3環境を分けます。
- **local**: 開発者PC
- **staging**: テスター用
- **production**: 本番公開用

それぞれで以下を分離します。
- API URL
- DB
- 認証シークレット
- ログ/監視設定
- アプリの bundle identifier / package name

---

## 5. mobile 配布方針

### 5.1 Expo活用方針
MVPからの発展では Expo を継続利用するのが最も効率的です。

理由:
- 既存実装を活かしやすい
- iOS / Android のビルド運用が比較的簡単
- EAS Build / EAS Update を使いやすい
- 少人数検証に向いている

### 5.2 配布ステップ

#### Step 1: 実機LAN確認
- `EXPO_PUBLIC_API_BASE_URL` を LAN 上の backend に向ける
- 開発者・関係者の実機で基本導線を検証

#### Step 2: テスター向けビルド
- Expo EAS Build を利用して iOS / Android ビルド作成
- iOS は TestFlight
- Android は Internal Testing または APK / AAB 配布

#### Step 3: 継続配布
- 軽微なUI修正は EAS Update を活用
- ネイティブ設定変更時のみ再ビルド

### 5.3 アプリ識別子
本番を見据えて以下を整理します。
- iOS Bundle Identifier
- Android Package Name
- App 名称
- アイコン / スプラッシュ
- バージョン番号ルール

---

## 6. backend 公開方針

### 6.1 公開条件
スマホ展開では backend を外部公開する必要があります。
必要条件:
- HTTPS対応
- 固定ドメイン
- 常時稼働
- 環境変数管理
- DB接続の安定化

### 6.2 候補構成
初期段階では以下のようなPaaS構成が現実的です。
- Render
- Railway
- Fly.io
- Vercel + 別途DB（構成注意）
- AWS / GCP / Azure（中長期）

### 6.3 推奨段階
- **Phase 1**: Render / Railway + Managed PostgreSQL
- **Phase 2**: 負荷や監視要件に応じて AWS / GCP へ移行検討

### 6.4 APIドメイン例
- staging: `https://stg-api.example.com`
- production: `https://api.example.com`

---

## 7. 認証の見直し方針

### 7.1 現状の課題
`x-user-id` はMVP検証専用であり、スマホ配布には不適です。

問題点:
- なりすましが容易
- セッション管理がない
- ログアウト/再ログイン設計が弱い
- 将来の権限制御に拡張しにくい

### 7.2 推奨方針
以下のいずれかへ移行します。
- **メール + OTP / Magic Link**
- **SMS認証**
- **OAuth (Google / Apple)**
- **メールアドレス + パスワード + JWT**

### 7.3 MVPからの移行現実案
最初のスマホ展開では以下が現実的です。
1. ユーザー登録にメールアドレスを追加
2. backend でログインAPIを発行
3. access token / refresh token を導入
4. mobile は secure storage に保存
5. Admin 権限は role カラムで分離

---

## 8. データ・運用の見直し

### 8.1 DB運用
- 開発用ローカルPostgreSQLからマネージドDBへ移行
- 毎日のバックアップを有効化
- migration適用フローを定義
- seed は staging 用と production 用で分離

### 8.2 イベント運用
スマホ展開では Admin 運用ルールも必要です。
- イベント作成の責任者
- 正解登録の責任者
- イベント公開前チェック
- 誤登録時の手順
- 問い合わせ対応窓口

### 8.3 ログ運用
必要なログ:
- 認証失敗
- 投票失敗
- 精算失敗
- 管理操作ログ
- 予期しない500系エラー

---

## 9. 監視・品質保証

### 9.1 mobile 側
導入候補:
- Sentry（クラッシュ/例外）
- Expo Updates の配信管理
- Analytics（画面遷移、離脱、投票率）

### 9.2 backend 側
導入候補:
- Sentry / Datadog / New Relic
- Uptime監視
- レスポンスタイム監視
- DB接続失敗監視

### 9.3 最低限の自動テスト
スマホ展開前に以下は最低限整備したいです。
- onboarding API テスト
- vote API テスト
- auto settle テスト
- admin result registration テスト
- avatar level-up テスト

---

## 10. スマホ展開ロードマップ

### Phase 0: 現状整理
- 既存API/画面の安定化
- エラー文言整理
- 設計仕様書の更新

### Phase 1: 実機検証可能化
- staging backend 公開
- staging DB 構築
- `EXPO_PUBLIC_API_BASE_URL` を staging に接続
- iPhone / Android 実機で基本動作確認

### Phase 2: テスター配布
- EAS Build 導入
- TestFlight / Android Internal Testing で配布
- ログ監視導入
- 認証の最低限改善

### Phase 3: 小規模運用
- 管理者権限分離
- 利用規約 / プライバシーポリシー整備
- 問い合わせ導線の整備
- バックアップ/障害対応手順整備

### Phase 4: 一般公開準備
- ストア審査対応
- Push通知導入
- 分析基盤導入
- 負荷対策・セキュリティ強化

---

## 11. 優先実施項目
まず着手すべき優先度の高い項目は以下です。

### 最優先
1. backend を staging 環境へ公開
2. mobile の API URL を環境別に切り替え
3. `x-user-id` 認証の置換方針を決定
4. TestFlight / Android Internal Testing の配布導線作成

### 次点
5. Sentry 導入
6. 最低限APIテスト追加
7. Admin 権限分離
8. 利用ログの整備

---

## 12. リスクと対策

### リスク1: 認証が脆弱
- **対策**: JWTベースへ移行し、secure storage を利用

### リスク2: ローカル依存で実機が使えない
- **対策**: staging backend を早期公開

### リスク3: イベント運用ミス
- **対策**: Admin権限分離、監査ログ、運用フロー整備

### リスク4: 障害発生時に原因が追えない
- **対策**: crash monitoring / API monitoring / request logging 導入

### リスク5: 配布更新が煩雑
- **対策**: Expo EAS Build / Update を標準化

---

## 13. 推奨する次の具体アクション
次に実施する具体タスク案は以下です。

1. `app.config` / `.env` 設計を整理して staging / production を切替可能にする
2. staging 用 backend と DB を立ち上げる
3. mobile を EAS Build 可能な形へ整える
4. 認証を `x-user-id` から JWT方式へ段階移行する設計を作る
5. iPhone / Android 向けの初回配布手順書を作る

