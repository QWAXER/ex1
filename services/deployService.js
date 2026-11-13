const fs = require('fs');
const path = require('path');
const { CliError } = require('../utils/errors');

const VALID_ENVIRONMENTS = ['development', 'staging', 'production'];

function readProjectName(cwd) {
  try {
    const config = JSON.parse(fs.readFileSync(path.join(cwd, 'config.json'), 'utf8'));
    return config.name || 'my-app';
  } catch (error) {
    return 'my-app';
  }
}

function deployProject(options = {}) {
  const {
    cwd = process.cwd(),
    env = 'staging',
    url
  } = options;

  const environment = String(env || '').trim().toLowerCase();

  if (!VALID_ENVIRONMENTS.includes(environment)) {
    throw new CliError(`недопустимое окружение "${env}".`, {
      details: `Допустимые значения: ${VALID_ENVIRONMENTS.join(', ')}`
    });
  }

  const name = readProjectName(cwd);
  const deployUrl = url || (environment === 'production'
    ? `https://${name}.example.com`
    : `https://${name}-${environment}.example.com`);

  if (!/^https?:\/\//.test(deployUrl)) {
    throw new CliError(`некорректный URL "${deployUrl}".`);
  }

  return {
    name,
    env: environment,
    url: deployUrl,
    deployedAt: new Date().toISOString()
  };
}

module.exports = {
  VALID_ENVIRONMENTS,
  readProjectName,
  deployProject
};
