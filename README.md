# BrainBytes AI Tutoring Platform

## Project Overview
BrainBytes is an AI-powered tutoring platform designed to provide accessible academic assistance to Filipino students. This project implements the platform using modern DevOps practices and containerization.

## Team Members
- Mykyla Jaimie Valuenzuela - lr.mjvalenzuela@mmdc.mcl.edu.ph
- Denise Claire Monghit - lr.dcmonghit@mmdc.mcl.edu.ph
- Adrian San Juan - lr.asanjuan@mmdc.mcl.edu.ph
- Angelo Rafael Legaspi - lr.arlegaspi@mmdc.mcl.edu.ph
- Nicole Andrea Coloma - lr.nacoloma@mmdc.mcl.edu.ph

## Project Goals
- Implement a containerized application with proper networking
- Create an automated CI/CD pipeline using GitHub Actions
- Deploy the applicatin to Oracle Cloud Free Tier
- Set up monitoring and observability tools

## Technology Stack
|Layer|Technology|
|---|---|
|Frontend|Next.js|
|Backend|Node.js|
|Database|MongoDB Atlas|
|Containerization|Docker|
|CI/CD|GitHub Actions|
|Cloud Provider|Oracle Cloud Free Tier|
|Monitoring|Prometheus & Grafana|

## CI/CD Workflow
BrainBytes uses GitHub Actions to automate validation, build checks, security scanning, and deployment preparation. The workflows live in [`.github/workflows`](.github/workflows) and are organized by stage:

- [quality.yml](.github/workflows/quality.yml) runs on `push` and `pull_request` to `main` and `initial`, installs dependencies for both apps, runs ESLint, publishes JSON lint reports, and adds inline annotations to pull requests.
- [ci.yml](.github/workflows/ci.yml) runs the test suite for the frontend and backend on Node.js 18.x and 20.x, then uploads coverage artifacts.
- [build.yml](.github/workflows/build.yml) builds the Docker images, verifies the Docker Compose setup, and stores build artifacts. It ignores markdown and `docs/` changes on pushes.
- [deploy.yml](.github/workflows/deploy.yml) is a test-environment deployment scaffold triggered on `push` and manual dispatch. It currently uses placeholder deployment steps while the Oracle Cloud deployment flow is being completed.
- [security.yml](.github/workflows/security.yml) performs dependency auditing, Snyk checks, and Trivy container scans on a schedule, on push, and on manual dispatch.
- [main.yml](.github/workflows/main.yml) combines the lint, test, build, deploy, and security stages into a single end-to-end pipeline.

Typical flow:

1. A change is pushed to `main` or `initial`, or a pull request is opened against one of those branches.
2. Quality checks and linting run first so formatting and ESLint issues are caught early.
3. Tests run with coverage for both the frontend and backend.
4. Docker images are built and the Compose stack is smoke-tested.
5. Security scans and artifact uploads run to capture dependency or image risks.
6. The deployment workflow prepares the test environment, with Oracle Cloud deployment steps to be added when the production release flow is finalized.

## Workflow Purposes
Each workflow has a specific role in the delivery pipeline:

- `quality.yml` catches lint issues early and produces ESLint annotations plus JSON reports for the frontend and backend.
- `ci.yml` validates application behavior by running the frontend and backend test suites and collecting coverage outputs.
- `build.yml` checks whether both Docker images build successfully and whether the Docker Compose stack can start and stop cleanly.
- `deploy.yml` prepares a test deployment and records deployment metadata, but the deployment action itself is still a placeholder.
- `security.yml` checks dependencies and container images for known vulnerabilities with npm audit, Snyk, and Trivy.
- `main.yml` combines the full pipeline so a single run can cover linting, testing, build verification, deploy preparation, security scanning, and end-to-end testing.

## Manual Runs
Some workflows can be run manually from the GitHub Actions tab because they define `workflow_dispatch`:

- `main.yml`
- `build.yml`
- `deploy.yml`
- `security.yml`

To run one manually, open GitHub, go to **Actions**, select the workflow, then choose **Run workflow** and pick the branch you want to test.

Workflows without `workflow_dispatch` such as `quality.yml` and `ci.yml` run automatically on `push` and `pull_request`. If you need to rerun a failed job, use the **Re-run jobs** button from the workflow run page after the run is created.

## Status Badges
Workflow status badges are the small indicators you can place near the top of the README to show the latest result for a workflow on the default branch.

- A green badge means the latest run passed.
- A red badge means the latest run failed.
- A yellow or gray badge usually means the workflow is running, queued, or has not produced a recent result.

Badges are useful for quick visibility, but they only reflect the latest tracked run for the branch or workflow they point to. If you add them, keep them close to the project title so readers can see the current pipeline state immediately.

## Troubleshooting
If a workflow fails, start with the job logs in GitHub Actions and then check the matching local command in the affected app folder.

- If linting fails, run `npm ci` and `npm run lint:js` in both `brainbytes-multi-container/frontend` and `brainbytes-multi-container/backend`.
- If tests fail, run `npm test` locally in the same folder to reproduce the issue before checking the workflow log.
- If Docker build or Compose steps fail, verify Docker Desktop is running and the Compose files still match the service paths used in the workflows.
- If a security job fails, confirm the `SNYK_TOKEN` secret exists and that the image names in the Trivy step match the images produced by the build job.
- If the deploy job fails on the health check, remember that the current deploy script is still a placeholder and may not have a live service to probe yet.
- If a workflow cannot start manually, confirm that it includes `workflow_dispatch`; otherwise it must be triggered by a push, pull request, or a rerun from an existing workflow page.
