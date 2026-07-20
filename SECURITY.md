# Security Policy

## Overview
QSIS Academic Files Manager prioritizes the security of academic resources and user data.

## Security Measures
- **Upload via PRs**: All file submissions go through Pull Requests — never directly to main branch
- **GitHub Actions Validation**: Automated checks on file types, sizes, and structure
- **Admin Review Required**: Uploads require approval before merging
- **No Direct Execution**: Only static file hosting; no server-side execution
- **CSP Headers**: Content Security Policy enforced via GitHub Pages
- **Input Sanitization**: All user inputs are sanitized before rendering

## Reporting a Vulnerability
Contact the Quranic Sciences Club administration or open a private issue on GitHub.

## Branches
- `main` — Production (admin-reviewed files only)
- `upload/*` — Temporary branches for new submissions
