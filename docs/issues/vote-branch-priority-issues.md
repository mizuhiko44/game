# Voteブランチ 次ステップIssue案（優先度・重要度付き）

## 目的
`docs/mvp-design.md` と `docs/github-remaining-issues-summary.md` を基に、Vote導線に直接影響する次ステップを優先順でGitHub Issue化できる形に整理する。

## 優先度基準
- **P0 / Critical**: Vote導線の破綻・回帰を防ぐために最優先で着手すべき。
- **P1 / High**: 本番運用品質を高めるために高優先で着手すべき。
- **P2 / Medium**: 拡張性・運用性を高める改善。

---

## P0 / Critical

### 1) [Vote] Expo Router前提でVote系URLを正規化する
- **優先度**: P0
- **重要度**: Critical
- **背景**:
  - 現状は `App.tsx` 再利用を中心とした暫定接続。
  - Vote画面はURL同期ありだが route component 分割が未完。
- **スコープ**:
  - `/vote`, `/vote/complete`, `/events/:eventId` からの遷移責務を route 単位に移行。
  - 認証ガードと deep link 時の state 復元を明確化。
- **受け入れ条件**:
  - URL直打ちで `Vote` / `VoteComplete` が自然遷移する。
  - 戻る/進むでVoteフローが破綻しない。

### 2) [Vote] App.tsx 依存を解消する状態責務分離（Auth/Navigation/SelectedEvent）
- **優先度**: P0
- **重要度**: Critical
- **背景**:
  - Vote対象イベント選択状態が `App.tsx` / `AppState` に集中。
- **スコープ**:
  - Auth/Config/Navigation/SelectedEntity store を分離。
  - Vote開始元（EventDetail/EventList）ごとの遷移仕様を統一。
- **受け入れ条件**:
  - Voteフローに必要な状態が hooks で取得できる。
  - `App.tsx` のVote関連状態責務が大幅に減る。

### 3) [Vote] Web版Adminで未精算イベント処理を効率化（一覧/絞込/並び替え）
- **優先度**: P0
- **重要度**: Critical
- **背景**:
  - 投票結果確定オペレーションが mobile寄りUIで非効率。
- **スコープ**:
  - 未精算イベント中心のテーブル表示。
  - status/category/eventType フィルタ、ソート、ページング。
- **受け入れ条件**:
  - Adminから対象イベント探索・結果登録が短時間で完了できる。

---

## P1 / High

### 4) [Vote] 投票〜精算のAPI統合テストを拡張
- **優先度**: P1
- **重要度**: High
- **背景**:
  - 主要導線の回帰を自動検知するテストが不足。
- **スコープ**:
  - 認証、投票、締切後不可、精算、履歴整合性の統合テスト。
- **受け入れ条件**:
  - Vote主要シナリオがCIで回帰検知可能。

### 5) [Vote] 監視・エラー追跡（web/mobile/backend）導入
- **優先度**: P1
- **重要度**: High
- **背景**:
  - Vote失敗時に原因追跡できる運用基盤が不足。
- **スコープ**:
  - request id / user id / route / endpoint / status を観測。
  - 500系、投票エラー急増時の通知。
- **受け入れ条件**:
  - 障害時に原因箇所を15分以内に特定できる運用情報が得られる。

### 6) [Vote] JWT運用hardening（Web cookie refresh + native session）
- **優先度**: P1
- **重要度**: High
- **背景**:
  - JWT導線はあるが本番向け運用（鍵ローテーション等）が未整備。
- **スコープ**:
  - 鍵ローテーション手順、refresh失効運用、端末側session保護の強化。
- **受け入れ条件**:
  - Vote導線での認証切れ・再認証挙動が設計/実装で安定化。

---

## P2 / Medium

### 7) [Vote] 通知・非同期ジョブ基盤（結果通知/リマインド）
- **優先度**: P2
- **重要度**: Medium
- **背景**:
  - 現状はHome表示中心でPush/非同期基盤が未整備。
- **スコープ**:
  - 結果通知・締切リマインドのジョブ化検討。
- **受け入れ条件**:
  - 非同期通知の技術方針と最小実装案が確定。

### 8) [Vote] 運用Runbook整備（イベント運用/誤登録時対応）
- **優先度**: P2
- **重要度**: Medium
- **背景**:
  - 運用手順が属人化しやすい。
- **スコープ**:
  - イベント作成〜結果登録〜障害切り分けの標準手順を文書化。
- **受け入れ条件**:
  - 担当者が変わってもVote運用が継続できる。

---

## 自動登録の仕組み（今後運用）
Issue定義は `docs/issues/vote-branch-priority-issues.json` を正本として管理し、
`GH_TOKEN=*** bash scripts/github/create_vote_branch_issues.sh <owner/repo>` で `gh issue create` により登録します。

### 実行例
```bash
# 事前確認
GH_TOKEN=*** bash scripts/github/create_vote_branch_issues.sh owner/repo
```

### CI運用
- `.github/workflows/sync-vote-issues.yml` から手動実行可能
- GitHub Actions では `GH_TOKEN: ${{ github.token }}` を使って `gh issue create` を実行
