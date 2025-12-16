# AGENTS.md

## Goal
- Prefer small PRs (one issue = one PR).
- Follow existing patterns; do not invent new architecture without discussion.
- This project generates weekly meal plans (献立) automatically using OpenAI and Notion APIs, triggered by GitHub Actions.

## Project Context
- **Language**: Python 3.11
- **Key APIs**: OpenAI API, Notion API
- **Deployment**: GitHub Actions (runs weekly on Sundays at 18:00 JST)
- **Cost Constraints**: Use only free tiers (no additional SaaS)
- **Structure**: Source code in `src/`, configuration in `.github/`

## How to run
- Install: `pip install -r requirements.txt` (when requirements.txt exists)
- Dev: Python 3.11 required, follow PEP 8 with type hints
- Test: `pytest` (when tests are added)
- Lint/Format: Use `black` and `isort` for code formatting
- Validate Actions: Run `act -n` locally to check GitHub Actions workflows

## Coding Standards
- Follow PEP 8 strictly
- Add type hints to all functions and methods
- Use `black` and `isort` for automatic formatting
- Write docstrings for public functions and classes
- Keep functions small and focused

## Definition of Done
- Tests pass (when test infrastructure exists).
- Error cases are handled (at least: API auth failures, empty/missing data, network errors).
- Update docs if behavior changes (especially README.md in Japanese).
- Code is formatted with `black` and `isort`.
- Type hints are present and correct.

## Safety / non-goals
- Do not change authentication flow without explicit instruction.
- Avoid adding new dependencies unless necessary.
- Do not modify Notion database schema without discussion.
- Keep OpenAI API usage minimal to control costs.
- Maintain compatibility with GitHub Actions free tier.
