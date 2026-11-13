const { spawnSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const root = path.resolve(__dirname, '../..');
const cliPath = path.join(root, 'cli.js');

function run(args, options = {}) {
  return spawnSync(process.execPath, [cliPath, ...args], {
    cwd: options.cwd || root,
    encoding: 'utf8',
    input: options.input,
    timeout: 30000,
    env: {
      ...process.env,
      NODE_ENV: options.nodeEnv || 'production',
      FORCE_COLOR: '0'
    }
  });
}

function tempDirectory(prefix) {
  return fs.mkdtempSync(path.join(os.tmpdir(), prefix));
}

describe('CLI integration', () => {
  test('без аргументов выводит справку', () => {
    const result = run([]);

    expect(result.status).toBe(0);
    expect(result.stdout).toContain('Использование: my-cli <команда> [аргументы]');
    expect(result.stdout).toContain('greet <имя>');
  });

  test('greet выводит приветствие', () => {
    const result = run(['greet', 'Иван']);

    expect(result.status).toBe(0);
    expect(result.stdout).toContain('Привет, Иван!');
    expect(result.stdout).toContain('ББМО-01-23');
  });

  test('info выводит информацию о группе', () => {
    const result = run(['info']);

    expect(result.status).toBe(0);
    expect(result.stdout).toContain('Группа: ББМО-01-23');
    expect(result.stdout).toContain('Лабораторная работа: №17');
  });

  test('--version выводит версию', () => {
    const result = run(['--version']);

    expect(result.status).toBe(0);
    expect(result.stdout.trim()).toBe('1.0.0');
  });

  test('--help выводит автоматическую справку', () => {
    const result = run(['--help']);

    expect(result.status).toBe(0);
    expect(result.stdout).toContain('generate [options]');
    expect(result.stdout).toContain('convert [options]');
  });

  test('неизвестная команда возвращает код 1', () => {
    const result = run(['unknown']);

    expect(result.status).toBe(1);
    expect(result.stderr).toContain('Ошибка: неизвестная команда "unknown"');
  });

  test('generate отклоняет неизвестный тип', () => {
    const result = run(['generate', '--type', 'unknown']);

    expect(result.status).toBe(1);
    expect(result.stderr).toContain('недопустимый тип отчёта "unknown"');
    expect(result.stderr).toContain('html, pdf, json, csv');
  });

  test('generate в режиме dry-run не создаёт файл', () => {
    const directory = tempDirectory('my-cli-int-generate-');

    try {
      const result = run(['generate', '--type', 'html', '--dry-run'], { cwd: directory });

      expect(result.status).toBe(0);
      expect(result.stdout).toContain('[DRY-RUN]');
      expect(fs.existsSync(path.join(directory, 'output.html'))).toBe(false);
    } finally {
      fs.rmSync(directory, { recursive: true, force: true });
    }
  });

  test('generate создаёт отчёт с опциями', () => {
    const directory = tempDirectory('my-cli-int-options-');

    try {
      const result = run([
        'generate',
        '--type', 'pdf',
        '--output', 'report.pdf',
        '--verbose'
      ], { cwd: directory });

      expect(result.status).toBe(0);
      expect(result.stderr).toContain('[VERBOSE] Тип отчёта: pdf');
      expect(fs.existsSync(path.join(directory, 'report.pdf'))).toBe(true);
    } finally {
      fs.rmSync(directory, { recursive: true, force: true });
    }
  });

  test('build в режиме dry-run не изменяет файлы', () => {
    const directory = tempDirectory('my-cli-int-build-');

    try {
      fs.writeFileSync(path.join(directory, 'index.js'), 'console.log("app");\n', 'utf8');
      fs.writeFileSync(path.join(directory, 'config.json'), JSON.stringify({
        name: 'my-app',
        entry: 'index.js'
      }), 'utf8');

      const result = run(['build', '--dry-run'], { cwd: directory });

      expect(result.status).toBe(0);
      expect(result.stdout).toContain('[DRY-RUN]');
      expect(fs.existsSync(path.join(directory, 'dist'))).toBe(false);
    } finally {
      fs.rmSync(directory, { recursive: true, force: true });
    }
  });

  test('build без конфигурации выводит краткую ошибку в production', () => {
    const directory = tempDirectory('my-cli-int-build-error-');

    try {
      const result = run(['build'], { cwd: directory, nodeEnv: 'production' });

      expect(result.status).toBe(1);
      expect(result.stderr).toContain('файл config.json не найден');
      expect(result.stderr).not.toContain('    at ');
    } finally {
      fs.rmSync(directory, { recursive: true, force: true });
    }
  });

  test('deploy в production требует --force', () => {
    const directory = tempDirectory('my-cli-int-deploy-');

    try {
      const result = run(['deploy', '--env', 'production'], { cwd: directory });

      expect(result.status).toBe(1);
      expect(result.stderr).toContain('--force');
    } finally {
      fs.rmSync(directory, { recursive: true, force: true });
    }
  });

  test('init в неинтерактивном режиме требует тип', () => {
    const directory = tempDirectory('my-cli-int-init-error-');

    try {
      const result = run(['init', '--no-interactive'], {
        cwd: directory,
        input: 'my-project\n'
      });

      expect(result.status).toBe(1);
      expect(result.stderr).toContain('недостаточно данных. Укажите --type');
    } finally {
      fs.rmSync(directory, { recursive: true, force: true });
    }
  });

  test('init с флагами создаёт проект без диалога', () => {
    const directory = tempDirectory('my-cli-int-init-');

    try {
      const result = run([
        'init',
        '--name', 'my-project',
        '--type', 'cli',
        '--typescript',
        '--prettier'
      ], { cwd: directory });

      expect(result.status).toBe(0);
      expect(result.stdout).toContain('успешно инициализирован');
      expect(result.stdout).toContain('Тип: CLI-утилита');
      expect(fs.existsSync(path.join(directory, 'my-project', 'package.json'))).toBe(true);
      expect(fs.existsSync(path.join(directory, 'my-project', 'src', 'index.ts'))).toBe(true);
    } finally {
      fs.rmSync(directory, { recursive: true, force: true });
    }
  });

  test('process разделяет stdout и stderr', () => {
    const directory = tempDirectory('my-cli-int-process-');

    try {
      fs.writeFileSync(path.join(directory, 'a.txt'), 'alpha', 'utf8');

      const result = run(['process', '--files', 'a.txt', 'missing.txt'], { cwd: directory });
      const payload = JSON.parse(result.stdout);

      expect(result.status).toBe(1);
      expect(payload.total).toBe(2);
      expect(payload.processed).toBe(1);
      expect(payload.skipped).toBe(1);
      expect(result.stderr).toContain('Файл missing.txt не найден');
      expect(fs.existsSync(path.join(directory, 'output.json'))).toBe(true);
    } finally {
      fs.rmSync(directory, { recursive: true, force: true });
    }
  });

  test('process молчит при успехе и перенаправленном stdout', () => {
    const directory = tempDirectory('my-cli-int-silence-');

    try {
      fs.writeFileSync(path.join(directory, 'a.txt'), 'alpha', 'utf8');

      const result = run(['process', '--files', 'a.txt'], { cwd: directory });
      const payload = JSON.parse(result.stdout);

      expect(result.status).toBe(0);
      expect(payload.processed).toBe(1);
      expect(result.stderr).toBe('');
      expect(fs.existsSync(path.join(directory, 'output.json'))).toBe(true);
    } finally {
      fs.rmSync(directory, { recursive: true, force: true });
    }
  });
});
