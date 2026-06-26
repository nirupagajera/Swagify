const fs = require('fs');
const path = require('path');

const resultsPath = path.join(process.cwd(), 'reports', 'results.json');
const outputDir = path.join(process.cwd(), 'reports', 'dashboard');
const outputPath = path.join(outputDir, 'index.html');

function readResults() {
  if (!fs.existsSync(resultsPath)) {
    return { suites: [] };
  }

  return JSON.parse(fs.readFileSync(resultsPath, 'utf8'));
}

function collectSpecs(suites, bucket = []) {
  for (const suite of suites ?? []) {
    for (const spec of suite.specs ?? []) {
      const tests = spec.tests ?? [];
      const passed = tests.every((test) => test.results?.some((result) => result.status === 'passed'));
      const failed = tests.some((test) => test.results?.some((result) => ['failed', 'timedOut', 'interrupted'].includes(result.status)));
      const skipped = tests.every((test) => test.results?.every((result) => result.status === 'skipped')) || tests.length === 0;

      bucket.push({
        title: spec.title,
        file: spec.file,
        status: failed ? 'failed' : skipped ? 'skipped' : passed ? 'passed' : 'unknown'
      });
    }

    collectSpecs(suite.suites, bucket);
  }

  return bucket;
}

function renderDashboard(specs) {
  const totals = specs.reduce(
    (acc, spec) => {
      acc[spec.status] = (acc[spec.status] ?? 0) + 1;
      acc.total += 1;
      return acc;
    },
    { total: 0, passed: 0, failed: 0, skipped: 0, unknown: 0 }
  );

  const passRate = totals.total === 0 ? 0 : Math.round((totals.passed / totals.total) * 100);
  const rows = specs
    .map(
      (spec) => `
        <tr>
          <td>${escapeHtml(spec.title)}</td>
          <td>${escapeHtml(spec.file ?? '')}</td>
          <td><span class="status ${spec.status}" data-testid="dashboard-status-${spec.status}">${spec.status}</span></td>
        </tr>`
    )
    .join('');

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Swagify Automation Dashboard</title>
  <style>
    :root { color-scheme: light; font-family: Arial, sans-serif; background: #f6f8fb; color: #172033; }
    body { margin: 0; padding: 32px; }
    main { max-width: 1120px; margin: 0 auto; }
    h1 { margin: 0 0 20px; font-size: 28px; letter-spacing: 0; }
    .metrics { display: grid; grid-template-columns: repeat(5, minmax(120px, 1fr)); gap: 12px; margin-bottom: 24px; }
    .metric { background: white; border: 1px solid #d9e2ef; border-radius: 8px; padding: 16px; }
    .metric span { display: block; color: #52627a; font-size: 13px; margin-bottom: 8px; }
    .metric strong { font-size: 26px; }
    table { width: 100%; border-collapse: collapse; background: white; border: 1px solid #d9e2ef; border-radius: 8px; overflow: hidden; }
    th, td { padding: 12px 14px; border-bottom: 1px solid #e8eef6; text-align: left; font-size: 14px; }
    th { background: #eef3f9; color: #39465a; }
    .status { border-radius: 999px; padding: 4px 10px; font-weight: 700; text-transform: uppercase; font-size: 12px; }
    .passed { background: #d9f7e7; color: #12643a; }
    .failed { background: #ffe0df; color: #9b1c1c; }
    .skipped { background: #fff0c2; color: #715100; }
    .unknown { background: #e6ebf2; color: #41516a; }
    @media (max-width: 760px) { body { padding: 18px; } .metrics { grid-template-columns: repeat(2, 1fr); } table { display: block; overflow-x: auto; } }
  </style>
</head>
<body>
  <main>
    <h1 data-testid="dashboard-title">Swagify Automation Dashboard</h1>
    <section class="metrics" aria-label="Test result metrics">
      <div class="metric" data-testid="dashboard-total-count"><span>Total</span><strong>${totals.total}</strong></div>
      <div class="metric" data-testid="dashboard-passed-count"><span>Passed</span><strong>${totals.passed}</strong></div>
      <div class="metric" data-testid="dashboard-failed-count"><span>Failed</span><strong>${totals.failed}</strong></div>
      <div class="metric" data-testid="dashboard-skipped-count"><span>Skipped</span><strong>${totals.skipped}</strong></div>
      <div class="metric" data-testid="dashboard-pass-rate"><span>Pass Rate</span><strong>${passRate}%</strong></div>
    </section>
    <table data-testid="dashboard-results-table">
      <thead><tr><th>Test Case</th><th>File</th><th>Status</th></tr></thead>
      <tbody>${rows || '<tr><td colspan="3">No test results found yet.</td></tr>'}</tbody>
    </table>
  </main>
</body>
</html>`;
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

fs.mkdirSync(outputDir, { recursive: true });
fs.writeFileSync(outputPath, renderDashboard(collectSpecs(readResults().suites)));
console.log(`Dashboard generated at ${outputPath}`);
