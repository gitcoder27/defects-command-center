# Worktree Setup

This repository uses the main checkout as the integration workspace and two sibling Git worktrees for parallel Codex CLI tasks.

## Worktree Paths And Branches

- Main workspace: `/home/ubuntu/Development/lead-os` on `main`
- Codex agent A: `/home/ubuntu/Development/lead-os-codex-a` on `task/codex-a`
- Codex agent B: `/home/ubuntu/Development/lead-os-codex-b` on `task/codex-b`

## Port Mapping

- Main workspace
  - Backend: `3002`
  - Frontend: `5173`
  - Database: `data/dashboard.sandbox.db`
- Codex agent A
  - Backend: `3003`
  - Frontend: `5174`
  - Database: `data/dashboard.codex-a.db`
- Codex agent B
  - Backend: `3004`
  - Frontend: `5175`
  - Database: `data/dashboard.codex-b.db`

## Exact Startup Commands

Run each command from the matching checkout root:

```bash
# Main integration workspace
cd /home/ubuntu/Development/lead-os
npm run dev
```

```bash
# Codex agent A
cd /home/ubuntu/Development/lead-os-codex-a
npm run dev
```

```bash
# Codex agent B
cd /home/ubuntu/Development/lead-os-codex-b
npm run dev
```

Optional validation commands from any checkout root:

```bash
npm run typecheck
npm run build:check
npm run test
npm run test --workspace=client
```

## Local Override Files

Each checkout can keep a private root `.env.local` with only the values that should differ from the shared `.env`.

The current setup also links each worktree's root `.env` and `node_modules` back to the main checkout so `npm run dev` works without a second install or a second credentials file.

Codex agent A:

```env
PORT=3003
VITE_PORT=5174
VITE_API_PORT=3003
DASHBOARD_DB_PATH=data/dashboard.codex-a.db
```

Codex agent B:

```env
PORT=3004
VITE_PORT=5175
VITE_API_PORT=3004
DASHBOARD_DB_PATH=data/dashboard.codex-b.db
```

The frontend dev proxy should always use `VITE_API_PORT` or `VITE_API_PROXY_TARGET`.
Do not rely on `PORT` to steer Vite, because shell-level `PORT` overrides can accidentally point localhost traffic at production.

## Merge Task Branches Locally Into Main

```bash
cd /home/ubuntu/Development/lead-os
git fetch --all --prune
git merge --no-ff task/codex-a
git merge --no-ff task/codex-b
```

If you prefer to review commits first:

```bash
cd /home/ubuntu/Development/lead-os
git log --oneline main..task/codex-a
git log --oneline main..task/codex-b
```

## Refresh Or Reuse The Worktrees Later

Update `main` first, then rebase or recreate the task worktrees:

```bash
cd /home/ubuntu/Development/lead-os
git checkout main
git pull --ff-only
```

If the Codex worktrees are disposable and you want to snap both of them to the current local `main` commit in one command:

```bash
cd /home/ubuntu/Development/lead-os
npm run sync:worktrees
```

If a worktree has changes you want to throw away, use the force mode:

```bash
cd /home/ubuntu/Development/lead-os
bash scripts/sync-worktrees.sh --force
```

Reuse an existing worktree:

```bash
cd /home/ubuntu/Development/lead-os-codex-a
git fetch origin
git rebase main
```

```bash
cd /home/ubuntu/Development/lead-os-codex-b
git fetch origin
git rebase main
```

Recreate a worktree cleanly if needed:

```bash
cd /home/ubuntu/Development/lead-os
git worktree remove ../lead-os-codex-a
git branch -D task/codex-a
git worktree add ../lead-os-codex-a -b task/codex-a main
```

```bash
cd /home/ubuntu/Development/lead-os
git worktree remove ../lead-os-codex-b
git branch -D task/codex-b
git worktree add ../lead-os-codex-b -b task/codex-b main
```

## Revert A Bad Merge Safely

If the merge commit has not been pushed and you want to undo the latest merge in `main`:

```bash
cd /home/ubuntu/Development/lead-os
git log --oneline --decorate -n 5
git reset --hard HEAD~1
```

If the merge has already been shared or you want a history-preserving rollback:

```bash
cd /home/ubuntu/Development/lead-os
git log --oneline --merges -n 5
git revert -m 1 <merge-commit-sha>
```

Use `git status` before either rollback path so you do not discard unrelated local changes.
