# prediction-voting-game-mvp

MVP構成:
- `backend/`: Node.js + TypeScript + Express + Prisma
- `mobile/`: React Native (Expo) 画面雛形
- `docs/mvp-design.md`: 設計仕様書
- `docs/mobile-rollout-plan.md`: スマホ展開構想
- `docs/web-mobile-foundation-plan.md`: Web / スマホ両対応の土台構想
- `docs/staging-env-auth-plan.md`: staging + env分離 + 認証設計 実施計画
- `docs/secondary-priority-plan.md`: 次点項目 構想・設計仕様書
- `docs/auth-jwt-spec.md`: JWT認証 移行設計仕様書
- `docker-compose.yml`: ローカル PostgreSQL

## API base / 認証
- すべての業務APIは `/api` 配下です。
- 保護されたルートは `AUTH_MODE` に応じて `x-user-id` または `Authorization: Bearer <token>` を受け付けます。
- ただし Admin API は権限分離のため、`jwt_transition` / `jwt_required` では `Authorization: Bearer <token>` 必須です。
- 公開情報:
  - `GET /` : APIメタ情報
  - `GET /health` : ヘルスチェック
  - `GET /api` : ルート一覧サマリー


## Mobile API connection status
- `mobile/` は UI雛形のみではなく、MVPの主要APIに接続済みです。
- 管理者向けの簡易 Admin 画面を追加し、結果未確定イベントの選択・正解入力・結果確定サマリー確認が可能です。
- Web では `/admin` ルートを Webベース管理画面として利用でき、ダッシュボード風の概要カードとクイックガイドを表示します。
- 実装済み: onboarding, home, events, vote作成, vote history, results, avatar取得/level-up, my page。
- Home には直近で確定した自分の投票結果通知（的中 / 不的中）を表示します。
- APIベースURLは `mobile/src/lib/api.ts` の `API_BASE_URL` を利用します。
  - Web開発の既定値: `http://localhost:3000`
  - 実機/別端末テスト: `EXPO_PUBLIC_API_BASE_URL` を `http://<PCのLAN-IP>:3000` に設定
  - 例: `EXPO_PUBLIC_API_BASE_URL=http://192.168.1.10:3000 npm run start`

## Environment separation / auth groundwork
- backend は `APP_ENV`, `PUBLIC_APP_URL`, `CORS_ORIGINS`, `AUTH_MODE`, `JWT_*` を使って local / staging / production を分離できる前提にしました。
- `backend/.env.staging.example` と `mobile/.env.staging.example` を追加し、staging 用の設定雛形を用意しました。
- mobile は `EXPO_PUBLIC_APP_ENV`, `EXPO_PUBLIC_API_BASE_URL`, `EXPO_PUBLIC_AUTH_MODE` を使って接続先と認証モードを切り替えられます。
- `AUTH_MODE` は `mvp_header`, `jwt_transition`, `jwt_required` の3段階を想定しています。
- `jwt_transition` / `jwt_required` では refresh token のハッシュを `AuthSession` に保存し、`/api/auth/refresh` と `/api/auth/logout` で失効管理します。
- 詳細は `docs/staging-env-auth-plan.md` と `docs/auth-jwt-spec.md` を参照してください。

## Local development setup

### 1) PostgreSQL を起動
```bash
docker compose up -d
```

### 2) バックエンド初期セットアップ
```bash
cd backend
cp .env.example .env
npm install
npm run prisma:generate
npm run prisma:migrate
npm run prisma:seed
npm run dev
```

> `backend/.env.example` は `docker-compose.yml` のDB初期値（`postgres/postgres`, `prediction_game`）に合わせています。
> backend の既定ポートは `3000` です。`PORT` を変えていないのに `:3000` で起動していれば正常です。
> 追加で `LOG_DIR` を指定すると、backend はコンソール出力に加えてログファイルも保存します（既定: `backend/logs/`）。

### 2.1) `authSession.create` エラーが出る場合
`TypeError: Cannot read properties of undefined (reading 'create')` が出る場合は、Prisma Client が最新 schema とずれている可能性が高いです。

```bash
cd backend
npm install
npm run prisma:generate
npm run prisma:migrate
npm run prisma:seed
npm run dev
```

このリポジトリは `AuthSession` を使うため、`npm install` だけでは足りず `prisma generate` と `prisma migrate` も必要です。

## Backend logs
- request / warn / error は `backend/logs/app.log` に保存されます。
- error レベルは `backend/logs/error.log` にも保存されます。
- 保存先は `.env` の `LOG_DIR` で変更できます。

## Minimum API smoke test
- `backend/scripts/api-smoke-test.sh` を追加しました。
- 前提: backend / DB が起動済みで、seed データ投入済みであること。
- 例: `BASE_URL=http://localhost:3000 bash backend/scripts/api-smoke-test.sh`
- script は JWT が返るログイン応答に追随しており、`Authorization` と `x-user-id` の両方を使って transition モードの疎通確認ができます。

