#!/usr/bin/env bash
# Enable GitHub Pages for this repository using the GitHub Actions source.
# Idempotent: safe to run repeatedly. Requires an authenticated `gh` CLI.
set -euo pipefail

if ! command -v gh >/dev/null 2>&1; then
  echo "error: GitHub CLI (gh) is required: https://cli.github.com/" >&2
  exit 1
fi

if ! gh auth status >/dev/null 2>&1; then
  echo "error: run 'gh auth login' first" >&2
  exit 1
fi

repo="${GITHUB_REPOSITORY:-$(gh repo view --json nameWithOwner --jq .nameWithOwner)}"
owner="$(printf '%s' "${repo%%/*}" | tr '[:upper:]' '[:lower:]')"
name="${repo##*/}"
url="https://${owner}.github.io/${name}/"

if gh api "repos/${repo}/pages" >/dev/null 2>&1; then
  echo "Pages already enabled for ${repo}; ensuring the workflow build source."
  gh api -X PUT "repos/${repo}/pages" -f build_type=workflow >/dev/null
else
  echo "Enabling Pages for ${repo} with the GitHub Actions source."
  gh api -X POST "repos/${repo}/pages" -f build_type=workflow >/dev/null
fi

gh api -X PATCH "repos/${repo}" -f "homepage_url=${url}" >/dev/null

cat <<EOF
Pages is configured.

  URL:      ${url}
  Workflow: .github/workflows/deploy-pages.yml (push to main, or manual dispatch)
  Manual:   gh workflow run deploy-pages.yml

The first deploy creates the 'github-pages' environment automatically.
Recommended: require the CI 'Verify' and 'E2E smoke' checks on main in
Settings -> Rules, so only tested commits reach the deployed branch.
EOF
