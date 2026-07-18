# BrainBytes Monitoring Architecture

## How the Pieces Integrate

1. **Instrumentation** — the Express backend (`server.js`) uses `prom-client` to expose a `/metrics` endpoint in Prometheus text format, combining custom application metrics (request counts, AI response duration, active sessions) with default Node.js process metrics (CPU, memory, event loop lag, GC).
2. **Collection** — Prometheus scrapes `/metrics` on a configured interval (5s for the backend job specifically, overriding the 15s global default) and continuously evaluates the rules in `alert_rules.yml` against the collected time series.
3. **Storage** — metrics are stored in Prometheus's local TSDB using default retention settings.
4. **Visualization** — Grafana connects to Prometheus as its sole data source and renders the single consolidated BrainBytes Monitoring Dashboard.
5. **Alerting** — Prometheus/Grafana evaluate alert conditions and, when a threshold is breached for its configured duration, fire a notification to the configured channel (webhook for local testing; a real channel such as email for production use).

## Local vs. Cloud Environment

This project runs in two environments with different networking models, which affects how Prometheus and Grafana are configured in each:

- **Local (Docker Compose):** services reach each other by Docker Compose service name (e.g., `backend:3000`, `mongo:27017`) via Docker's built-in DNS. Grafana provisioning files are bind-mounted directly from the repo.
- **Railway (cloud):** Railway does not run `docker-compose.yml` directly — each service is deployed independently, and inter-service communication uses Railway's private networking (`<service-name>.railway.internal`). Grafana's provisioning config must be baked into its Docker image at build time (via a dedicated `Dockerfile`) rather than bind-mounted, since Railway has no equivalent to Compose's bind mounts.

**Important:** the Prometheus scrape target in `prometheus.yml` must point at whichever backend instance is actually receiving traffic in that environment — a local Prometheus must scrape the local backend, and a Railway-deployed Prometheus must scrape the Railway backend. Mismatches here are silent: every component reports healthy individually, while the dashboard simply never reflects real activity, because it's watching the wrong instance entirely.

## Retention and Performance Considerations

- Prometheus's default retention window is used; this is sufficient for short-term monitoring and course-project timelines but does not preserve long-term historical trends. Extend `--storage.tsdb.retention.time` if multi-month comparisons become necessary.
- The dashboard refreshes every 30 seconds by default — reasonable for a small free-tier deployment; increase the interval if Grafana's own resource usage becomes a meaningful fraction of what's being monitored.
- `sample_limit: 1000` is set on the backend scrape job as a safety cap, well above the actual number of exposed series, to prevent an unexpected metric cardinality explosion from overwhelming Prometheus.

## Security Measures

- Grafana's admin credentials are set via environment variables (`GF_SECURITY_ADMIN_USER`, `GF_SECURITY_ADMIN_PASSWORD`) rather than hardcoded into any committed config file.
- `GF_USERS_ALLOW_SIGN_UP=false` prevents self-service account creation on the Grafana instance.
- On Railway, Prometheus has no public domain generated — it's reachable only via private networking from Grafana, reducing its exposed attack surface. Only Grafana is exposed publicly, and only on the port it actually needs.
- The `alert-test-helper.js` local testing tool has rate limiting applied to its CPU/error-triggering endpoints (`express-rate-limit`) specifically because a security scan (CodeQL) flagged unrestricted expensive operations as a denial-of-service risk.

## Troubleshooting Guide

1. **Dashboard panels show "No data"**
- Cause: Prometheus is scraping the wrong backend instance.
- If you're running both a local Docker Compose backend and a Railway-deployed backend, it's easy for Prometheus's `scrape_configs` target to point at one while you're sending test traffic to the other. Every component reports "healthy" individually — the target shows UP, the backend responds fine — but the dashboard shows nothing, because Prometheus is faithfully watching an instance that never received any traffic.
- How to check: open `<prometheus-url>/targets` and confirm both the target address and its `UP` status. Then hit that exact backend's `/metrics` endpoint directly and confirm it shows the activity you expect (e.g., `status="201"` entries, non-empty histograms) before assuming the dashboard query itself is wrong.

2. **A specific metric does not show any data**
- Check whether the metric has ever actually been observed at all. For histograms in particular (`prom-client`), no `_bucket`/`_sum`/`_count` lines appear in `/metrics` until at least one observation has been recorded — the metric is completely absent from the scrape output, not just zero.

