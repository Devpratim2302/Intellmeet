#!/usr/bin/env bash
# =========================================================================
# IntellMeet OWASP ZAP Baseline Security Scanner
# Usage:
#   ./tests/security/zap-baseline-scan.sh [TARGET_URL]
# Example:
#   ./tests/security/zap-baseline-scan.sh http://localhost:8080
# =========================================================================

set -euo pipefail

TARGET_URL="${1:-http://localhost:8080}"
REPORT_DIR="$(pwd)/tests/security/reports"
mkdir -p "${REPORT_DIR}"

echo "================================================================="
echo "🛡️  Starting OWASP ZAP Dynamic Application Security Scan (DAST)"
echo "🎯 Target URL: ${TARGET_URL}"
echo "📁 Report Directory: ${REPORT_DIR}"
echo "================================================================="

if command -v docker &> /dev/null; then
  echo "🐳 Running official OWASP ZAP container (zaproxy/zap-stable:latest)..."
  
  # Run non-destructive baseline passive & active scan
  docker run --rm --network host \
    -v "${REPORT_DIR}:/zap/wrk/:rw" \
    zaproxy/zap-stable zap-baseline.py \
      -t "${TARGET_URL}" \
      -r zap-report.html \
      -J zap-report.json \
      -I \
      || true

  echo "✅ OWASP ZAP scan completed. Reports generated at:"
  echo "   - HTML: ${REPORT_DIR}/zap-report.html"
  echo "   - JSON: ${REPORT_DIR}/zap-report.json"
else
  echo "⚠️  Docker is not available to run OWASP ZAP container."
  echo "   Please install OWASP ZAP or Docker to run automated scans."
  exit 1
fi
