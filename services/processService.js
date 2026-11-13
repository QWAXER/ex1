const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

function processFile(file, options = {}) {
  const cwd = options.cwd || process.cwd();
  const absolute = path.resolve(cwd, file);

  try {
    const stat = fs.statSync(absolute);

    if (!stat.isFile()) {
      return {
        file,
        status: 'skipped',
        reason: 'не является файлом',
        processedAt: new Date().toISOString()
      };
    }

    const hash = crypto.createHash('sha256').update(fs.readFileSync(absolute)).digest('hex');

    return {
      file,
      status: 'ok',
      size: stat.size,
      hash,
      processedAt: new Date().toISOString()
    };
  } catch (error) {
    return {
      file,
      status: 'missing',
      reason: error.code === 'ENOENT' ? 'не найден' : error.message,
      processedAt: new Date().toISOString()
    };
  }
}

function processFiles(files, options = {}) {
  return files.map((file) => processFile(file, options));
}

function expandPattern(pattern, cwd) {
  if (!/[*?]/.test(pattern)) {
    return [pattern];
  }

  const directory = path.dirname(pattern);
  const base = path.basename(pattern);
  const absoluteDirectory = path.resolve(cwd, directory);

  if (!fs.existsSync(absoluteDirectory) || !fs.statSync(absoluteDirectory).isDirectory()) {
    return [pattern];
  }

  const source = base
    .split('')
    .map((char) => {
      if (char === '*') {
        return '.*';
      }

      if (char === '?') {
        return '.';
      }

      return char.replace(/[.+^${}()|[\]\\]/g, '\\$&');
    })
    .join('');

  const matcher = new RegExp(`^${source}$`);
  const matches = fs.readdirSync(absoluteDirectory).filter((name) => matcher.test(name)).sort();

  if (matches.length === 0) {
    return [pattern];
  }

  return matches.map((name) => path.join(directory, name));
}

function expandFilePatterns(patterns, options = {}) {
  const cwd = options.cwd || process.cwd();

  return patterns.flatMap((pattern) => expandPattern(pattern, cwd));
}

module.exports = {
  processFile,
  processFiles,
  expandFilePatterns
};
