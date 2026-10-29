# Rules for agents working in this project

## Git workflow

- **One branch per feature.** Never commit directly to `main`. Before changing anything,
  create a branch from an up-to-date `main`, named for the work: `feature-<name>` for new
  behaviour, `fix-<name>` for bugs, `chore-<name>` for tooling and docs.
- **Keep branches focused.** One feature or fix per branch; unrelated changes get their own branch.
- **Small, clear commits.** Commit messages say what changed and why, in the imperative
  ("Add bird player", not "changes"). Stage only the files that belong to the change.
- **Check before committing.** Run `node --check` on changed JS files and make sure the game still loads.
- **Merge with `--no-ff`** into `main` once the feature works, so the history shows each feature's branch.
- **Never push without confirmation.** Commit and merge locally, then tell the user what is
  ready (branches and commits) and wait for them to say yes before `git push`. A yes covers
  only that push, not later ones.
- Never force-push, rewrite pushed history, or delete branches unless the user asks.
