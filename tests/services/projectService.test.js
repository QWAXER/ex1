const fs = require('fs');
const os = require('os');
const path = require('path');
const {
  normalizeType,
  featureLabels,
  createProject
} = require('../../services/projectService');

describe('projectService', () => {
  let directory;

  beforeEach(() => {
    directory = fs.mkdtempSync(path.join(os.tmpdir(), 'my-cli-project-'));
  });

  afterEach(() => {
    fs.rmSync(directory, { recursive: true, force: true });
  });

  test('нормализует ключ и русское название типа', () => {
    expect(normalizeType('cli')).toBe('cli');
    expect(normalizeType('CLI-утилита')).toBe('cli');
    expect(normalizeType('Библиотека')).toBe('library');
  });

  test('отклоняет неизвестный тип проекта', () => {
    expect(() => normalizeType('unknown')).toThrow('недопустимый тип проекта');
  });

  test('формирует список выбранных опций', () => {
    expect(featureLabels({ typescript: true, prettier: true })).toBe('TypeScript, Prettier');
    expect(featureLabels({})).toBe('нет');
  });

  test('создаёт структуру проекта', () => {
    const result = createProject({
      name: 'demo-app',
      type: 'cli',
      features: { typescript: true, prettier: true },
      cwd: directory
    });

    expect(result.name).toBe('demo-app');
    expect(result.typeLabel).toBe('CLI-утилита');
    expect(fs.existsSync(path.join(directory, 'demo-app', 'package.json'))).toBe(true);
    expect(fs.existsSync(path.join(directory, 'demo-app', 'src', 'index.ts'))).toBe(true);
    expect(fs.existsSync(path.join(directory, 'demo-app', '.prettierrc.json'))).toBe(true);
  });

  test('создаёт JavaScript-проект без TypeScript', () => {
    createProject({
      name: 'js-app',
      type: 'library',
      features: { jest: true },
      cwd: directory
    });

    expect(fs.existsSync(path.join(directory, 'js-app', 'src', 'index.js'))).toBe(true);
    expect(fs.existsSync(path.join(directory, 'js-app', 'tests', 'index.test.js'))).toBe(true);
  });

  test('запрещает небезопасное название проекта', () => {
    expect(() => createProject({ name: '../escape', type: 'cli', cwd: directory })).toThrow('недопустимое название');
  });

  test('запрещает инициализацию в непустой каталог', () => {
    fs.mkdirSync(path.join(directory, 'busy'));
    fs.writeFileSync(path.join(directory, 'busy', 'file.txt'), 'data', 'utf8');

    expect(() => createProject({ name: 'busy', type: 'cli', cwd: directory })).toThrow('уже существует и не пуст');
  });
});
