const fs = require('fs');
const os = require('os');
const path = require('path');
const {
  VALID_ENVIRONMENTS,
  readProjectName,
  deployProject
} = require('../../services/deployService');
const { CliError } = require('../../utils/errors');

describe('deployService', () => {
  let directory;

  beforeEach(() => {
    directory = fs.mkdtempSync(path.join(os.tmpdir(), 'my-cli-deploy-'));
  });

  afterEach(() => {
    fs.rmSync(directory, { recursive: true, force: true });
  });

  test('содержит список допустимых окружений', () => {
    expect(VALID_ENVIRONMENTS).toEqual(['development', 'staging', 'production']);
  });

  test('читает имя проекта из config.json', () => {
    fs.writeFileSync(path.join(directory, 'config.json'), JSON.stringify({ name: 'demo' }), 'utf8');

    expect(readProjectName(directory)).toBe('demo');
  });

  test('использует имя по умолчанию без config.json', () => {
    expect(readProjectName(directory)).toBe('my-app');
  });

  test('формирует URL для production', () => {
    fs.writeFileSync(path.join(directory, 'config.json'), JSON.stringify({ name: 'demo' }), 'utf8');

    const result = deployProject({ cwd: directory, env: 'production' });

    expect(result.url).toBe('https://demo.example.com');
  });

  test('формирует URL для staging', () => {
    fs.writeFileSync(path.join(directory, 'config.json'), JSON.stringify({ name: 'demo' }), 'utf8');

    const result = deployProject({ cwd: directory, env: 'staging' });

    expect(result.url).toBe('https://demo-staging.example.com');
  });

  test('принимает пользовательский URL', () => {
    const result = deployProject({
      cwd: directory,
      env: 'development',
      url: 'https://localhost:3000'
    });

    expect(result.url).toBe('https://localhost:3000');
  });

  test('отклоняет неизвестное окружение', () => {
    expect(() => deployProject({ cwd: directory, env: 'unknown' })).toThrow(CliError);
  });

  test('отклоняет некорректный URL', () => {
    expect(() => deployProject({ cwd: directory, url: 'ftp://example.com' })).toThrow('некорректный URL');
  });
});
