# Development Setup

This guide walks through the everyday git and Docker steps for Panday. It assumes you are new to both tools, so each section is short and direct.

## Git: working on code

Main branch rules:
- `main` cannot be deleted or force-pushed. Every change must land through a pull request.
- At least **one teammate must approve** the pull request before you can merge.
- GitHub lets you finish the PR with a merge, squash, or rebase merge—pick whichever matches the story size and commit style.

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

3. **Stay in sync before you open or update a PR**
   - GitHub requires your branch to match the latest `main`.
   - Rebase often so you fix conflicts early.
   ```bash
   git checkout feature/<brief-topic>
   git fetch origin

   # Save any local work, even new files that are not tracked yet
   git stash push -u -m "sync-main"

   # Replay your commits on top of the newest main
   git rebase origin/main

   # Bring your saved files back
   git stash pop    # fix conflicts if Git asks

   # Update the remote copy of your branch
   git push --force-with-lease
   ```
   `git stash push -u` keeps untracked files safe while you rebase. `--force-with-lease` pushes your rebased branch without overwriting someone else’s work.
   Example: If GitHub shows “This branch is out-of-date with the base branch”, run the steps above before requesting review again.

4. **Pull request checklist**
   - `git status` should say “nothing to commit, working tree clean”.
   - Run `bun run check` to catch lint and type issues.
   - Push your branch and open a PR against `main`.
   - Ask for at least one review. GitHub blocks the merge button until someone approves.
   - Keep the PR small and focused so reviews move quickly.
   - Merge from GitHub once you have approval, choosing merge, squash, or rebase as needed.
   Example: After finishing the login fix, double-check status, run `bun run check`, push, request a review, get an approval, then use the GitHub UI to merge.

### Handy commands

| Task | Command | When to run it |
| --- | --- | --- |
| Update `main` | `git fetch origin && git pull --ff-only origin main` | Starting your day or before creating a new branch |
| New branch | `git checkout -b feature/<brief-topic>` | Beginning work on a feature or bug fix |
| Rebase on latest `main` | `git fetch origin && git rebase origin/main` | GitHub says the branch is behind `main` |
| Push after rebase | `git push --force-with-lease` | After a successful rebase when you need to update the remote branch |
| Stash work (keeps untracked files) | `git stash push -u -m "sync-main"` | Before rebasing if you have uncommitted changes |
| Restore stashed work | `git stash pop` | Right after the rebase to bring back your saved files |

## Docker: running Postgres and Redis

We ship a helper script so you do not have to remember the full Docker commands.

1. **Start the databases**
   ```bash
   bun run services:start
   ```
   This script calls `./scripts/dev-services.sh start` for you and spins up Postgres and Redis in the background. Data sticks around between restarts because we use Docker volumes.

2. **Check that they are running**
   ```bash
   bun run services:status
   ```
   If you see both services listed with their ports, you are good to go.

3. **Stop the databases when you are done**
   ```bash
   bun run services:stop
   ```
   This shuts the containers down but keeps the saved data.

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
   - Start the app with `bun run dev`.

Follow these steps each time you work on Panday to keep the protected `main` branch stable and your dev services healthy.
