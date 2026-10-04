import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { register } from '../src/monitoring/metrics.js';
import { captureError } from '../src/monitoring/sentry.js';

describe('Prometheus Metrics & Sentry Error Monitoring', () => {
  const app = createApp();

  it('should expose GET /metrics with Prometheus text format', async () => {
    const res = await request(app).get('/metrics');

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('text/plain');
    expect(res.text).toContain('intellmeet_');
    expect(res.text).toContain('process_cpu_user_seconds_total');
  });

  it('should expose GET /api/metrics alias for reverse proxy routing', async () => {
    const res = await request(app).get('/api/metrics');

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('text/plain');
  });

  it('should record HTTP request count and duration when routes are accessed', async () => {
    // Hit /api/health to record a request
    await request(app).get('/api/health');

    const metricsRes = await request(app).get('/metrics');
    expect(metricsRes.text).toContain('intellmeet_http_requests_total');
    expect(metricsRes.text).toContain('route="/api/health"');
    expect(metricsRes.text).toContain('status_code="200"');
  });

  it('should safely handle Sentry error capture when DSN is not set (graceful fallback)', () => {
    expect(() => {
      captureError(new Error('Test harmless error'), { testContext: true });
    }).not.toThrow();
  });
});
