# Security Policy

## Supported versions

Security fixes are applied on the `main` branch of this repository.

## Reporting a vulnerability

Please **do not** open a public GitHub issue for security vulnerabilities.

Report privately via GitHub Security Advisories for this repository:

https://github.com/manyiu/system-canvas/security/advisories/new

Include a clear description, impact, and steps to reproduce when possible. We will acknowledge the report and work on a fix.

## Scope notes

System Canvas is a client-side static application (no backend auth or datastore in this repo). Typical concerns include XSS in the demo UI, supply-chain issues in dependencies, and misuse of the GitHub Actions OIDC deploy role. Do not include secrets or production credentials in reports beyond what is needed to demonstrate the issue.
