#!/usr/bin/env bash
set -euo pipefail

if ! command -v gh >/dev/null 2>&1; then
  echo "gh CLI is required. Install GitHub CLI and re-run." >&2
  exit 1
fi

if [[ $# -ne 1 ]]; then
  echo "Usage: $0 <owner/repo>" >&2
  exit 1
fi

REPO="$1"

create_issue() {
  local title="$1"
  local body="$2"
  local priority_label="$3"

  gh issue create \
    --repo "$REPO" \
    --title "$title" \
    --label "vote" \
    --label "$priority_label" \
    --body "$body"
}

create_issue "[Vote][P0] Expo Router前提でVote系URLを正規化する" "## 背景
- Vote導線はURL同期済みだがroute component分割が未完了
- App.tsx中心の暫定配線が残っている

## 対応内容
- /vote, /vote/complete, /events/:eventId の遷移責務をroute単位へ移行
- auth guard と deep link 復元仕様を明文化

## 受け入れ条件
- URL直打ちでVote/VoteCompleteに自然遷移
- 戻る/進むでVoteフローが破綻しない" "priority:P0"

create_issue "[Vote][P0] App.tsx依存を解消する状態責務分離（Auth/Navigation/SelectedEvent）" "## 背景
- Vote対象イベントの選択状態がApp.tsx/AppStateに集中している

## 対応内容
- Auth/Config/Navigation/SelectedEntity storeを分割
- EventDetail/EventList起点のVote遷移仕様を統一

## 受け入れ条件
- Vote必要stateをhooks経由で取得できる
- App.tsxのVote関連責務が大幅削減される" "priority:P0"

create_issue "[Vote][P0] Web版Adminで未精算イベント処理を効率化（一覧/絞込/並び替え）" "## 背景
- 結果登録オペレーションがmobile寄りUIで非効率

## 対応内容
- 未精算イベント中心のtable表示
- status/category/eventType filter, sort, paging追加

## 受け入れ条件
- Web管理画面で対象探索〜結果登録までの操作工数が削減される" "priority:P0"

create_issue "[Vote][P1] 投票〜精算のAPI統合テストを拡張" "## 背景
- Vote主要導線の回帰検知範囲が不足

## 対応内容
- 認証/投票/締切後不可/精算/履歴整合性の統合テスト追加

## 受け入れ条件
- Vote主要シナリオがCI上で自動検知できる" "priority:P1"

create_issue "[Vote][P1] 監視・エラー追跡（web/mobile/backend）導入" "## 背景
- Vote失敗時の原因追跡基盤が不足

## 対応内容
- request_id, user_id, route/endpoint, statusの観測
- 500系/投票エラー急増の通知設計

## 受け入れ条件
- 障害時に原因箇所を短時間で特定できる" "priority:P1"

create_issue "[Vote][P1] JWT運用hardening（Web cookie refresh + native session）" "## 背景
- JWT導線はあるが本番向けの鍵運用/失効運用が未整備

## 対応内容
- 鍵ローテーション手順
- refresh失効運用強化
- native secure storage運用強化

## 受け入れ条件
- Vote導線での再認証挙動が設計/実装で安定する" "priority:P1"

create_issue "[Vote][P2] 通知・非同期ジョブ基盤（結果通知/リマインド）" "## 背景
- Home表示中心で非同期通知基盤が未整備

## 対応内容
- 結果通知/締切リマインドのジョブ化方針を策定

## 受け入れ条件
- 技術方針と最小実装案が確定する" "priority:P2"

create_issue "[Vote][P2] 運用Runbook整備（イベント運用/誤登録時対応）" "## 背景
- Vote運用手順が属人化しやすい

## 対応内容
- イベント作成/結果登録/誤登録対応/障害一次切り分けを文書化

## 受け入れ条件
- 担当交代時でも運用継続できる" "priority:P2"

echo "Done: issue creation requests have been sent for $REPO"
