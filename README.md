# game
# prediction-voting-game-mvp

MVP構成:
- `backend/`: Node.js + TypeScript + Express + Prisma
- `mobile/`: React Native (Expo) 画面雛形
- `docs/mvp-design.md`: 設計書
- `docker-compose.yml`: ローカル PostgreSQL

## API base / 認証
- すべての業務APIは `/api` 配下です。
- 保護されたルートは `x-user-id` ヘッダーが必須です（MVP簡易認証）。
- 公開情報:
  - `GET /` : APIメタ情報
  - `GET /health` : ヘルスチェック
  - `GET /api` : ルート一覧サマリー


## Mobile API connection status
- `mobile/` は UI雛形のみではなく、MVPの主要APIに接続済みです。
- 実装済み: onboarding, home, events, vote作成, vote history, results, avatar取得/level-up, my page。
- APIベースURLは `mobile/src/lib/api.ts` の `API_BASE_URL` を利用します（必要に応じて環境に合わせて変更）。

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

## Seeded sample data
- Demo user id (`x-user-id`): `usr_demo_1`
- Sample global event id: `evt_global_1`
- Sample local event id: `evt_local_1`

---

## API examples (curl)

### 1) Onboarding (public)
```bash
curl -X POST http://localhost:4000/api/users/onboarding \
  -H "Content-Type: application/json" \
  -d '{
    "nickname": "Tetsu",
    "regionCode": "kanagawa",
    "avatarType": "cat"
  }'
```

### 2) Events list (protected)
```bash
curl "http://localhost:4000/api/events?status=open" \
  -H "x-user-id: usr_demo_1"
```

### 3) Create vote (protected)
```bash
curl -X POST http://localhost:4000/api/votes \
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
curl http://localhost:4000/api/votes/history \
  -H "x-user-id: usr_demo_1"
```

### 5) Settle result (protected/admin endpoint in MVP)
```bash
curl -X POST http://localhost:4000/api/admin/events/settle \
  -H "Content-Type: application/json" \
  -H "x-user-id: usr_demo_1" \
  -d '{
    "eventId": "evt_global_1",
    "winningOptionId": "opt_global_1"
  }'
```

### 6) Results list (protected)
```bash
curl http://localhost:4000/api/results \
  -H "x-user-id: usr_demo_1"
```

### 7) Avatar info / level up (protected)
```bash
curl http://localhost:4000/api/avatar \
  -H "x-user-id: usr_demo_1"

curl -X POST http://localhost:4000/api/avatar/level-up \
  -H "Content-Type: application/json" \
  -H "x-user-id: usr_demo_1" \
  -d '{"itemId":"itm_exp_small","quantity":1}'
```

## API examples (PowerShell)

```powershell
# Onboarding
Invoke-RestMethod -Method Post -Uri "http://localhost:4000/api/users/onboarding" `
  -ContentType "application/json" `
  -Body '{"nickname":"Tetsu","regionCode":"kanagawa","avatarType":"cat"}'

# Protected route example: events list
Invoke-RestMethod -Method Get -Uri "http://localhost:4000/api/events?status=open" `
  -Headers @{ "x-user-id" = "usr_demo_1" }

# Vote create
Invoke-RestMethod -Method Post -Uri "http://localhost:4000/api/votes" `
  -ContentType "application/json" `
  -Headers @{ "x-user-id" = "usr_demo_1" } `
  -Body '{"eventId":"evt_global_1","optionId":"opt_global_1","betPoints":100}'

# Results
Invoke-RestMethod -Method Get -Uri "http://localhost:4000/api/results" `
  -Headers @{ "x-user-id" = "usr_demo_1" }

# Avatar
Invoke-RestMethod -Method Get -Uri "http://localhost:4000/api/avatar" `
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