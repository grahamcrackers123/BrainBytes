# BrainBytes Dashboard Catalog

## BrainBytes Monitoring Dashboard

**File:** `grafana/dashboards/brainbytes-monitoring.json`

### Layout and Panels

**Top row — at-a-glance health:**

| Panel | Type | What it shows |
|---|---|---|
| Application Status | Stat | 1 = backend reachable, 0 = down (`up{job="backend"}`) |
| CPU Usage | Gauge | % of one CPU core used by the backend process, colored green/yellow/red |
| Memory Usage | Gauge | Backend resident memory in bytes, colored green/yellow/red |
| Error Rate | Gauge | Combined 4xx+5xx error percentage over the last 5 minutes |

**Middle row — traffic and performance trends:**

| Panel | Type | What it shows |
|---|---|---|
| Request Count | Time series | Total request rate across all routes |
| Active Sessions | Time series | Concurrent chat requests currently being processed (a load indicator, not a persistent user session count) |
| AI Response Time | Time series | Average AI response duration per subject |

**Bottom row — detail and diagnostics:**

| Panel | Type | What it shows |
|---|---|---|
| Peak Request Rate | Stat | Highest request rate observed in the last 24 hours |
| API Response Distribution | Pie Chart | Average AI response time broken down by status codes (200, 201, 400, etc.) |
| System Information | Table | Combined snapshot: backend status, memory, CPU rate, and active sessions in one row |

### Design Notes

- **Gauge thresholds are intentionally matched to alert thresholds** — what the team sees as "yellow" or "red" on screen is the same threshold that fires a warning or critical alert, so there are no surprises between the dashboard and the alerting system.
- **"Active Sessions" is a concurrency indicator, not a session-duration or user-count metric** — the underlying gauge only reflects requests currently in flight, incremented and decremented within a single request's lifecycle. It will frequently read 0 between scrapes even under normal use; this is expected, not a bug.

### Screenshot
https://drive.google.com/file/d/1512wo_g4Z4Zjc4wByIhlmPd5m4iQMp9D/view?usp=sharing 

