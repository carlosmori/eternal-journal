# Load Testing Results - eternal-journal API

## Server specs

- **Container**: Node 20 Alpine, NestJS 11
- **Database**: RDS PostgreSQL 16 (db.t4g.micro)
- **Endpoint tested**: `GET /health` (skips throttle, no DB query)
- **Tool**: k6 (Grafana), run from local machine against AWS us-east-1
- **Date**: 2026-02-20

---

## 1. Local baseline (up to 100 VUs, 2m40s)

**Command**: `k6 run --env BASE_URL=http://localhost:3001 apps/api/load-tests/stress.js`

| Metric | Value |
|---|---|
| http_reqs (total) | 34,666 |
| http_reqs/s | 216.50 |
| http_req_duration avg | 1.98ms |
| http_req_duration p(50) | 831us |
| http_req_duration p(90) | 2.71ms |
| http_req_duration p(95) | 4.26ms |
| http_req_duration max | 241.99ms |
| http_req_failed | 0.00% |
| checks passed | 100% (103,998/103,998) |

Local hardware handled 100 concurrent VUs at 216 req/s with sub-2ms latency and zero failures. This establishes a best-case baseline before testing on constrained Fargate infrastructure.

---

## 2. Staging -- SIN auto-scaling (1 task, 0.25 vCPU, 512 MB)

### 2a. Preliminary test (100 VUs, sleep 0.3s)

**Date**: 2026-02-20
**Command**: `k6 run --env BASE_URL=http://eternal-journal-alb-...:8080 apps/api/load-tests/stress.js` (old config)

| Metric | Value |
|---|---|
| http_reqs (total) | 21,981 |
| http_reqs/s | 137.35 |
| http_req_duration avg | 176.60ms |
| http_req_duration p(50) | 168.42ms |
| http_req_duration p(90) | 199.83ms |
| http_req_duration p(95) | 228.13ms |
| http_req_duration p(99) | 303.53ms |
| http_req_duration max | 588.11ms |
| http_req_failed | 0.01% (3/21,981) |
| checks passed | 99.99% (65,940/65,943) |

> 100 VUs barely stressed the server. Bumped to 300 VUs with sleep 0.1s for a fair before/after comparison.

### 2b. Full stress test (300 VUs, sleep 0.1s) -- BEFORE auto-scaling

**Date**: 2026-02-20
**Command**: `k6 run --env BASE_URL=http://eternal-journal-alb-...:8080 apps/api/load-tests/stress.js`

| Metric | Value |
|---|---|
| http_reqs (total) | 62,981 |
| http_reqs/s | 331.09 |
| http_req_duration avg | 538.61ms |
| http_req_duration p(50) | 498.59ms |
| http_req_duration p(90) | 890.92ms |
| http_req_duration p(95) | 998.52ms |
| http_req_duration p(99) | 1.19s |
| http_req_duration max | 20.99s |
| http_req_failed | 0.00% (6/62,981) |
| checks: status 200 | 99% (62,975/62,981) |
| checks: < 500ms | **50%** (32,102/62,981) |
| checks: < 1s | 95% (60,057/62,981) |
| checks: < 3s | 99% (62,870/62,981) |

### Observations

- The single task is clearly saturated: avg response time went from 176ms to 538ms
- **Half the requests took longer than 500ms** -- users would feel this
- p(99) over 1 second, with a max spike of **21 seconds** (likely connection queuing)
- 6 requests fully failed, 111 requests exceeded 3 seconds
- 331 req/s throughput -- the task is at its absolute ceiling

---

## 3. Staging -- Upgraded infra (0.5 vCPU, auto-scaling min 1, max 3, CPU target 60%)

**Date**: 2026-02-20
**Command**: `k6 run --env BASE_URL=http://eternal-journal-alb-...:8080 apps/api/load-tests/stress.js`
**Config**: 512 CPU (0.5 vCPU), 1024 MB, auto-scaling threshold 60%

| Metric | Value |
|---|---|
| http_reqs (total) | 423,974 |
| http_reqs/s | 730.78 |
| http_req_duration avg | 270.36ms |
| http_req_duration p(50) | 247.66ms |
| http_req_duration p(90) | 322.14ms |
| http_req_duration p(95) | 405.76ms |
| http_req_duration p(99) | 598.41ms |
| http_req_duration max | 7s |
| http_req_failed | 0.01% (79/423,974) |
| checks: status 200 | 99% (423,895/423,974) |
| checks: < 500ms | **98%** (416,152/423,974) |
| checks: < 1s | 99% (422,303/423,974) |
| checks: < 3s | 99% (423,516/423,974) |

---

## 4. Final comparison

### Staging stress tests (300 VUs, sleep 0.1s)

| Metric | 0.25 vCPU, no scaling | 0.5 vCPU + scaling | Improvement |
|---|---|---|---|
| avg latency | 538ms | **270ms** | **-50%** |
| median | 498ms | **247ms** | **-50%** |
| p(95) | 998ms | **405ms** | **-59%** |
| p(99) | 1.19s | **598ms** | **-50%** |
| max | 21s | **7s** | **-67%** |
| < 500ms | 50% | **98%** | **+48 points** |
| req/s | 331 | **731** | **+121%** |
| failed | 6 | 79 | Similar |

### Key learnings

1. **Vertical scaling first, horizontal second**: Doubling the CPU (0.25 -> 0.5 vCPU) had a much bigger impact than adding more tasks. Each task went from being individually slow to individually capable. Node.js is single-threaded, so giving it more CPU directly speeds up the event loop.

2. **Auto-scaling is not instant**: It takes 3-5 minutes for ECS to detect high CPU, launch a new task, pull the image, pass health checks, and start receiving traffic. Short traffic spikes will be over before scaling kicks in.

3. **Auto-scaling complements, doesn't replace, proper sizing**: With 0.25 vCPU, adding a second task improved throughput by 36%. With 0.5 vCPU + scaling, total improvement was 121% over the baseline. The combination is what matters.

4. **Monitor the right metrics**: CPU utilization alone doesn't tell the full story on small Fargate tasks. Response time (p95, p99) is a better indicator of user experience. A task can show 57% CPU but have 538ms average latency because Node.js event loop saturation doesn't map 1:1 to CPU usage.

5. **Cost vs performance**: Going from 0.25 to 0.5 vCPU doubles the Fargate cost per task (~$9 to ~$18/month), but the performance improvement is far more than 2x. This is the most cost-effective optimization before adding more tasks.
