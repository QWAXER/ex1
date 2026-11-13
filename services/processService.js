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

module.exports = {
  processFile,
  processFiles
};
