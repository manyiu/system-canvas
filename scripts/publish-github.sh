#!/usr/bin/env bash
# Publish manyiu/system-canvas and enable trunk-based branch protection.
# Requires: gh auth with `repo` + `workflow` scopes.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

need_scopes() {
  echo "GitHub CLI needs the workflow scope to push Actions YAML."
  echo "Run:"
  echo "  gh auth login --hostname github.com --git-protocol https --web --scopes 'repo,workflow'"
  exit 1
}

gh auth status >/dev/null 2>&1 || need_scopes

if ! gh api user >/dev/null 2>&1; then
  need_scopes
fi

if ! git remote get-url origin >/dev/null 2>&1; then
  git remote add origin https://github.com/manyiu/system-canvas.git
fi

if ! gh repo view manyiu/system-canvas >/dev/null 2>&1; then
  gh repo create manyiu/system-canvas --public --source=. --remote=origin \
    --description "Interactive visualization for distributed system architecture patterns (DSL + React Flow canvas)"
fi

git push -u origin main

# Branch protection for trunk-based main (requires admin on the repo).
gh api -X PUT "repos/manyiu/system-canvas/branches/main/protection" \
  --input - <<'EOF'
{
  "required_status_checks": {
    "strict": true,
    "contexts": ["Lint, build, and test"]
  },
  "enforce_admins": false,
  "required_pull_request_reviews": {
    "required_approving_review_count": 0
  },
  "restrictions": null,
  "allow_force_pushes": false,
  "allow_deletions": false,
  "required_linear_history": true
}
EOF

# Production environment for deploy.yml
gh api -X PUT "repos/manyiu/system-canvas/environments/production" \
  --input - <<'EOF'
{
  "deployment_branch_policy": {
    "protected_branches": false,
    "custom_branch_policies": true
  }
}
EOF

gh api -X POST "repos/manyiu/system-canvas/environments/production/deployment-branch-policies" \
  -f name=main -F type=branch >/dev/null 2>&1 || true

echo "Published: https://github.com/manyiu/system-canvas"
echo "Next: set Actions variables and bootstrap AWS per infra/README.md"
