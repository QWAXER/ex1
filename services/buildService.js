const fs = require('fs');
const path = require('path');
const { CliError } = require('../utils/errors');

function readConfig(configPath, cwd) {
  const absolute = path.resolve(cwd, configPath);

  try {
    const content = fs.readFileSync(absolute, 'utf8');
    return {
      config: JSON.parse(content),
      path: absolute
    };
  } catch (error) {
    if (error.code === 'ENOENT') {
      throw new CliError(`файл ${path.basename(absolute)} не найден`, {
        details: 'Укажите путь через --config',
        cause: error
      });
    }

    if (error instanceof SyntaxError) {
      throw new CliError(`не удалось прочитать ${path.basename(absolute)}: некорректный JSON`, {
        details: error.message,
        cause: error
      });
    }

    throw error;
  }
}

function buildProject(options = {}) {
  const {
    cwd = process.cwd(),
    config: configPath = 'config.json',
    outDir,
    dryRun = false
  } = options;

  const loaded = readConfig(configPath, cwd);
  const config = loaded.config;
  const name = config.name || 'my-app';
  const outputDirectory = path.resolve(cwd, outDir || config.outDir || 'dist');
  const outputFile = path.join(outputDirectory, `${name}.js`);
  const entry = path.resolve(path.dirname(loaded.path), config.entry || 'src/index.js');

  if (!fs.existsSync(entry)) {
    throw new CliError(`точка входа "${path.relative(cwd, entry)}" не найдена`);
  }

  if (dryRun) {
    return {
      name,
      configPath: loaded.path,
      entry,
      outputFile,
      dryRun: true,
      written: false
    };
  }

  const source = fs.readFileSync(entry, 'utf8');
  const content = source.startsWith('#!')
    ? source.replace(/^#![^\r\n]*\r?\n/, '#!/usr/bin/env node\n')
    : `#!/usr/bin/env node\n${source}`;

  fs.mkdirSync(outputDirectory, { recursive: true });
  fs.writeFileSync(outputFile, content, 'utf8');

  return {
    name,
    configPath: loaded.path,
    entry,
    outputFile,
    dryRun: false,
    written: true,
    size: fs.statSync(outputFile).size,
    builtAt: new Date().toISOString()
  };
}

module.exports = {
  readConfig,
  buildProject
};