## Minimum CI
- GitHub Actions (`.github/workflows/ci.yml`) で backend の `npm run ci` と mobile の `npm run ci` を実行します。
- backend CI ではさらに PostgreSQL service を起動し、`prisma db push` / `prisma seed` 後に backend を立ち上げて `npm run smoke:test` を実行します。

## Seeded sample data
- Demo user id (`x-user-id`): `usr_demo_1`
- Sample global event id: `evt_global_1`
- Sample local event id: `evt_local_1`

- Avatar育成アイテムは初期所持0です。`/api/admin/events/settle` で的中報酬として付与後に `POST /api/avatar/level-up` を実行してください。

---

## API examples (curl)

### 1) Onboarding (public)
```bash
curl -X POST http://localhost:3000/api/users/onboarding \
  -H "Content-Type: application/json" \
  -d '{
    "nickname": "Tetsu",
    "regionCode": "kanagawa",
    "avatarType": "cat"
  }'
```

### 2) Events list (protected)
```bash
curl "http://localhost:3000/api/events?status=open" \
  -H "x-user-id: usr_demo_1"
```

### 3) Create vote (protected)
```bash
curl -X POST http://localhost:3000/api/votes \
  -H "Content-Type: application/json" \
  -H "x-user-id: usr_demo_1" \
  -d '{
    "eventId": "evt_global_1",
    "optionId": "opt_global_1",
    "betPoints": 100
  }'
```

### 4) Vote history (protected)
```bash
curl http://localhost:3000/api/votes/history \
  -H "x-user-id: usr_demo_1"
```

### Mobile Admin UI (MVP)
- `Admin` タブから未確定イベントを選択し、正解選択肢を指定して結果確定できます。
- Admin API は `role=admin` のみ利用可能です。seed 済みの `usr_demo_1` は DB 上でも `role=admin` で作成されます。
- Admin API は権限分離のため、`AUTH_MODE=jwt_transition` / `jwt_required` では `x-user-id` だけでは使えず Bearer token が必要です。
- 結果確定後は `processedVoteCount`, `winnerCount`, `totalRewardPoints`, `rewardedItemUserCount` を確認できます。
- admin 以外で `Admin` タブを開いた場合は、テスト手順を表示する案内画面が出ます。
- mobile で Admin を試す最短手順は、backend で `npm run prisma:seed` 後に `DemoUser` でログインし、上部バーの `role: admin` / `x-user-id: usr_demo_1` を確認することです。

### 5) Settle result (protected/admin endpoint in MVP)
```bash
curl -X POST http://localhost:3000/api/admin/events/settle \
  -H "Content-Type: application/json" \
  -H "x-user-id: usr_demo_1" \
  -d '{
    "eventId": "evt_global_1",
    "winningOptionId": "opt_global_1"
  }'
```

### 6) Results list (protected)
```bash
curl http://localhost:3000/api/results \
  -H "x-user-id: usr_demo_1"
```

### 7) Avatar info / level up (protected)
```bash
curl http://localhost:3000/api/avatar \
  -H "x-user-id: usr_demo_1"

curl -X POST http://localhost:3000/api/avatar/level-up \
  -H "Content-Type: application/json" \
  -H "x-user-id: usr_demo_1" \
  -d '{"itemId":"itm_exp_small","quantity":1}'
```

## API examples (PowerShell)

```powershell
# Onboarding
Invoke-RestMethod -Method Post -Uri "http://localhost:3000/api/users/onboarding" `
  -ContentType "application/json" `
  -Body '{"nickname":"Tetsu","regionCode":"kanagawa","avatarType":"cat"}'

# Protected route example: events list
Invoke-RestMethod -Method Get -Uri "http://localhost:3000/api/events?status=open" `
  -Headers @{ "x-user-id" = "usr_demo_1" }

# Vote create
Invoke-RestMethod -Method Post -Uri "http://localhost:3000/api/votes" `
  -ContentType "application/json" `
  -Headers @{ "x-user-id" = "usr_demo_1" } `
  -Body '{"eventId":"evt_global_1","optionId":"opt_global_1","betPoints":100}'

# Results
Invoke-RestMethod -Method Get -Uri "http://localhost:3000/api/results" `
  -Headers @{ "x-user-id" = "usr_demo_1" }

# Avatar
Invoke-RestMethod -Method Get -Uri "http://localhost:3000/api/avatar" `
  -Headers @{ "x-user-id" = "usr_demo_1" }
```

## npm install が失敗する場合（registry設定）
`npm install` が `403 Forbidden` の場合、以下が原因になりやすいです。
- registry / proxy が社内設定になっている
- auth token 未設定
- ネットワークポリシーで npmjs が制限されている

確認・回避例:
```bash
npm config get registry
npm config set registry https://registry.npmjs.org/
npm config delete proxy
npm config delete https-proxy
npm cache clean --force
npm install
```

MVPスコープ（変更なし）:
- 課金なし
- コメントなし
- フレンドなし
