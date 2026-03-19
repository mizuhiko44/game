# staging + env分離 + 認証設計 実施計画

## 1. 目的
本書は、次フェーズとして進める **staging環境整備・環境分離・認証刷新設計** を一体で扱うための設計書です。

狙いは以下です。
- local / staging / production の責務を明確化する
- Web / スマホ両方で同じ backend を安全に利用できるようにする
- `x-user-id` 依存から段階的に脱却する
- 今後の JWT 実装、配布、監視導入の前提をコード上に作る

---

## 1.5 完了判定
現時点では **完了ではなく、土台追加まで完了** です。

完了とみなす条件は以下です。
- staging backend が実際に公開されている
- mobile / web が staging に接続して確認できる
- 認証方式（JWT移行方針・role設計・token保存方式）が文書だけでなく API仕様として確定している
- onboarding / vote / auto settle / admin result registration / avatar level-up の最低限APIテストが通る

したがって、今回の状態は「最優先事項の着手完了・基盤準備完了」であり、「最優先事項の完了」ではありません。

---

## 2. 今回追加する土台

### 2.1 backend の環境分離
backend では以下を環境変数で管理する方針に統一します。
- `APP_ENV`: `local | staging | production`
- `PUBLIC_APP_URL`: 公開アプリURL
- `CORS_ORIGINS`: 許可Origin一覧
- `AUTH_MODE`: `mvp_header | jwt_transition | jwt_required`
- `JWT_ISSUER`
- `JWT_AUDIENCE`
- `ACCESS_TOKEN_TTL_MINUTES`
- `REFRESH_TOKEN_TTL_DAYS`

### 2.2 mobile の環境分離
mobile では以下を公開環境変数で扱います。
- `EXPO_PUBLIC_APP_ENV`
- `EXPO_PUBLIC_API_BASE_URL`
- `EXPO_PUBLIC_AUTH_MODE`

### 2.3 認証移行モード
認証は一気に切り替えるのではなく、3段階で扱います。

1. `mvp_header`
   - 現在の `x-user-id` 前提
2. `jwt_transition`
   - JWT導入準備フェーズ
   - 旧方式との併用を想定
3. `jwt_required`
   - JWT前提の本番モード

---

## 3. 環境ごとの想定

### local
- 開発者PC用
- DB はローカル / docker-compose
- `AUTH_MODE=mvp_header`
- Web / Expo からの接続確認重視

### staging
- テスター検証用
- HTTPS公開 backend
- `AUTH_MODE=jwt_transition` を想定
- 実機確認・EAS配布確認を行う

### production
- 本番公開用
- マネージドDB / HTTPS / 監視必須
- `AUTH_MODE=jwt_required`

---

## 4. 実装ポリシー

### 4.1 今回のコード化範囲
今回は **JWT認証そのものの実装までは行わず**、以下の土台を入れます。
- env の型付き管理
- auth mode の宣言
- mobile 側 env 管理
- session storage key の環境分離
- backend の public config / route summary で運用モードを可視化

### 4.2 次フェーズで実装するもの
- user schema 拡張（email / role / auth provider 等）
- access token / refresh token API
- secure storage 対応
- auth middleware の JWT 化
- admin role チェック

### 4.3 今回の追加物
- `backend/.env.staging.example`
- `mobile/.env.staging.example`
- `docs/auth-jwt-spec.md`
- `backend/scripts/api-smoke-test.sh`
- monitoring 向けの backend / mobile フック

---

## 5. 優先タスク
1. backend staging デプロイ
2. mobile の env 切替整理
3. JWT設計書の詳細化
4. auth API の追加
5. Admin 権限分離
6. staging での実機確認
