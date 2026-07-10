# BrainBytes Metrics Catalog

Custom and system metrics exposed by the BrainBytes backend at /metrics.

| **Metric name** | **Type** | **Description** | **Labels** | **Example query** |
| --- | --- | --- | --- | --- |
| brainbytes_http_requests_total | Counter | Total HTTP requests received by the backend | method, route, status | sum(rate(brainbytes_http_requests_total[5m])) |
| brainbytes_active_sessions | Gauge | Number of chat requests currently being processed | (none) | brainbytes_active_sessions |
| brainbytes_ai_response_duration_seconds | Histogram | Time taken for the AI service to generate a response | subject | histogram_quantile(0.95, rate(brainbytes_ai_response_duration_seconds_bucket[5m])) |
| process_cpu_seconds_total | Counter | Total CPU time used by the backend process (default Node.js metric) | (none) | rate(process_cpu_seconds_total[5m]) |
| process_resident_memory_bytes | Gauge | Current memory used by the backend process (default Node.js metric) | (none) | process_resident_memory_bytes |

## Metrics by Category

| **Category** | **Metrics** | **Purpose** |
| --- | --- | --- |
| System | process_cpu_seconds_total, process_resident_memory_bytes | Default Node.js runtime health |
| Application | brainbytes_http_requests_total, brainbytes_active_sessions | API traffic and load |
| Business | brainbytes_ai_response_duration_seconds | Core tutoring feature performance |

## PromQL Query Reference

Useful queries for monitoring the BrainBytes application, with interpretation guidance.

| **Query** | **PromQL** | **What it shows** |
| --- | --- | --- |
| Request rate (5m) | sum(rate(brainbytes_http_requests_total[5m])) | Requests per second across all routes over the last 5 minutes. |
| Error rate | sum(rate(brainbytes_http_requests_total{status=~"5.."}[5m])) / sum(rate(brainbytes_http_requests_total[5m])) | Fraction of requests returning 5xx errors; near 0 is healthy. |
| Requests by route | sum by (route) (rate(brainbytes_http_requests_total[5m])) | Shows which endpoints get the most traffic. |
| Active sessions | brainbytes_active_sessions | Current number of chat requests being processed right now. |
| AI response p95 latency | histogram_quantile(0.95, rate(brainbytes_ai_response_duration_seconds_bucket[5m])) | 95% of AI responses complete within this time; watches for slow outliers. |
| AI response average latency | rate(brainbytes_ai_response_duration_seconds_sum[5m]) / rate(brainbytes_ai_response_duration_seconds_count[5m]) | Average AI response time over 5 minutes. |
| AI latency by subject | histogram_quantile(0.95, sum by (le, subject) (rate(brainbytes_ai_response_duration_seconds_bucket[5m]))) | Compares response speed across subjects (math, science, etc.). |
| Backend uptime | up{job="backend"} | 1 if Prometheus can reach the backend, 0 if it is down. |
| Memory usage | process_resident_memory_bytes | Current memory used by the backend process; watch for steady growth (leak). |
| CPU usage rate | rate(process_cpu_seconds_total[5m]) | Fraction of a CPU core the backend is using on average. |

## Alert Rules Documentation

Thresholds were chosen to catch real user-facing problems without triggering on normal short-term fluctuations. All alerts are grouped by severity (warning vs critical) and routed to the on-call channel; critical alerts (BackendDown) require immediate acknowledgment.

| **Alert** | **Threshold** | **Severity** | **Response procedure** |
| --- | --- | --- | --- |
| HighAIResponseLatency | p95 AI response > 5s for 2m | warning | AI responses feel slow to users; check Groq API status or network. |
| BackendDown | up{job="backend"} == 0 for 1m | critical | App is completely unavailable; restart backend container immediately. |
| HighErrorRate | 5xx errors > 5% of traffic for 5m | warning | Something is breaking in the API; check backend logs for stack traces. |

## Traffic Simulation Scenarios

Run with: `node traffic-simulator.js [normal|peak|error|quiet]`

| **Scenario** | **Configuration** | **Expected effect on metrics** |
| --- | --- | --- |
| Normal | 3 req/batch, 2s delay, 5% errors, 60s | Steady low request rate; error rate stays near 0; latency stable. |
| Peak | 15 req/batch, 0.5s delay, 10% errors, 60s | Request rate spikes sharply; active sessions gauge rises; possible latency increase. |
| Error spike | 5 req/batch, 1s delay, 60% errors, 30s | Error rate alert (HighErrorRate) should fire; 400 responses dominate. |
| Quiet | 1 req/batch, 5s delay, 2% errors, 60s | Very low traffic; simulates off-peak hours (e.g. late night in the Philippines). |
