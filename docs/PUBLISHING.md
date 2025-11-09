# Publishing Guide

This guide explains how to publish `qlaw-cli` to npm.

## Prerequisites

Before you can publish the package, you need to set up npm authentication in GitHub Actions.

### Setting Up NPM_TOKEN Secret

1. **Create an npm Access Token**
   - Log in to [npmjs.com](https://www.npmjs.com/)
   - Go to [Access Tokens](https://www.npmjs.com/settings/tokens)
   - Click "Generate New Token" → "Classic Token"
   - Select "Automation" type (recommended for CI/CD)
   - Copy the generated token

2. **Add Token to GitHub Repository**
   - Go to your GitHub repository settings
   - Navigate to **Settings** → **Secrets and variables** → **Actions**
   - Click "New repository secret"
   - Name: `NPM_TOKEN`
   - Value: Paste your npm token
   - Click "Add secret"

## Publishing Process

The publish workflow (`.github/workflows/publish.yml`) automatically publishes to npm when:

1. Code is pushed to the `main` branch, OR
2. The workflow is manually triggered via workflow_dispatch
3. The version in `package.json` doesn't already exist on npm

### Automatic Publishing

1. Update the version in `package.json`:
   ```bash
   npm version patch  # or minor, or major
   ```

2. Commit and push to main:
   ```bash
   git add package.json
   git commit -m "chore: bump version to X.Y.Z"
   git push origin main
   ```

3. The GitHub Action will:
   - Check if the version exists on npm
   - If not, publish with provenance
   - Create a GitHub release
   - Tag the release

### Manual Publishing

You can also trigger the workflow manually:

1. Go to **Actions** tab in GitHub
2. Select "Publish Package" workflow
3. Click "Run workflow"
4. Select branch (usually `main`)
5. Click "Run workflow"

## First-Time Publishing

For the very first publish of `qlaw-cli`:

1. Ensure you have the `NPM_TOKEN` secret configured (see above)
2. The package name `qlaw-cli` must be available on npm
3. The workflow will use `--access public` to publish as a public package
4. Provenance attestation will be generated for supply chain security

## Troubleshooting

### Error: "Not found - 'qlaw-cli@X.Y.Z' is not in this registry"

This means the package doesn't exist yet. Solutions:

1. **Verify NPM_TOKEN secret is set** in GitHub repository settings
2. **Check npm package name availability**: Visit `https://www.npmjs.com/package/qlaw-cli`
3. **Verify npm account permissions**: Ensure the account associated with the token can publish packages

### Error: "You do not have permission to publish"

1. Verify the npm token has publish permissions
2. If the package already exists, ensure your npm account is an owner/maintainer
3. Recreate the token with "Automation" or "Publish" permissions

### Error: "Package name too similar to existing package"

npm may reject package names similar to existing popular packages. Choose a different name if needed.

## Provenance and Security

The workflow generates [npm provenance](https://docs.npmjs.com/generating-provenance-statements) statements for supply chain security:

- Uses GitHub Actions OIDC token (`id-token: write` permission)
- Publishes with `--provenance` flag
- Creates verifiable attestation of where and how the package was built
- Users can verify authenticity with `npm audit signatures`

## Version Management

Follow [Semantic Versioning](https://semver.org/):

- **MAJOR**: Breaking changes
- **MINOR**: New features (backward compatible)
- **PATCH**: Bug fixes

Use npm version commands:
```bash
npm version patch  # 0.1.2 → 0.1.3
npm version minor  # 0.1.2 → 0.2.0
npm version major  # 0.1.2 → 1.0.0
```
