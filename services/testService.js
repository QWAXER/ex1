const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawn } = require('child_process');
const { CliError } = require('../utils/errors');

function readCoverage(cwd) {
  const file = path.join(cwd, 'coverage', 'coverage-summary.json');

  if (!fs.existsSync(file)) {
    return null;
  }

  try {
    const summary = JSON.parse(fs.readFileSync(file, 'utf8'));
    const total = summary.total;

    if (!total || !total.lines) {
      return null;
    }

    return Math.round(total.lines.pct);
  } catch (error) {
    return null;
  }
}

function runTests(options = {}) {
  const cwd = options.cwd || process.cwd();
  const withCoverage = options.coverage !== false;
  const jestBin = path.join(cwd, 'node_modules', 'jest', 'bin', 'jest.js');

  if (!fs.existsSync(jestBin)) {
    throw new CliError('Jest не установлен. Выполните npm install');
  }

  const tempDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'my-cli-jest-'));
  const reportFile = path.join(tempDirectory, 'report.json');
  const args = [jestBin, '--runInBand', '--json', `--outputFile=${reportFile}`];

  if (withCoverage) {
    args.push('--coverage', '--coverageReporters=json-summary');
  }

  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, args, {
      cwd,
      env: {
        ...process.env,
        CI: '1',
        FORCE_COLOR: '0'
      }
    });

    let stderr = '';
    let stdout = '';

    function cleanup() {
      fs.rmSync(tempDirectory, { recursive: true, force: true });
    }

    child.stdout.on('data', (chunk) => {
      stdout += chunk.toString();
    });

    child.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
    });

    child.on('error', (error) => {
      cleanup();
      reject(new CliError(`не удалось запустить Jest: ${error.message}`));
    });

    child.on('close', () => {
      try {
        if (!fs.existsSync(reportFile)) {
          throw new CliError('Jest не сформировал отчёт о тестировании', {
            details: (stderr || stdout || '').trim()
          });
        }

        const report = JSON.parse(fs.readFileSync(reportFile, 'utf8'));
        const result = {
          success: Boolean(report.success),
          passed: report.numPassedTests || 0,
          failed: report.numFailedTests || 0,
          total: report.numTotalTests || 0,
          coverage: withCoverage ? readCoverage(cwd) : null
        };

        cleanup();
        resolve(result);
      } catch (error) {
        cleanup();
        reject(error);
      }
    });
  });
}

module.exports = {
  runTests,
  readCoverage
};
