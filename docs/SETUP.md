# Development Setup

This guide walks through the everyday git and Docker steps for Panday. It assumes you are new to both tools, so each section is short and direct.

## Quickstart

> quick note that I might mix up npm & bun in the commands, this is because they are interchangeable

1. **Install dependencies**

   ```bash
   npm install
   ```

2. **Copy environment variables**

   ```bash
   cp .env.example .env
   ```

   Fill in the required secrets (follow the hints in `.env.example`). The app refuses to start if something important is missing, so you find out right away.

3. **Launch the app (auto-starts Docker)**

   ```bash
   npm run dev      # or `bun dev`
   ```

I've set up this script to automatically run the local database, for those of you who don't know what that means, don't worry about it

4. **Database helpers when schema changes** (only necessary for people who are making changes to the database)

   ```bash
   npm run db:generate   # regenerate Prisma client after schema edits
   npm run db:migrate    # apply local migrations
   ```

   You only need these when you or a teammate edit the files under `prisma/`.

5. **Stop services when finished (optional)**
   this is optional but I would recommend doing it since the docker container will keep running in the background forever if you don't
   not a huge impact on your computer but good practice to stop it.

   ```bash
   npm run services:stop
   ```

The sections below explain the git workflow helpers and manual Docker scripts in more detail.

## Git helper scripts

These helpers live in the `scripts/` folder and are exposed through simple `npm run …` commands. They wrap several git commands into one button press so you do not have to remember them.

- `npm run git:sync`
  - Keeps your feature branch up to date with the latest code from `origin/main`.
  - If you need a different source branch, add it at the end: `npm run git:sync -- origin/release`.
  - You can switch to merge mode with `SYNC_MODE=merge npm run git:sync`.
  - The script temporarily tucks away any uncommitted files, updates your branch, then restores your work. It will stop and warn you if you accidentally try to run it on the protected `main`/`master` branches.
- `npm run git:behind`
  - Shows how many commits your branch is behind `origin/main` (the shared main branch on GitHub).
  - Add a different comparison branch if you need it: `npm run git:behind -- origin/release`.
  - A result of `0` means you are fully caught up; any other number tells you how many commits to pull in.

## Git: working on code

Main branch rules:

- `main` cannot be deleted or force-pushed. Every change must land through a pull request.
- At least **one teammate must approve** the pull request before you can merge.
- GitHub lets you finish the PR with a merge, squash, or rebase merge—pick whichever matches the story size and commit style.

If you are newer to Git, think of `main` as the shared source of truth. You do your work on a separate branch so you can share a clean, reviewable set of changes.

1. **Update your local `main`**

   ```bash
   git checkout main
   git fetch origin
   git pull --ff-only origin main
   ```

   `origin/main` is locked. You cannot push to it, so always pull the newest changes first.
   Example: Run this first thing each morning so you pick up features your teammates merged overnight.

2. **Create a feature branch**

   ```bash
   git checkout -b feature/<brief-topic>
   ```

   Work only on this branch. Keeping `main` clean makes future updates easier.
   Example: For a login bug fix you might use `git checkout -b feature/fix-login-redirect`.

3. **Keep your branch current before you open or refresh a PR**
   - GitHub requires your branch to match the latest `main`.
   - Use the helper first:

   ```bash
   npm run git:sync
   ```

   The script quietly stashes any uncommitted files, rebases your branch onto `origin/main`, then restores your work. If you need a different comparison branch, add it at the end: `npm run git:sync -- origin/release`. Set `SYNC_MODE=merge` when a teammate prefers a merge instead of a rebase.

   > If the script stops because of conflicts or you prefer to see every step, fall back to the manual commands below. They follow the same “save, update, restore” pattern.

   ```bash
   git checkout feature/<brief-topic>
   git fetch origin
   git stash push -u -m "sync-main"
   git rebase origin/main
   git stash pop
   git push --force-with-lease
   ```

   `git stash push -u` keeps untracked files safe while you rebase. `--force-with-lease` pushes your rebased branch without overwriting someone else’s work.
   If Git pauses for conflicts during the rebase or stash pop, follow the prompts, fix the files it lists, then run `git rebase --continue` (or repeat `git stash pop`) until it finishes.

