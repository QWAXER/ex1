const fs = require('fs');
const path = require('path');
const { CliError } = require('../utils/errors');
const { displayPath } = require('../utils/paths');

const VALID_TYPES = ['html', 'pdf', 'json', 'csv'];
const GROUP = 'ББМО-01-23';
const STUDENT = 'Иванов Иван';

function validateType(type) {
  const normalized = String(type || '').trim().toLowerCase();

  if (!VALID_TYPES.includes(normalized)) {
    throw new CliError(`недопустимый тип отчёта "${type}".`, {
      details: `Допустимые значения: ${VALID_TYPES.join(', ')}`
    });
  }

  return normalized;
}

function reportDate() {
  return new Date().toISOString().slice(0, 10);
}

function createReportContent(type) {
  const date = reportDate();

  if (type === 'json') {
    return `${JSON.stringify({
      title: 'Отчёт по лабораторной работе №17',
      group: GROUP,
      student: STUDENT,
      date
    }, null, 2)}\n`;
  }

  if (type === 'csv') {
    return [
      '"Поле","Значение"',
      `"Лабораторная работа","№17"`,
      `"Группа","${GROUP}"`,
      `"Студент","${STUDENT}"`,
      `"Дата","${date}"`
    ].join('\n') + '\n';
  }

  if (type === 'pdf') {
    return [
      '%PDF-1.4',
      '1 0 obj',
      '<< /Type /Catalog /Pages 2 0 R >>',
      'endobj',
      '2 0 obj',
      '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
      'endobj',
      '3 0 obj',
      '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents 4 0 R >>',
      'endobj',
      '4 0 obj',
      '<< /Length 96 >>',
      'stream',
      'BT /F1 16 Tf 50 780 Td (Laboratory work No. 17) Tj ET',
      'endstream',
      'endobj',
      'trailer',
      '<< /Root 1 0 R >>',
      '%%EOF'
    ].join('\n') + '\n';
  }

  return [
    '<!DOCTYPE html>',
    '<html lang="ru">',
    '<head>',
    '  <meta charset="utf-8">',
    '  <title>Отчёт по лабораторной работе №17</title>',
    '</head>',
    '<body>',
    '  <h1>Отчёт по лабораторной работе №17</h1>',
    '  <ul>',
    `    <li>Группа: ${GROUP}</li>`,
    `    <li>Студент: ${STUDENT}</li>`,
    `    <li>Дата: ${date}</li>`,
    '  </ul>',
    '</body>',
    '</html>'
  ].join('\n') + '\n';
}

function resolveReportPath(type, output, cwd = process.cwd()) {
  const normalized = validateType(type);

  if (output) {
    return path.resolve(cwd, output);
  }

  return path.resolve(cwd, `output.${normalized}`);
}

function generateReport(options = {}) {
  const {
    type = 'html',
    output,
    force = false,
    dryRun = false,
    cwd = process.cwd()
  } = options;

  const normalized = validateType(type);
  const target = resolveReportPath(normalized, output, cwd);
  const exists = fs.existsSync(target);

  if (dryRun) {
    return {
      type: normalized,
      output: target,
      exists,
      dryRun: true,
      written: false
    };
  }

  if (exists && !force) {
    throw new CliError(`файл "${displayPath(target, cwd)}" уже существует.`, {
      details: 'Используйте --force для перезаписи'
    });
  }

  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, createReportContent(normalized), 'utf8');

  return {
    type: normalized,
    output: target,
    exists,
    dryRun: false,
    written: true,
    size: fs.statSync(target).size
  };
}

module.exports = {
  VALID_TYPES,
  validateType,
  createReportContent,
  resolveReportPath,
  generateReport
};
