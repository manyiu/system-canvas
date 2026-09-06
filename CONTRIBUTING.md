# Contributing

Thanks for helping improve System Canvas.

## Git workflow (trunk-based)

- `main` is always releasable and deploys to production.
- Use short-lived branches (`feat/…`, `fix/…`).
- Open a pull request, wait for CI to pass, then merge and delete the branch.
- Do not use long-lived `develop`, `release/*`, or `staging` branches.
- Prefer `git revert` on `main` for production rollbacks.

## Local setup

```bash
pnpm install
pnpm build
pnpm check      # Biome format + lint
pnpm test:unit
pnpm test:e2e
pnpm dev:app
```

Node.js `>=24.20.0` and pnpm `>=12.2.1` are required (see root `package.json`).

## Coding style

The whole monorepo (app packages, e2e, and `infra/`) uses **Biome** for format and lint:

```bash
pnpm format   # write fixes
pnpm lint     # lint only
pnpm check    # format check + lint (CI gate)
```

Keep TypeScript `strict` semantics; do not weaken `tsconfig.base.json` for convenience.

## Pull requests

1. Keep changes focused and described clearly.
2. Ensure `pnpm check`, `pnpm build`, `pnpm test:unit`, and `pnpm test:e2e` pass.
3. Do not commit secrets, `.env` files, or AWS account identifiers in docs.

## Infrastructure

Operator bootstrap and deploy notes live in [`infra/README.md`](infra/README.md). Application contributors usually do not need AWS credentials.
