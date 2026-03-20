# JWT認証 移行設計仕様書

## 1. 目的
本書は、MVPの `x-user-id` ヘッダー認証から JWT ベース認証へ移行するための認証仕様を定義します。

## 2. 認証モード
- `mvp_header`: 現行MVP
- `jwt_transition`: `x-user-id` と Bearer token を併用可能
- `jwt_required`: Bearer token 必須

## 3. トークン構成
### Access Token
- 形式: JWT
- 利用箇所: API認可
- 想定TTL: 60分

### Refresh Token
- 形式: JWT
- 利用箇所: access token 再発行
- 想定TTL: 30日
- 現行実装では `AuthSession` に refresh token の SHA-256 ハッシュを保存し、`/api/auth/refresh` と `/api/auth/logout` で失効管理を行う

## 4. JWT Claims
- `sub`: user id
- `nickname`: 表示名
- `role`: `user | admin`
- `iss`: issuer
- `aud`: audience
- `iat`
- `exp`

## 5. API方針
### 実装済みAPI
- `POST /api/auth/login`
- `POST /api/auth/refresh`
- `POST /api/auth/logout`
- `GET /api/auth/me`

### 現在の認証挙動
- `POST /api/users/login` と `POST /api/auth/login` は同じログイン処理を利用し、JWT を返却する
- `mvp_header` では一般保護APIは `x-user-id` 必須
- `jwt_transition` では一般保護APIは `x-user-id` と Bearer token を併用可能
- `jwt_transition` / `jwt_required` の Admin API は Bearer token + `role=admin` を必須とする

### Authorization Header
```txt
Authorization: Bearer <access_token>
```

## 6. user拡張案
- `email` or `providerUserId`
- `role`
- `lastLoginAt`

## 7. mobile/web保存方針
- web: localStorage ではなく secure cookie またはメモリ + refresh 制御を優先検討
- mobile: secure storage を採用予定

## 8. 権限制御
- Admin API は `role=admin` 必須
- `jwt_transition` / `jwt_required` では Admin API に `Authorization: Bearer <access_token>` を必須とし、`x-user-id` ヘッダーのみの利用は許可しない
- 将来は policy/permission 単位に拡張可能な設計とする

## 9. 移行手順
1. `jwt_transition` で両対応
2. mobile/web クライアント切替
3. Admin 認証切替
4. `jwt_required` へ移行

## 10. 現在の実装メモ
- access token は署名付きJWTとして生成し、API認可に使用する
- refresh token も署名付きJWTとして生成するが、DBには平文を保存せずハッシュのみ保持する
- refresh 実行時は既存 session を revoke したうえで新しい refresh token を再発行する
- logout は該当 refresh session を revoke することで再利用を防ぐ
