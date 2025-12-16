# Copilot Instructions for kondate_maker

This repository uses the same rules as AGENTS.md. Please read and follow all guidelines there.

## Project Overview
This is a Python 3.11 project that generates weekly meal plans (献立) using OpenAI and Notion APIs, deployed via GitHub Actions.

## Key Guidelines

### Code Style
- Write all Python code following PEP 8
- Always add type hints to functions and methods
- Format code with `black` and `isort` before committing
- Use descriptive variable names (prefer English for code, Japanese comments when needed for context)

### When Adding Features
- Keep changes minimal and focused on the specific issue
- Follow existing patterns in the codebase
- Consider API cost implications (OpenAI API calls)
- Ensure compatibility with GitHub Actions free tier

### Testing
- Add `pytest` tests when adding new functionality
- Validate GitHub Actions workflows locally with `act -n`
- Test error cases: API failures, missing data, invalid inputs

### Documentation
- Update README.md if behavior changes (write in Japanese to match existing style)
- Add docstrings to new functions and classes
- Include examples in docstrings where helpful

### Before Finishing
- Run `black` and `isort` to format code
- Run `pytest` if tests exist
- Validate Actions with `act -n` if workflow files were modified
- Ensure all error cases are handled gracefully

## What NOT to Do
- Do not add unnecessary dependencies
- Do not modify API authentication without explicit instruction
- Do not change Notion database schema without discussion
- Do not introduce features that increase API costs significantly
