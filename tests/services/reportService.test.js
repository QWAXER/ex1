const fs = require('fs');
const os = require('os');
const path = require('path');
const {
  validateType,
  resolveReportPath,
  generateReport
} = require('../../services/reportService');
const { CliError } = require('../../utils/errors');

describe('reportService', () => {
  let directory;

  beforeEach(() => {
    directory = fs.mkdtempSync(path.join(os.tmpdir(), 'my-cli-report-'));
  });

  afterEach(() => {
    fs.rmSync(directory, { recursive: true, force: true });
  });

  test('валидирует допустимые типы отчёта', () => {
    expect(validateType('HTML')).toBe('html');
    expect(validateType('pdf')).toBe('pdf');
    expect(validateType('json')).toBe('json');
    expect(validateType('csv')).toBe('csv');
  });

  test('отклоняет неизвестный тип отчёта', () => {
    expect(() => validateType('unknown')).toThrow(CliError);
    expect(() => validateType('unknown')).toThrow('недопустимый тип отчёта "unknown"');
  });

  test('формирует путь по умолчанию', () => {
    expect(resolveReportPath('html', undefined, directory)).toBe(path.join(directory, 'output.html'));
  });

  test('создаёт html-отчёт', () => {
    const result = generateReport({ type: 'html', cwd: directory });

    expect(result.written).toBe(true);
    expect(fs.existsSync(result.output)).toBe(true);
    expect(fs.readFileSync(result.output, 'utf8')).toContain('лабораторной работе №17');
  });

  test('создаёт json-отчёт', () => {
    const result = generateReport({ type: 'json', output: 'report.json', cwd: directory });
    const data = JSON.parse(fs.readFileSync(result.output, 'utf8'));

    expect(data.group).toBe('ББМО-01-23');
    expect(data.title).toContain('№17');
  });

  test('не перезаписывает файл без флага force', () => {
    fs.writeFileSync(path.join(directory, 'output.html'), 'existing', 'utf8');

    expect(() => generateReport({ type: 'html', cwd: directory })).toThrow('уже существует');
  });

  test('перезаписывает файл с флагом force', () => {
    const target = path.join(directory, 'output.html');
    fs.writeFileSync(target, 'existing', 'utf8');

    const result = generateReport({ type: 'html', force: true, cwd: directory });

    expect(result.written).toBe(true);
    expect(fs.readFileSync(target, 'utf8')).toContain('<!DOCTYPE html>');
  });

  test('в режиме dry-run не создаёт файл', () => {
    const result = generateReport({ type: 'csv', dryRun: true, cwd: directory });

    expect(result.dryRun).toBe(true);
    expect(fs.existsSync(result.output)).toBe(false);
  });
});
