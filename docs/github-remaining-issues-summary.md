# GitHub残件 Issue サマリー

## 1. 目的
本書は、現行実装と既存設計書に分散している残件を、GitHub Issue として起票しやすい形で整理した一覧です。

前提:
- Web の主要MVP導線は復旧済み
- staging/JWT の基本導線（web の httpOnly refresh cookie を含む）は実装済み
- 以後は「復旧フェーズ」ではなく「Web/運用最適化フェーズ」の残件整理が主眼

---

## 2. Issue 化の優先度

### P0（次フェーズ開始時に着手）
1. Expo Router 前提の URL ルーティング本格化
2. `App.tsx` からの状態責務分離
3. Admin Web 一覧最適化

### P1（staging / production 品質向上）
4. Prisma migration 正式運用化
5. 監視・エラー追跡・アラート導入
6. JWT production hardening
7. 自動テスト拡張（API統合 / E2E）

### P2（MVP拡張）
8. 通知・非同期ジョブ基盤
9. 運用 Runbook / Admin 運用手順整備

---

## 3. GitHub Issue 候補一覧

### Issue 1. Expo Router を前提にした URL ルーティング本格化
- **背景**: 現状は `mobile/App.tsx` を再利用した暫定接続であり、URL 同期は入っているが route component 分割は未完了。
- **対応内容**:
  - route ごとの component / loader / guard を整理
  - `App.tsx` 依存を減らし、Expo Router 構成を正規化
  - detail 画面や auth guard を route 単位で扱えるようにする
- **完了条件**:
  - URL 直打ちで主要画面に自然遷移できる
  - ブラウザ戻る/進むで状態破綻しない
  - `App.tsx` が route orchestration の単一責務から解放される

### Issue 2. `App.tsx` 集中状態の分離
- **背景**: 認証・選択中データ・画面遷移 state が `App.tsx` と `AppState` に寄っており、Web と native の責務分離を進めにくい。
- **対応内容**:
  - Auth / Config / Navigation / SelectedEntity の store 分割
  - route state と auth state の責務を明文化
  - 必要に応じて Zustand 等の導入可否を検討
- **完了条件**:
  - `App.tsx` の状態責務が大幅に減る
  - hooks 経由で各責務へアクセスできる
  - URL routing 導入後も state 管理が複雑化しない

### Issue 3. Admin Web 一覧最適化
- **背景**: 現在の Admin は mobile 寄りUIで、Web での一覧性・操作性が不十分。
- **対応内容**:
  - table / filter / sort / paging の導入
  - 未精算イベント、登録者一覧、結果登録導線の Web 最適化
  - 横幅が広い画面向けの情報密度改善
- **完了条件**:
  - 管理作業が Web 前提でも実用水準になる
  - 一覧系の探索性と作業効率が改善する

### Issue 4. Prisma migration 正式運用化
- **背景**: Render 初回デプロイ時は `db push` に依存する回避策を使っており、正式な migration 運用に移行したい。
- **対応内容**:
  - migration 作成/適用フローの標準化
  - staging / production 反映手順の Runbook 化
  - seed の役割整理（開発用 / 検証用）
- **完了条件**:
  - `db push` 前提の暫定運用を解消
  - migration ベースで再現可能な DB 更新ができる

### Issue 5. 監視・エラー追跡・アラート導入
- **背景**: 現状の監視は簡易メトリクスまでで、外部監視SaaSやアラート運用は未整備。
- **対応内容**:
  - backend / mobile / web への Sentry 等導入
  - Uptime / latency / DB 接続失敗の監視設計
  - staging 以上で通知経路を確認
- **完了条件**:
  - 重大障害を検知できる
  - エラー追跡と運用通知が最低限成立する

### Issue 6. JWT production hardening
- **背景**: web の cookie refresh 導線は実装済みだが、本番向け鍵ローテーションや強化運用は未完了。
- **対応内容**:
  - JWT 鍵ローテーション方針
  - refresh session 失効運用の強化
  - native 向け secure storage / persistent session 強化
- **完了条件**:
  - production 想定で token 運用ポリシーが文書化・実装される
  - native / web ともに安全な session 管理方針が揃う

### Issue 7. 自動テスト拡張（API統合 / E2E）
- **背景**: 現状の自動テストは backend smoke test と mobile typecheck が中心で、E2E は未整備。
- **対応内容**:
  - 認証/投票/精算の API 統合テスト追加
  - 主要 Web 導線の E2E 導入
  - CI での回帰検知範囲拡大
- **完了条件**:
  - 主要MVP導線が回帰テストで担保される
  - cookie refresh や route 遷移の破壊を早期検知できる

### Issue 8. 通知・非同期ジョブ基盤
- **背景**: 通知は Home の結果表示までで、Push 通知やバックグラウンドジョブ基盤は未実装。
- **対応内容**:
  - 結果通知・精算・リマインドのジョブ化検討
  - Push 通知の導入判断
  - 非同期ワーカー構成の設計
- **完了条件**:
  - 結果通知や運用通知を非同期で扱える
  - 将来の拡張要件に備えたジョブ基盤方針が定まる

### Issue 9. 運用 Runbook / Admin 運用手順整備
- **背景**: イベント運用、誤登録対応、問い合わせ対応などの運用ルールが文書化途上。
- **対応内容**:
  - イベント作成 / 結果登録 / 誤登録時の手順整備
  - staging / production デプロイ手順の整理
  - 障害時の一次切り分け手順の作成
- **完了条件**:
  - 属人性を減らした運用が可能になる
  - GitHub Issue から Runbook へリンクできる

---

## 4. 設計書との対応
- `docs/mvp-design.md`
  - 現行アーキテクチャ、MVP制約、今後の改善候補
- `docs/secondary-priority-plan.md`
  - Web URL routing / 状態管理 / Admin 最適化 / 監視の次フェーズ設計
- `docs/staging-env-auth-plan.md`
  - staging / production 運用、JWT hardening、監視・通知
- `docs/auth-jwt-spec.md`
  - JWT / refresh token / cookie refresh の認証仕様

---

## 5. 起票順の推奨
1. Router 本格化
2. App state 分離
3. Admin Web 最適化
4. Migration 正式運用化
5. 監視・エラー追跡
6. JWT hardening
7. API統合 / E2E
8. 通知・非同期ジョブ
9. Runbook / 運用手順
