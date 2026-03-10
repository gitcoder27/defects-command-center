# Production Monitoring Checklist

## Goal

Use this checklist during the first few days after rollout to monitor the live VPS deployment and catch operational issues early.

Current production entry points:

- `https://manager.daycommand.online`
- `https://developer.daycommand.online`

Related docs:

- `docs/23-hostinger-domain-vps-deployment-runbook.md`
- `docs/22-cloudflare-ops-quick-reference.md`

## Daily Quick Checks

Run these checks at least 2 to 3 times per day during the initial rollout window.

### 1. Confirm Core Services Are Running

```bash
sudo systemctl status defects-dashboard nginx --no-pager
```

Expected:

- `defects-dashboard` is `active (running)`
- `nginx` is `active (running)`

### 2. Confirm Public URLs Respond

```bash
curl -I https://manager.daycommand.online
curl -I https://developer.daycommand.online/my-day
curl -s https://manager.daycommand.online/api/health
```

Expected:

- manager URL returns `HTTP 200`
- developer `/my-day` URL returns `HTTP 200`
- health endpoint returns `{"status":"ok"}`

### 3. Review Recent App Logs

```bash
sudo journalctl -u defects-dashboard -n 100 --no-pager
```

Watch for repeated errors such as:

- `Sync failed`
- database errors
- auth or session failures
- repeated process restarts

## Resource Checks

Run once or twice per day:

```bash
free -h
df -h
```

Watch for:

- memory pressure growing over time
- disk usage growing unexpectedly
- backup storage growing faster than expected

## If Users Report Slowness

Follow the app logs live:

```bash
sudo journalctl -u defects-dashboard -f
```

While watching logs:

1. reproduce the issue in the browser
2. check whether Jira sync is running at the same time
3. check whether the app logs errors or restarts

You can also inspect the current process footprint:

```bash
ps -o pid,ppid,%cpu,%mem,cmd -C node -C nginx
```

## After Every Deploy

Run:

```bash
sudo systemctl status defects-dashboard --no-pager
curl -I https://manager.daycommand.online
curl -I https://developer.daycommand.online/my-day
curl -s https://manager.daycommand.online/api/health
```

Then verify manually in the browser:

- a manager can sign in
- a developer can sign in
- Jira-backed data still loads
- the changed feature is visible and working

## Failure Recovery

If the app appears down:

```bash
sudo systemctl restart defects-dashboard
sudo systemctl status defects-dashboard --no-pager
```

If the app is up but public traffic behaves incorrectly:

```bash
sudo systemctl reload nginx
sudo systemctl status nginx --no-pager
```

## Early Warning Signs

Good signs:

- services stay up without restart loops
- health endpoint keeps returning `{"status":"ok"}`
- team members can log in and use the app without random failures
- logs stay mostly quiet apart from normal Jira sync activity

Risk signs:

- repeated Jira sync failures
- database lock errors
- rising memory usage across the day
- disk growth from backups or logs
- certificate renewal failures later

## Notes About This Deployment

Current architecture:

- one VPS
- one Node app process
- `nginx` reverse proxy
- SQLite database in WAL mode

This is suitable for a small internal team, but it is still a single-server deployment.

That means:

- a VPS outage affects everyone
- a bad deploy affects everyone
- restarts create a short interruption for all users
