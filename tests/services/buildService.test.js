const fs = require('fs');
const os = require('os');
const path = require('path');
const { buildProject } = require('../../services/buildService');
const { CliError } = require('../../utils/errors');

describe('buildService', () => {
  let directory;

  beforeEach(() => {
    directory = fs.mkdtempSync(path.join(os.tmpdir(), 'my-cli-build-'));
    fs.writeFileSync(path.join(directory, 'index.js'), 'console.log("app");\n', 'utf8');
    fs.writeFileSync(path.join(directory, 'config.json'), JSON.stringify({
      name: 'my-app',
      entry: 'index.js',
      outDir: 'dist'
    }), 'utf8');
  });

  afterEach(() => {
    fs.rmSync(directory, { recursive: true, force: true });
  });

  test('собирает проект в каталог dist', () => {
    const result = buildProject({ cwd: directory });

    expect(result.written).toBe(true);
    expect(result.outputFile).toBe(path.join(directory, 'dist', 'my-app.js'));
    expect(fs.readFileSync(result.outputFile, 'utf8')).toContain('#!/usr/bin/env node');
  });

  test('в режиме dry-run не создаёт файлы', () => {
    const result = buildProject({ cwd: directory, dryRun: true });

    expect(result.dryRun).toBe(true);
    expect(fs.existsSync(result.outputFile)).toBe(false);
  });

  test('выбрасывает понятную ошибку без конфигурации', () => {
    fs.rmSync(path.join(directory, 'config.json'));

    expect(() => buildProject({ cwd: directory })).toThrow(CliError);
    expect(() => buildProject({ cwd: directory })).toThrow('файл config.json не найден');
  });

  test('выбрасывает ошибку при отсутствии точки входа', () => {
    fs.rmSync(path.join(directory, 'index.js'));

    expect(() => buildProject({ cwd: directory })).toThrow('точка входа');
  });

  test('выбрасывает ошибку при некорректном JSON', () => {
    fs.writeFileSync(path.join(directory, 'config.json'), '{ invalid', 'utf8');

    expect(() => buildProject({ cwd: directory })).toThrow('некорректный JSON');
  });
});
