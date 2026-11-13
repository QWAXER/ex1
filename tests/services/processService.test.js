const fs = require('fs');
const os = require('os');
const path = require('path');
const {
  processFile,
  processFiles,
  expandFilePatterns
} = require('../../services/processService');

describe('processService', () => {
  let directory;

  beforeEach(() => {
    directory = fs.mkdtempSync(path.join(os.tmpdir(), 'my-cli-process-'));
  });

  afterEach(() => {
    fs.rmSync(directory, { recursive: true, force: true });
  });

  test('обрабатывает существующий файл', () => {
    fs.writeFileSync(path.join(directory, 'a.txt'), 'alpha', 'utf8');

    const result = processFile('a.txt', { cwd: directory });

    expect(result.status).toBe('ok');
    expect(result.size).toBe(5);
    expect(result.hash).toHaveLength(64);
  });

  test('помечает отсутствующий файл как missing', () => {
    const result = processFile('missing.txt', { cwd: directory });

    expect(result.status).toBe('missing');
    expect(result.reason).toBe('не найден');
  });

  test('помечает каталог как пропущенный', () => {
    fs.mkdirSync(path.join(directory, 'folder'));

    const result = processFile('folder', { cwd: directory });

    expect(result.status).toBe('skipped');
    expect(result.reason).toBe('не является файлом');
  });

  test('обрабатывает список файлов', () => {
    fs.writeFileSync(path.join(directory, 'a.txt'), 'a', 'utf8');
    fs.writeFileSync(path.join(directory, 'b.txt'), 'b', 'utf8');

    const results = processFiles(['a.txt', 'b.txt', 'c.txt'], { cwd: directory });

    expect(results.map((item) => item.status)).toEqual(['ok', 'ok', 'missing']);
  });

  test('раскрывает маску файлов', () => {
    fs.writeFileSync(path.join(directory, 'a.txt'), 'a', 'utf8');
    fs.writeFileSync(path.join(directory, 'b.txt'), 'b', 'utf8');
    fs.writeFileSync(path.join(directory, 'c.md'), 'c', 'utf8');

    const files = expandFilePatterns(['*.txt'], { cwd: directory });

    expect(files.sort()).toEqual(['a.txt', 'b.txt']);
  });
});
