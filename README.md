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
- Deploy the application to Railway.app
- Set up monitoring and observability tools

## Technology Stack
|Layer|Technology|
|---|---|
|Frontend|Next.js|
|Backend|Node.js|
|Database|MongoDB Atlas|
|Containerization|Docker|
|CI/CD|GitHub Actions|
|Cloud Provider|Railway.app|
|Monitoring|Prometheus & Grafana|

## CI/CD Workflow
BrainBytes uses GitHub Actions to automate validation, build checks, security scanning, and deployment preparation.

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

## Troubleshooting
If a workflow fails, start with the job logs in GitHub Actions and then check the matching local command in the affected app folder.

- If linting fails, run `npm ci` and `npm run lint:js` in both `brainbytes-multi-container/frontend` and `brainbytes-multi-container/backend`.
- If tests fail, run `npm test` locally in the same folder to reproduce the issue before checking the workflow log.
- If Docker build or Compose steps fail, verify Docker Desktop is running and the Compose files still match the service paths used in the workflows.
- If a security job fails, confirm the `SNYK_TOKEN` secret exists and that the image names in the Trivy step match the images produced by the build job.
- If the deploy job fails on the health check, remember that the current deploy script is still a placeholder and may not have a live service to probe yet.
- If a workflow cannot start manually, confirm that it includes `workflow_dispatch`; otherwise it must be triggered by a push, pull request, or a rerun from an existing workflow page.
