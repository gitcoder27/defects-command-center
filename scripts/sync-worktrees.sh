#!/usr/bin/env bash

set -euo pipefail

usage() {
  cat <<'EOF'
Usage: scripts/sync-worktrees.sh [--force]

Syncs the Codex worktrees to the current local main commit.

Default behavior:
- Fails if a worktree has tracked or untracked changes.

With --force:
- Discards tracked and untracked changes in each worktree.
- Preserves ignored files such as .env.local.
EOF
}

force=0

if [[ "${1:-}" == "--help" ]]; then
  usage
  exit 0
fi

if [[ "${1:-}" == "--force" ]]; then
  force=1
elif [[ $# -gt 0 ]]; then
  usage >&2
  exit 1
fi

repo_root="$(git rev-parse --show-toplevel)"
repo_name="$(basename "$repo_root")"
parent_dir="$(dirname "$repo_root")"

main_branch="main"
main_commit="$(git -C "$repo_root" rev-parse --verify "$main_branch")"
main_short_commit="$(git -C "$repo_root" rev-parse --short "$main_branch")"

worktrees=(
  "$parent_dir/$repo_name-codex-a"
  "$parent_dir/$repo_name-codex-b"
)

for worktree in "${worktrees[@]}"; do
  if [[ ! -d "$worktree/.git" && ! -f "$worktree/.git" ]]; then
    echo "Missing worktree: $worktree" >&2
    exit 1
  fi
done

is_dirty() {
  local worktree="$1"
  [[ -n "$(git -C "$worktree" status --porcelain)" ]]
}

if [[ "$force" -eq 0 ]]; then
  for worktree in "${worktrees[@]}"; do
    if is_dirty "$worktree"; then
      echo "Refusing to sync dirty worktree: $worktree" >&2
      echo "Run again with --force to discard worktree changes." >&2
      exit 1
    fi
  done
fi

echo "Syncing worktrees to $main_branch ($main_short_commit)"

for worktree in "${worktrees[@]}"; do
  branch_name="$(git -C "$worktree" branch --show-current)"
  echo
  echo "Updating $worktree [$branch_name]"

  if [[ "$force" -eq 1 ]]; then
    git -C "$worktree" clean -fd
  fi

  git -C "$worktree" reset --hard "$main_commit"
done

echo
echo "Done."
