# prediction-voting-game-mvp

MVP構成:
- `backend/`: Node.js + TypeScript + Express + Prisma
- `mobile/`: React Native(Expo) 画面雛形
- `docs/mvp-design.md`: 設計書
- `docker-compose.yml`: ローカル PostgreSQL

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

## Seeded sample data
- Demo user id (API用ヘッダー `x-user-id`): `usr_demo_1`
- Sample global event id: `evt_global_1`
- Sample local event id: `evt_local_1`

## npm install が失敗する場合（registry設定）
この環境では `npm install` が `403 Forbidden` になることがあります。主な原因は以下です。
- `npm config` に社内/プロキシ向け registry が設定されている
- 認証付き registry に対する token 未設定
- ネットワークポリシーで `https://registry.npmjs.org` へのアクセスが制限されている

代表的な回避策:
```bash
npm config get registry
npm config set registry https://registry.npmjs.org/
npm config delete proxy
npm config delete https-proxy
npm cache clean --force
npm install
```
必要なら `.npmrc` の registry / authToken も確認してください。
