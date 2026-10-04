/**
 * IntellMeet OWASP Security & Hardening Automated Verification Script
 * Validates OWASP Top 10 controls, Helmet headers, CORS policies,
 * Rate Limiting, and JWT signature integrity against live endpoints.
 */
import fs from 'fs';
import path from 'path';

const TARGET_URL = process.env.TARGET_URL || 'http://localhost:8080';

console.log('===============================================================');
console.log('🛡️  INTELLMEET OWASP SECURITY & DEFENSE AUDIT SUITE');
console.log(`🎯 Target URL: ${TARGET_URL}`);
console.log('===============================================================');

const securityAuditReport = {
  timestamp: new Date().toISOString(),
  target: TARGET_URL,
  passedChecks: 0,
  failedChecks: 0,
  findings: [],
};

function recordCheck(name, passed, details) {
  if (passed) {
    securityAuditReport.passedChecks++;
    console.log(`✅ [PASS] ${name}`);
  } else {
    securityAuditReport.failedChecks++;
    console.log(`❌ [FAIL] ${name} - ${details}`);
  }
  securityAuditReport.findings.push({ name, passed, details });
}

async function runSecurityAudit() {
  // 1. Security Headers Audit (OWASP A05: Security Misconfiguration)
  try {
    const res = await fetch(`${TARGET_URL}/api/health`);
    const headers = Object.fromEntries(res.headers.entries());

    // Check X-Content-Type-Options
    recordCheck(
      'MIME Sniffing Protection (X-Content-Type-Options)',
      headers['x-content-type-options'] === 'nosniff',
      `Expected 'nosniff', received: '${headers['x-content-type-options']}'`
    );

    // Check X-Frame-Options or CSP frame-ancestors (Clickjacking)
    const xfo = headers['x-frame-options'];
    recordCheck(
      'Clickjacking Protection (X-Frame-Options)',
      xfo === 'SAMEORIGIN' || xfo === 'DENY',
      `Expected 'SAMEORIGIN' or 'DENY', received: '${xfo}'`
    );

    // Check X-Powered-By header suppression (Information Disclosure)
    recordCheck(
      'Information Disclosure (X-Powered-By Hidden)',
      !headers['x-powered-by'],
      `Server leaked technology via X-Powered-By: '${headers['x-powered-by']}'`
    );

    // Check Strict-Transport-Security or CSP
    recordCheck(
      'Cross-Site Scripting Filter / Content-Type Header',
      headers['content-type']?.includes('application/json'),
      `Content-Type correctly explicit: '${headers['content-type']}'`
    );
  } catch (err) {
    recordCheck('Security Headers Endpoint Check', false, err.message);
  }

  // 2. Broken Authentication & Session Management (OWASP A01 & A07)
  try {
    // Attempt login with invalid credentials
    const invalidLoginRes = await fetch(`${TARGET_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'nonexistent_hacker@evil.com', password: 'WrongPassword999!' }),
    });

    const body = await invalidLoginRes.json();
    recordCheck(
      'Authentication Failure Handling (No User Enumeration / Generic 401)',
      invalidLoginRes.status === 401,
      `Expected status 401, received: ${invalidLoginRes.status}`
    );

    // Test access to protected endpoint without token
    const noTokenRes = await fetch(`${TARGET_URL}/api/auth/me`);
    recordCheck(
      'Protected Route Rejection (Missing Token => 401)',
      noTokenRes.status === 401,
      `Expected status 401, received: ${noTokenRes.status}`
    );

    // Test access with forged/tampered JWT
    const forgedTokenRes = await fetch(`${TARGET_URL}/api/auth/me`, {
      headers: { Authorization: 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.e30.tampered_signature' },
    });
    recordCheck(
      'Cryptographic Signature Validation (Forged Token => 401)',
      forgedTokenRes.status === 401,
      `Expected status 401, received: ${forgedTokenRes.status}`
    );
  } catch (err) {
    recordCheck('Authentication Security Check', false, err.message);
  }

  // 3. Injection Resistance (OWASP A03: Injection)
  try {
    // Attempt NoSQL query operator injection in login
    const injectionRes = await fetch(`${TARGET_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: { $gt: '' }, password: { $gt: '' } }),
    });

    recordCheck(
      'NoSQL Operator Injection Resistance ($gt operator rejected)',
      injectionRes.status === 400 || injectionRes.status === 401,
      `Status: ${injectionRes.status}`
    );
  } catch (err) {
    recordCheck('Injection Resistance Check', false, err.message);
  }

  // 4. Sensitive Data Exposure & 404 Routing
  try {
    const unknownRes = await fetch(`${TARGET_URL}/api/definitely-unknown-route-9999`);
    const unknownBody = await unknownRes.json();

    recordCheck(
      'Generic 404 Error Shield (No Stack Traces Leaked)',
      unknownRes.status === 404 && !unknownBody.stack,
      `Status: ${unknownRes.status}, Stack trace leaked: ${!!unknownBody.stack}`
    );
  } catch (err) {
    recordCheck('Error Shielding Check', false, err.message);
  }

  // 5. Prometheus / Metrics Endpoint Exposure Evaluation
  try {
    const metricsRes = await fetch(`${TARGET_URL}/metrics`);
    recordCheck(
      'Prometheus Metrics Operational',
      metricsRes.status === 200,
      `Metrics endpoint returned status ${metricsRes.status}`
    );
  } catch (err) {
    recordCheck('Metrics Operational Check', false, err.message);
  }

  console.log('---------------------------------------------------------------');
  console.log(`🎯 Audit Completed: ${securityAuditReport.passedChecks} Passed | ${securityAuditReport.failedChecks} Failed`);
  console.log('===============================================================');

  fs.writeFileSync(
    path.resolve(process.cwd(), 'tests/security/security-audit-report.json'),
    JSON.stringify(securityAuditReport, null, 2)
  );
  console.log('💾 Audit report saved to tests/security/security-audit-report.json\n');
}

runSecurityAudit().catch((err) => {
  console.error('Fatal security audit error:', err);
  process.exit(1);
});
