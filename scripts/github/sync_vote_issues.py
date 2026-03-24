#!/usr/bin/env python3
"""Idempotently create/update Vote backlog issues on GitHub."""

from __future__ import annotations

import argparse
import json
import os
import sys
import urllib.error
import urllib.parse
import urllib.request
from dataclasses import dataclass
from typing import Any

API_BASE = "https://api.github.com"


@dataclass
class IssueSpec:
    title: str
    body: str
    labels: list[str]


class GitHubClient:
    def __init__(self, token: str, repo: str):
        self.token = token
        self.repo = repo

    def _request(self, method: str, path: str, payload: dict[str, Any] | None = None) -> Any:
        url = f"{API_BASE}{path}"
        data = None
        headers = {
            "Accept": "application/vnd.github+json",
            "Authorization": f"Bearer {self.token}",
            "X-GitHub-Api-Version": "2022-11-28",
            "User-Agent": "vote-issue-sync-script",
        }
        if payload is not None:
            data = json.dumps(payload).encode("utf-8")
            headers["Content-Type"] = "application/json"

        req = urllib.request.Request(url, data=data, method=method, headers=headers)
        with urllib.request.urlopen(req) as resp:
            body = resp.read().decode("utf-8")
            return json.loads(body) if body else None

    def ensure_label(self, name: str) -> None:
        owner, repo = self.repo.split("/", 1)
        path = f"/repos/{owner}/{repo}/labels/{urllib.parse.quote(name, safe='')}"
        try:
            self._request("GET", path)
            return
        except urllib.error.HTTPError as err:
            if err.code != 404:
                raise

        color = "5319E7" if name.startswith("priority:P0") else "1D76DB" if name.startswith("priority:P1") else "0E8A16"
        self._request(
            "POST",
            f"/repos/{owner}/{repo}/labels",
            {
                "name": name,
                "color": color,
                "description": "managed by scripts/github/sync_vote_issues.py",
            },
        )

    def get_open_issue_by_title(self, title: str) -> dict[str, Any] | None:
        owner, repo = self.repo.split("/", 1)
        query = urllib.parse.quote(f'repo:{owner}/{repo} is:issue is:open in:title "{title}"')
        result = self._request("GET", f"/search/issues?q={query}&per_page=5")
        items = result.get("items", [])
        for item in items:
            if item.get("title") == title:
                return item
        return None

    def create_issue(self, spec: IssueSpec) -> dict[str, Any]:
        owner, repo = self.repo.split("/", 1)
        return self._request(
            "POST",
            f"/repos/{owner}/{repo}/issues",
            {"title": spec.title, "body": spec.body, "labels": spec.labels},
        )

    def update_issue(self, issue_number: int, spec: IssueSpec) -> dict[str, Any]:
        owner, repo = self.repo.split("/", 1)
        return self._request(
            "PATCH",
            f"/repos/{owner}/{repo}/issues/{issue_number}",
            {"title": spec.title, "body": spec.body, "labels": spec.labels},
        )


def load_specs(path: str) -> list[IssueSpec]:
    with open(path, "r", encoding="utf-8") as f:
        raw = json.load(f)

    specs: list[IssueSpec] = []
    for row in raw:
        specs.append(IssueSpec(title=row["title"], body=row["body"], labels=row.get("labels", [])))
    return specs


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Create/update Vote issues from JSON spec.")
    parser.add_argument("--repo", default=os.getenv("GITHUB_REPOSITORY"), help="owner/repo")
    parser.add_argument("--token", default=os.getenv("GITHUB_TOKEN"), help="GitHub API token")
    parser.add_argument(
        "--spec",
        default="docs/issues/vote-branch-priority-issues.json",
        help="Path to issue spec JSON",
    )
    parser.add_argument("--update", action="store_true", help="Update body/labels when issue already exists")
    parser.add_argument("--dry-run", action="store_true", help="Print planned actions without API requests")
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    if not args.repo:
        print("error: --repo or GITHUB_REPOSITORY is required", file=sys.stderr)
        return 2
    if not args.token and not args.dry_run:
        print("error: --token or GITHUB_TOKEN is required", file=sys.stderr)
        return 2

    specs = load_specs(args.spec)
    if args.dry_run:
        print(f"[dry-run] target repo: {args.repo}")
        for spec in specs:
            print(f"[dry-run] ensure issue: {spec.title}")
        return 0

    client = GitHubClient(args.token, args.repo)

    needed_labels = sorted({label for spec in specs for label in spec.labels})
    for label in needed_labels:
        client.ensure_label(label)

    for spec in specs:
        existing = client.get_open_issue_by_title(spec.title)
        if existing:
            number = existing["number"]
            if args.update:
                updated = client.update_issue(number, spec)
                print(f"updated #{updated['number']}: {updated['title']}")
            else:
                print(f"exists  #{number}: {spec.title}")
            continue

        created = client.create_issue(spec)
        print(f"created #{created['number']}: {created['title']}")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
