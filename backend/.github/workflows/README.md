# GitHub Actions Workflows

## CI Pipeline

The `ci.yml` workflow runs automatically on:
- **Pull Requests** to `main` or `dev` branches
- **Pushes** to `main` or `dev` branches

### What it does:

1. **Linting** - Runs ESLint on all TypeScript files
2. **Testing** - Runs the full test suite with coverage
3. **Coverage Upload** - Uploads test coverage reports to Codecov (optional)

### Running checks locally before pushing:

```bash
# Run both lint and tests (quick validation)
pnpm validate

# Run with coverage (same as CI)
pnpm validate:ci
```

### Notes:

- Linting is set to `continue-on-error: true` because there are pre-existing linting issues in the codebase
- Tests must pass for the workflow to succeed
- Coverage reports are uploaded but won't fail the build

### Skipping CI (not recommended):

If you need to skip CI checks temporarily, add `[skip ci]` to your commit message:

```bash
git commit -m "docs: update README [skip ci]"
```
