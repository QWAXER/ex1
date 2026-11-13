const fs = require('fs');
const path = require('path');
const { CliError } = require('../utils/errors');
const { displayPath } = require('../utils/paths');

const VALID_FORMATS = ['json', 'csv', 'txt', 'html'];

function splitCsvLine(line) {
  const values = [];
  let value = '';
  let quoted = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];

    if (char === '"') {
      if (quoted && line[index + 1] === '"') {
        value += '"';
        index += 1;
      } else {
        quoted = !quoted;
      }
    } else if (char === ',' && !quoted) {
      values.push(value.trim());
      value = '';
    } else {
      value += char;
    }
  }

  values.push(value.trim());
  return values;
}

function parseCsv(text) {
  const lines = text.trim().split(/\r?\n/).filter((line) => line.trim() !== '');

  if (lines.length === 0) {
    return [];
  }

  const headers = splitCsvLine(lines[0]);

  return lines.slice(1).map((line) => {
    const values = splitCsvLine(line);
    const record = {};

    headers.forEach((header, index) => {
      record[header] = values[index] === undefined ? '' : values[index];
    });

    return record;
  });
}

function escapeCsv(value) {
  const text = value === null || value === undefined ? '' : String(value);

  if (text.includes(',') || text.includes('"') || text.includes('\n')) {
    return `"${text.replace(/"/g, '""')}"`;
  }

  return text;
}

function toCsv(data) {
  if (Array.isArray(data)) {
    if (data.length === 0) {
      return '\n';
    }

    const headers = [...new Set(data.flatMap((item) => Object.keys(item || {})))];
    const rows = data.map((item) => headers.map((header) => escapeCsv(item[header])).join(','));

    return [headers.map(escapeCsv).join(','), ...rows].join('\n') + '\n';
  }

  if (data && typeof data === 'object') {
    const headers = Object.keys(data);
    return [
      headers.map(escapeCsv).join(','),
      headers.map((header) => escapeCsv(data[header])).join(',')
    ].join('\n') + '\n';
  }

  return `value\n${escapeCsv(data)}\n`;
}

function escapeHtml(text) {
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function convertContent(content, from, to) {
  if (from === to) {
    return content;
  }

  if (to === 'json') {
    if (from === 'csv') {
      return `${JSON.stringify(parseCsv(content), null, 2)}\n`;
    }

    return `${JSON.stringify({ content }, null, 2)}\n`;
  }

  if (to === 'csv') {
    if (from === 'json') {
      try {
        return toCsv(JSON.parse(content));
      } catch (error) {
        return toCsv(content);
      }
    }

    return toCsv(content);
  }

  if (to === 'html') {
    return [
      '<!DOCTYPE html>',
      '<html lang="ru">',
      '<head><meta charset="utf-8"><title>Конвертация</title></head>',
      '<body>',
      `<pre>${escapeHtml(content)}</pre>`,
      '</body>',
      '</html>'
    ].join('\n') + '\n';
  }

  return content;
}

function convertFile(options = {}) {
  const {
    input,
    output,
    format = 'json',
    force = false,
    cwd = process.cwd()
  } = options;

  if (!input) {
    throw new CliError('не указан входной файл.');
  }

  const normalizedFormat = String(format).trim().toLowerCase();

  if (!VALID_FORMATS.includes(normalizedFormat)) {
    throw new CliError(`недопустимый формат "${format}".`, {
      details: `Допустимые значения: ${VALID_FORMATS.join(', ')}`
    });
  }

  const inputPath = path.resolve(cwd, input);

  if (!fs.existsSync(inputPath)) {
    throw new CliError(`файл "${input}" не найден.`);
  }

  const extension = path.extname(inputPath).slice(1).toLowerCase();
  const source = fs.readFileSync(inputPath, 'utf8');
  const converted = convertContent(source, extension, normalizedFormat);
  const outputPath = path.resolve(cwd, output || `output.${normalizedFormat}`);

  if (fs.existsSync(outputPath) && !force) {
    throw new CliError(`файл "${displayPath(outputPath, cwd)}" уже существует.`, {
      details: 'Используйте --force для перезаписи'
    });
  }

  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, converted, 'utf8');

  return {
    input: inputPath,
    output: outputPath,
    format: normalizedFormat,
    size: fs.statSync(outputPath).size
  };
}

module.exports = {
  VALID_FORMATS,
  parseCsv,
  toCsv,
  convertContent,
  convertFile
};
