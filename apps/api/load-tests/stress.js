import http from 'k6/http';
import { check, sleep } from 'k6';

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3001';

export const options = {
  stages: [
    { duration: '20s', target: 50 },
    { duration: '30s', target: 150 },
    { duration: '30s', target: 300 },
    { duration: '8m', target: 300 },
    { duration: '20s', target: 0 },
  ],
  thresholds: {
    http_req_duration: ['p(99)<5000'],
  },
};

export default function () {
  const res = http.get(`${BASE_URL}/health`);
  check(res, {
    'status is 200': (r) => r.status === 200,
    'response time < 500ms': (r) => r.timings.duration < 500,
    'response time < 1s': (r) => r.timings.duration < 1000,
    'response time < 3s': (r) => r.timings.duration < 3000,
  });
  sleep(0.1);
}
