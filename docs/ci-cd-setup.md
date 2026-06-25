# BrainBytes CI/CD Setup

## Overview

BrainBytes uses GitHub Actions for continuous integration and deployment. The CI/CD pipeline is defined in `.github/workflows/main.yml` and runs on every push to `main`, `initial`, and `mj-automation` branches, as well as on pull requests and weekly schedules.

## Pipeline Workflows

### 1. Linters (`lint`)
- **Purpose**: Run ESLint on both frontend and backend code
- **Triggers**: All pushes and PRs
- **Matrix**: Node.js 20.x and 22.x
- **Outputs**: ESLint report artifacts with inline PR annotations

### 2. Tests (`test`)
- **Purpose**: Run Jest unit/integration tests with coverage
- **Triggers**: After lint passes
- **Services**: MongoDB 4.4 container
- **Coverage**: Frontend and backend coverage reports uploaded as artifacts

### 3. Build (`build`)
- **Purpose**: Build Docker images for frontend and backend
- **Triggers**: After tests pass
- **Outputs**: Docker images saved as artifacts, docker-compose validation

### 4. Security Scan (`security-scan`)
- **Purpose**: Dependency and container vulnerability scanning
- **Triggers**: After build completes
- **Tools**: `npm audit`, Snyk, Trivy
- **Note**: Snyk requires `SNYK_TOKEN` secret to be configured

### 5. End-to-End Tests (`e2e`)
- **Purpose**: Playwright browser tests
- **Triggers**: After build completes
- **Setup**: Starts full stack via Docker Compose, runs Playwright tests
- **Retries**: Failed tests are automatically retried

### 6. Deploy (`deploy`)
- **Purpose**: Deploy to Oracle Cloud test environment
- **Triggers**: After build and e2e tests pass (push events only, not PRs)
- **Branch targeting**: `main` → staging, `mj-automation` → test
- **Script**: `scripts/deploy.sh` — builds, pulls, and restarts Docker Compose services
- **Health check**: Verifies frontend (port 7000) and backend API (port 5000) respond

## How to Run Manually

1. Go to the GitHub repository
2. Navigate to **Actions** tab
3. Select **BrainBytes CI/CD** workflow
4. Click **Run workflow** dropdown
5. Select the branch and click **Run**

## Workflow Status Badges

| Stage | Status |
|-------|--------|
| CI/CD | ![CI/CD](https://github.com/grahamcrackers123/BrainBytes/actions/workflows/main.yml/badge.svg) |

## Repository Secrets

The following secrets must be configured in **Settings > Secrets and variables > Actions**:

| Secret | Purpose |
|--------|---------|
| `SNYK_TOKEN` | Snyk API token for vulnerability scanning |
| `GROQ_API_KEY` | API key for Groq AI service (for local testing) |
| `OCI_HOST` | Oracle Cloud instance public IP address |
| `OCI_SSH_KEY` | SSH private key for OCI instance authentication |
| `OCI_USER` | SSH username for OCI instance (typically `ubuntu`) |

## Troubleshooting

### ESLint reports empty
Run `npm run lint:js` locally to check for configuration errors.

### E2E tests fail with connection refused
Ensure Docker Compose starts all services. Check that port 7000 is mapped correctly in `docker-compose.yml`. The frontend image must support HTTP on port 3000.

### Security scan fails
- Snyk 401: Regenerate token at https://app.snyk.io/account/api-token and update `SNYK_TOKEN` secret
- Trivy fails: Ensure Docker images are built and loaded before the scan step

### Slow builds
The pipeline uses GitHub Actions cache for npm dependencies and Docker layers. If builds are slow, check cache hit rates in the workflow logs.

### Oracle Cloud deployment fails
- **SSH connection refused**: Verify `OCI_HOST` IP is correct and security list allows SSH from GitHub Actions IPs
- **Docker not found**: Ensure Docker is installed on OCI instance (`sudo apt install docker.io docker-compose-v2`)
- **Permission denied**: Confirm `OCI_SSH_KEY` has correct permissions and matches the instance's `authorized_keys`
- **Container exits immediately**: Check container logs with `docker logs <container_name>` on the OCI instance
