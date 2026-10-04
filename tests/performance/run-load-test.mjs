/**
 * IntellMeet 50+ Concurrent Users Load Test Runner
 * Measures Throughput (RPS), Latencies (p50, p95, p99), Error Rates, and Bottlenecks.
 */
import fs from 'fs';
import path from 'path';

const BASE_URL = process.env.TARGET_URL || 'http://localhost:8080';
const CONCURRENT_USERS = parseInt(process.env.CONCURRENT_USERS || '50', 10);
const REQUESTS_PER_USER = parseInt(process.env.REQUESTS_PER_USER || '6', 10);

console.log('===============================================================');
console.log(`🚀 Starting IntellMeet Load Test: ${CONCURRENT_USERS} Concurrent Users`);
console.log(`🎯 Target Base URL: ${BASE_URL}`);
console.log(`🔄 Total Planned Operations: ${CONCURRENT_USERS * REQUESTS_PER_USER}`);
console.log('===============================================================');

// Pre-register test user to obtain JWT token for authenticated operations
async function getAuthToken() {
  const email = `loadtest_${Date.now()}@intellmeet.io`;
  const password = 'Password123!';

  try {
    const regRes = await fetch(`${BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Load Tester', email, password }),
    });

    const regData = await regRes.json();
    if (regData?.data?.accessToken) {
      return regData.data.accessToken;
    }
  } catch (err) {
    console.warn('Register token fetch warning:', err.message);
  }
  return null;
}

async function runSingleUserSession(userId, token) {
  const sessionResults = [];
  const headers = { 'Content-Type': 'application/json' };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const tasks = [
    { name: 'GET /api/health', method: 'GET', url: `${BASE_URL}/api/health` },
    { name: 'GET /metrics', method: 'GET', url: `${BASE_URL}/metrics` },
    { name: 'POST /api/meetings', method: 'POST', url: `${BASE_URL}/api/meetings`, body: JSON.stringify({ title: `Stress Meeting ${userId}` }) },
    { name: 'GET /api/meetings', method: 'GET', url: `${BASE_URL}/api/meetings` },
    { name: 'GET /api/tasks', method: 'GET', url: `${BASE_URL}/api/tasks` },
    { name: 'GET /api/notifications', method: 'GET', url: `${BASE_URL}/api/notifications` },
  ];

  for (const task of tasks) {
    const start = performance.now();
    try {
      const res = await fetch(task.url, {
        method: task.method,
        headers,
        body: task.body,
      });
      const durationMs = performance.now() - start;
      sessionResults.push({
        endpoint: task.name,
        status: res.status,
        success: res.status >= 200 && res.status < 400,
        durationMs,
      });
    } catch (error) {
      const durationMs = performance.now() - start;
      sessionResults.push({
        endpoint: task.name,
        status: 0,
        success: false,
        error: error.message,
        durationMs,
      });
    }
  }
  return sessionResults;
}

async function executeLoadTest() {
  const authToken = await getAuthToken();
  if (!authToken) {
    console.log('⚠️  Could not retrieve dedicated auth token. Testing public endpoints...');
  }

  const startTime = performance.now();

  // Launch 50+ concurrent users simultaneously
  const userPromises = [];
  for (let i = 1; i <= CONCURRENT_USERS; i++) {
    userPromises.push(runSingleUserSession(i, authToken));
  }

  const allUserResults = await Promise.all(userPromises);
  const totalDurationMs = performance.now() - startTime;
  const flatResults = allUserResults.flat();

  // Aggregate statistics
  const totalRequests = flatResults.length;
  const successfulRequests = flatResults.filter((r) => r.success).length;
  const failedRequests = totalRequests - successfulRequests;
  const durations = flatResults.map((r) => r.durationMs).sort((a, b) => a - b);

  const minLatency = durations[0].toFixed(2);
  const maxLatency = durations[durations.length - 1].toFixed(2);
  const avgLatency = (durations.reduce((sum, d) => sum + d, 0) / durations.length).toFixed(2);
  const p50 = durations[Math.floor(durations.length * 0.5)].toFixed(2);
  const p95 = durations[Math.floor(durations.length * 0.95)].toFixed(2);
  const p99 = durations[Math.floor(durations.length * 0.99)].toFixed(2);
  const throughputRps = ((totalRequests / (totalDurationMs / 1000))).toFixed(2);
  const errorRatePercent = (((failedRequests / totalRequests) * 100)).toFixed(2);

  // Group by endpoint
  const endpointStats = {};
  for (const r of flatResults) {
    if (!endpointStats[r.endpoint]) {
      endpointStats[r.endpoint] = { total: 0, success: 0, failed: 0, durations: [] };
    }
    endpointStats[r.endpoint].total++;
    if (r.success) endpointStats[r.endpoint].success++;
    else endpointStats[r.endpoint].failed++;
    endpointStats[r.endpoint].durations.push(r.durationMs);
  }

  console.log('\n===============================================================');
  console.log('📊 INTELLMEET LOAD TEST SUMMARY REPORT');
  console.log('===============================================================');
  console.log(`Concurrent Virtual Users:   ${CONCURRENT_USERS}`);
  console.log(`Total Requests Processed:   ${totalRequests}`);
  console.log(`Successful Requests (2xx):  ${successfulRequests}`);
  console.log(`Failed Requests:            ${failedRequests} (${errorRatePercent}%)`);
  console.log(`Test Execution Duration:    ${(totalDurationMs / 1000).toFixed(2)} seconds`);
  console.log(`Aggregate Throughput:       ${throughputRps} req/sec`);
  console.log(`Latency (Min / Avg / Max):  ${minLatency}ms / ${avgLatency}ms / ${maxLatency}ms`);
  console.log(`Percentiles (p50 / p95 / p99): ${p50}ms / ${p95}ms / ${p99}ms`);
  console.log('---------------------------------------------------------------');
  console.log('Endpoint Breakdown:');
  for (const [endpoint, stats] of Object.entries(endpointStats)) {
    const avg = (stats.durations.reduce((a, b) => a + b, 0) / stats.durations.length).toFixed(2);
    console.log(`  - ${endpoint.padEnd(25)} | Total: ${stats.total.toString().padStart(3)} | OK: ${stats.success.toString().padStart(3)} | Err: ${stats.failed.toString().padStart(2)} | Avg: ${avg}ms`);
  }
  console.log('===============================================================');

  const reportData = {
    timestamp: new Date().toISOString(),
    concurrentUsers: CONCURRENT_USERS,
    totalRequests,
    successfulRequests,
    failedRequests,
    errorRatePercent: parseFloat(errorRatePercent),
    durationSeconds: parseFloat((totalDurationMs / 1000).toFixed(2)),
    throughputRps: parseFloat(throughputRps),
    latencyMs: {
      min: parseFloat(minLatency),
      avg: parseFloat(avgLatency),
      max: parseFloat(maxLatency),
      p50: parseFloat(p50),
      p95: parseFloat(p95),
      p99: parseFloat(p99),
    },
    endpointStats,
  };

  fs.writeFileSync(
    path.resolve(process.cwd(), 'tests/performance/load-test-results.json'),
    JSON.stringify(reportData, null, 2)
  );
  console.log('💾 Results saved to tests/performance/load-test-results.json\n');
}

executeLoadTest().catch((err) => {
  console.error('Fatal load test failure:', err);
  process.exit(1);
});