### Use the helper script

Run the workflow script instead of typing the commands manually.

```bash
npm run git:sync                # defaults to rebasing onto origin/main
SYNC_MODE=merge npm run git:sync
npm run git:sync -- origin/release   # sync against a different branch
```

`scripts/git-sync.sh` automates the pattern above: it stashes uncommitted work, rebases (or merges) onto the latest target, then reapplies your changes. It also refuses to run on `main`/`master` so you do not accidentally rewrite protected history.

4. **Pull request checklist**
   - `git status` should say “nothing to commit, working tree clean”.
   - Run `bun run check` to catch lint and type issues.
   - Push your branch and open a PR against `main`.
   - Ask for at least one review. GitHub blocks the merge button until someone approves.
   - Keep the PR small and focused so reviews move quickly.
   - Merge from GitHub once you have approval, choosing merge, squash, or rebase as needed.
     Example: After finishing the login fix, double-check status, run `bun run check`, push, request a review, get an approval, then use the GitHub UI to merge.

### Handy commands

| Action | Command | Why it helps |
| --- | --- | --- |
| Quick branch sync | `npm run git:sync` | Safest way to pull in the latest `origin/main`; handles stashing and rebasing for you |
| Quick status check | `npm run git:behind` | Tells you how many commits you are behind `origin/main`; `-- origin/release` compares elsewhere |
| Update local `main` | `git fetch origin && git pull --ff-only origin main` | Run at the start of the day so `main` matches GitHub |
| Create a feature branch | `git checkout -b feature/<brief-topic>` | Keeps work isolated from `main` |
| Manual rebase (fallback) | `git fetch origin && git rebase origin/main` | Use if the helper script cannot finish because of conflicts |
| Manual push after rebase | `git push --force-with-lease` | Updates the remote copy of your branch without clobbering teammates |

`npm run git:behind` calls `scripts/git-behind.sh` and prints the number of commits your branch is behind the default `origin/main`. Pass a different comparison target if needed: `npm run git:behind -- origin/release`.

## Dev services: Postgres and Redis

Postgres (our database) and Redis (our cache/queue) run inside Docker containers. The helper script below saves you from memorising long Docker commands.

1. **Start the databases manually (optional)**

   ```bash
   npm run services:start   # or `bun run services:start`
   ```

   This script calls `./scripts/dev-services.sh start` for you and spins up Postgres and Redis in the background. Data sticks around between restarts because Docker stores it in named volumes.

   > Tip: `npm run dev` (or `bun run dev`) now runs this same start command automatically before launching the Next.js dev server, so you can usually skip this manual step.

2. **Check that they are running**

   ```bash
   npm run services:status   # or `bun run services:status`
   ```

   You should see `postgres`, `redis`, and `redis-rest`. The last container runs the upstream [serverless-redis-http](https://github.com/hiett/serverless-redis-http) proxy so local requests mirror Upstash’s REST API. Missing entries usually mean Docker needs more time; re-run the command after a few seconds.

3. **Stop the databases when you are done**

   ```bash
   npm run services:stop   # or `bun run services:stop`
   ```

   This shuts the containers down but keeps the saved data so you can pick up where you left off next time.

4. **Reset everything (rare)**

   ```bash
   # This wipes your local data. Only do it when you need a clean start.
   docker compose down -v
   bun run services:start
   ```

5. **Next steps once services are up**
   - Copy `.env.example` to `.env` and fill in values.
   - Run `bun run db:generate` after editing `prisma/schema.prisma`.
   - Run `bun run db:migrate` to apply migrations locally.
   - Start the app with `npm run dev` (or `bun run dev`). The command starts services if they are not already running, then boots the dev server.

Follow these steps each time you work on Panday to keep the protected `main` branch stable and your dev services healthy.