3. **A gauge (e.g., "Active Sessions") always reads 0 even though it should be nonzero sometimes**
- This is often correct behavior, not a bug — check how the gauge is actually implemented in the application code. If requests typically complete in well under a second, and Prometheus's scrape interval is several seconds, the odds of a scrape landing during that brief window are low. This will read 0 almost always under light, fast traffic — it requires either genuinely slow requests or high concurrency to reliably observe a nonzero value.

4. **Heatmap panel throws a JavaScript error (e.g., "Cannot read properties of undefined")**
- This has been observed specifically when the underlying Prometheus query returns a completely empty result — no time series at all, as opposed to time series with zero values. Grafana's heatmap panel (version 9.5.2) does not appear to handle a fully empty response gracefully.
- Fix by ensuring that the underlying metric actually has data before troubleshooting the panel itself. The error most likely resolves once real data exists. If a heatmap panel remains fragile with genuinely sparse/low-volume data (common in a low-traffic test environment), consider replacing it with a **table** panel instead, which degrades gracefully to fewer rows rather than crashing.

5. **Railway build fails with "COPY ... not found" for a Dockerfile that looks correct**
- Cause: the service's **Root Directory** setting isn't pointed at the folder containing the Dockerfile. Without it, Railway builds using the whole repository as context, so relative `COPY` paths inside the Dockerfile (which assume the build context is a specific subfolder) fail immediately.
- Fix: set the service's **Settings → Build → Root Directory** to the exact subfolder containing that Dockerfile (e.g. `brainbytes-multi-container/grafana`).

6. **Railway service shows "online" but the public URL returns a 502**
- A 502 from Railway means its proxy is reachable but nothing valid responded behind it. Check, in order:
1. Deployment logs — is the app actually running, or crash-looping? (See the permissions issue above for a Grafana-specific example.)
2. Deployment status — still "Building"/"Deploying" rather than fully "Active"?
3. Target port — confirm Railway is proxying to the port the app actually listens on (Grafana: 3000).

7. **Grafana can't reach a webhook contact point at `http://localhost:8080/...`**
- Cause: Grafana is running inside a container. `localhost` from its perspective refers to the Grafana container itself, not your host machine where the test helper script is actually listening.
- Fix: use `http://host.docker.internal:8080/...` instead.
- Works immediately on Docker Desktop (Mac/Windows).
- On native Linux Docker, add to the Grafana service in `docker-compose.yml`:
  ```yaml
  extra_hosts:
    - "host.docker.internal:host-gateway"
  ```
- Also confirm the receiving script (e.g. `alert-test-helper.js`) is actually running at the moment you test the contact point — it's not a persistent service unless you set it up as one.

8. **`TypeError: fetch is not a function` in a Node.js script**
- Cause: `node-fetch` v3+ is ESM-only and cannot be loaded via `require()`. If a script does `const fetch = require('node-fetch')`, this fails silently in a way that only surfaces when `fetch(...)` is actually called.
- Fix: if running Node 18+, remove the `node-fetch` import entirely — `fetch` is available as a global built-in. Otherwise, install the older CommonJS-compatible version: `npm install node-fetch@2`.

9. **MongoDB container crashes immediately after starting (exit code 62)**
- Symptoms in logs:
    ```
    "Wrong mongod version","attr":{"error":"UPGRADE PROBLEM: Found an invalid featureCompatibilityVersion document... Invalid feature compatibility version value '4.4'; expected '6.0' or '6.3' or '7.0'"
    ```
- Cause: the Docker named volume backing MongoDB's data directory contains files from a much older MongoDB major version than the image currently configured. MongoDB requires stepping through each major version in sequence rather than jumping directly across several versions.
- Fix: (if the local data doesn't need to be preserved):**
    ```
    docker-compose down
    docker volume rm <project>_mongo-data
    docker-compose up -d
    ```
    This lets the new version initialize a clean data directory. Since the backend container then loses its ability to resolve `mongo` as a hostname while MongoDB is crash-looping (the network endpoint disappears when the container exits), this issue often surfaces as a *separate-looking* `ENOTFOUND mongo` DNS error in backend logs — the DNS error is a downstream symptom, not the root cause.

10. **Security scanner (CodeQL) flags "missing rate limiting" on a route**
- Cause: any route handler doing "expensive" work (spawning processes, firing bulk outbound requests, heavy filesystem/DB operations) without a rate limit is flagged as a potential denial-of-service vector, regardless of whether the route is public-facing or an internal testing tool.
- Fix: add `express-rate-limit` middleware to the flagged route(s):
```javascript
const rateLimit = require('express-rate-limit');
const limiter = rateLimit({ windowMs: 60 * 1000, max: 5 });
app.get('/expensive-route', limiter, (req, res) => { ... });
```

