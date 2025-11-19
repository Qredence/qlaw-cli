# Publishing Guide

This guide explains how to publish `qlaw-cli` to npm using **npm Trusted Publishers** with GitHub Actions OIDC authentication.

## Overview

This repository uses **npm Trusted Publishing**, a modern, secure approach that eliminates the need for long-lived npm tokens. Instead, GitHub Actions uses OIDC (OpenID Connect) to authenticate with npm automatically during workflow runs.

### Benefits

- ✅ No npm tokens to manage or rotate
- ✅ Cryptographically signed, short-lived credentials
- ✅ Reduced risk of credential leakage
- ✅ Automatic provenance attestation for supply chain security
- ✅ Authentication tied to specific workflows and repositories

## Prerequisites

Before you can publish the package, you need to configure npm Trusted Publishing on npmjs.com.

### Setting Up Trusted Publishing on npm

1. **Ensure the package exists on npm** (for first-time setup)

   - If `qlaw-cli` doesn't exist yet, you'll need to do an initial manual publish with your npm account:
     ```bash
     npm login
     npm publish --access public
     ```
   - Alternatively, create the package on npmjs.com without publishing

2. **Configure Trusted Publisher on npmjs.com**

   - Log in to [npmjs.com](https://www.npmjs.com/)
   - Go to your package page: https://www.npmjs.com/package/qlaw-cli
   - Click on **Settings** tab
   - Scroll to **Publishing access** or **Trusted Publishers** section
   - Click **Add trusted publisher**
   - Select **GitHub Actions** as the CI/CD provider
   - Enter the following details:
     - **Organization or user**: `Qredence`
     - **Repository**: `qlaw-cli`
     - **Workflow filename**: `publish.yml`
     - **Environment name** (optional): `release` (if you want to restrict to the release environment)
   - Click **Save**

3. **Verify Configuration**
   - The workflow file already has the correct permissions:
     ```yaml
     permissions:
       id-token: write # Enable OIDC authentication
       contents: write # Create releases/tags
     ```
   - The publish command already includes `--provenance` and `--access public` flags

## Publishing Process

Once trusted publishing is configured on npmjs.com, the workflow will automatically publish to npm when:

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
   - If not, publish using OIDC authentication (no token needed!)
   - Generate provenance attestation
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

### Option 1: Configure Trusted Publishing First (Recommended)

1. Create the package on npmjs.com (without publishing)
2. Configure trusted publishing (see above)
3. Run the GitHub Actions workflow
4. The workflow will publish using OIDC authentication

### Option 2: Manual Initial Publish, Then Configure

1. Manually publish once from your local machine:
   ```bash
   npm login
   npm publish --access public
   ```
2. Configure trusted publishing on npmjs.com (see above)
3. All future publishes will use GitHub Actions with OIDC

## How It Works

When the workflow runs:

1. GitHub generates a short-lived OIDC token that proves the workflow's identity
2. The workflow calls `npm publish --provenance --access public`
3. npm receives the OIDC token and verifies it matches the trusted publisher configuration
4. If valid, npm allows the publish and generates a provenance attestation
5. The package is published with cryptographic proof of its origin

No npm token is stored in GitHub Secrets - authentication happens automatically via OIDC.

## Troubleshooting

### Error: "Unable to authenticate with npm"

**Cause**: Trusted publishing is not configured on npmjs.com

**Solution**:

1. Verify you've added the trusted publisher configuration on npmjs.com
2. Double-check the repository name, organization, and workflow filename match exactly
3. Ensure `id-token: write` permission is set in the workflow (it already is)

### Error: "Not found - 'qlaw-cli@X.Y.Z' is not in this registry"

This error shows up in two scenarios:

1. **Package truly does not exist yet** – npm is telling you it has never seen `qlaw-cli` before.
2. **Trusted Publishing is not wired up for this package** – npm deliberately responds with 404 for untrusted identities, even if the package exists (as a privacy safeguard).

**Fix when the package is new:**

1. Do an initial manual publish from a logged-in npm account: `npm publish --access public`
2. OR create the package shell on npmjs.com first
3. Then enable trusted publishing so GitHub can take over

**Fix when the package already exists but the workflow still sees 404:**

1. On npmjs.com go to **Package → Settings → Trusted Publishers**
2. Add a GitHub Actions trusted publisher with:
   - Organization/user: `Qredence`
   - Repository: `qlaw-cli`
   - Workflow filename: `publish.yml`
   - (Optional) Environment: `release`
3. Save the configuration, then rerun the workflow. npm will now issue the provenance-aware token and the publish will succeed.

### Error: "You do not have permission to publish"

**Cause**: The GitHub repository/workflow doesn't match the trusted publisher configuration

**Solution**:

1. Verify the trusted publisher settings on npmjs.com
2. Check that organization name is `Qredence` (exact match, case-sensitive)
3. Check that repository name is `qlaw-cli` (exact match)
4. Check that workflow filename is `publish.yml`
5. If using environment name, ensure it's set to `release`

### Error: "Package already exists"

**Cause**: The version already exists on npm

**Solution**: The workflow automatically skips publishing if the version exists. Bump the version in `package.json` and try again.

## Security & Provenance

### Provenance Attestation

Every package published via this workflow includes a provenance attestation that proves:

- Which GitHub repository published it
- Which workflow file was used
- The exact commit SHA
- When it was published
- The build environment details

Users can verify authenticity with:

```bash
npm audit signatures
```

### OIDC Security

- Short-lived credentials (valid only for the workflow run)
- No static tokens to leak or compromise
- Authentication tied to specific repository and workflow
- Cryptographically verifiable publishing provenance

### Supply Chain Protection

The `--provenance` flag ensures transparency in the software supply chain by:

- Recording where the package was built
- Linking the package to its source code
- Enabling verification of package authenticity
- Meeting SLSA (Supply Chain Levels for Software Artifacts) requirements

## Version Management

Follow [Semantic Versioning](https://semver.org/):

- **MAJOR**: Breaking changes (e.g., 0.1.2 → 1.0.0)
- **MINOR**: New features, backward compatible (e.g., 0.1.2 → 0.2.0)
- **PATCH**: Bug fixes (e.g., 0.1.2 → 0.1.3)

Use npm version commands:

```bash
npm version patch  # 0.1.2 → 0.1.3
npm version minor  # 0.1.2 → 0.2.0
npm version major  # 0.1.2 → 1.0.0
```

## Additional Resources

- [npm Trusted Publishers Documentation](https://docs.npmjs.com/trusted-publishers)
- [npm Provenance Statements](https://docs.npmjs.com/generating-provenance-statements)
- [GitHub OIDC Documentation](https://docs.github.com/en/actions/deployment/security-hardening-your-deployments/about-security-hardening-with-openid-connect)
- [npm Security Best Practices](https://docs.npmjs.com/security)
