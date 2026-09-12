import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '10s', target: 50 },
    { duration: '20s', target: 200 },
    { duration: '30s', target: 500 },
    { duration: '10s', target: 0 },
  ],
  thresholds: {
    // Evalúa la tasa de fallos basándose en tu check personalizado
    checks: ['rate>0.99'],
    http_req_duration: ['p(95)<500'],
  },
};

export default function () {
  const res = http.get('http://localhost:3000/api/auth/me');

  check(res, {
    'status es 200 o 401': (r) => r.status === 200 || r.status === 401,
  });

  sleep(1);
}