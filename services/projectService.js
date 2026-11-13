const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const { CliError } = require('../utils/errors');

const PROJECT_TYPES = {
  web: 'Web-приложение',
  cli: 'CLI-утилита',
  library: 'Библиотека',
  microservice: 'Микросервис'
};

const FEATURE_KEYS = ['typescript', 'eslint', 'prettier', 'jest'];

const FEATURE_LABELS = {
  typescript: 'TypeScript',
  eslint: 'ESLint',
  prettier: 'Prettier',
  jest: 'Jest'
};

function validateProjectName(name) {
  const value = String(name || '').trim();

  if (!value) {
    throw new CliError('не указано название проекта.');
  }

  if (!/^[a-zA-Z0-9][a-zA-Z0-9._-]*$/.test(value)) {
    throw new CliError(`недопустимое название проекта "${name}".`, {
      details: 'Используйте латинские буквы, цифры, точку, дефис или подчёркивание'
    });
  }

  return value;
}

function normalizeType(type) {
  const value = String(type || '').trim().toLowerCase();

  if (PROJECT_TYPES[value]) {
    return value;
  }

  const entry = Object.entries(PROJECT_TYPES).find(([, label]) => label.toLowerCase() === value);

  if (entry) {
    return entry[0];
  }

  throw new CliError(`недопустимый тип проекта "${type}".`, {
    details: `Допустимые значения: ${Object.keys(PROJECT_TYPES).join(', ')}`
  });
}

function normalizeFeatures(input = {}) {
  const features = {};

  if (Array.isArray(input)) {
    FEATURE_KEYS.forEach((key) => {
      features[key] = input.includes(key);
    });
    return features;
  }

  FEATURE_KEYS.forEach((key) => {
    features[key] = Boolean(input[key]);
  });

  return features;
}

function featureLabels(features = {}) {
  const labels = FEATURE_KEYS
    .filter((key) => features[key])
    .map((key) => FEATURE_LABELS[key]);

  return labels.length > 0 ? labels.join(', ') : 'нет';
}

function packageJsonContent(name, type, features) {
  const pkg = {
    name,
    version: '1.0.0',
    description: `Проект ${name} (${PROJECT_TYPES[type]})`,
    main: features.typescript ? 'dist/index.js' : 'src/index.js',
    scripts: {
      start: features.typescript ? 'node dist/index.js' : 'node src/index.js'
    },
    keywords: [],
    author: '',
    license: 'ISC'
  };

  if (features.typescript) {
    pkg.scripts.build = 'tsc';
    pkg.devDependencies = { typescript: '^5.0.0' };
  }

  if (features.jest) {
    pkg.scripts.test = 'jest';
    pkg.devDependencies = {
      ...(pkg.devDependencies || {}),
      jest: '^29.7.0'
    };
  }

  return `${JSON.stringify(pkg, null, 2)}\n`;
}

function indexContent(name, type, features) {
  if (features.typescript) {
    if (type === 'library') {
      return [
        'export function greet(value: string): string {',
        '  return `Hello, ${value}!`;',
        '}',
        '',
        'export default greet;'
      ].join('\n') + '\n';
    }

    return [
      'const name: string = process.argv[2] || "world";',
      `console.log(\`[${name}] Hello, \${name}!\`);`
    ].join('\n') + '\n';
  }

  if (type === 'library') {
    return [
      'function greet(value) {',
      '  return `Hello, ${value}!`;',
      '}',
      '',
      'module.exports = { greet };'
    ].join('\n') + '\n';
  }

  if (type === 'web') {
    return [
      "const http = require('http');",
      'const port = Number(process.env.PORT) || 3000;',
      'const server = http.createServer((request, response) => {',
      "  response.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });",
      `  response.end('Hello from ${name}!');`,
      '});',
      '',
      'server.listen(port, () => {',
      '  console.log(`Server started: http://localhost:${port}`);',
      '});'
    ].join('\n') + '\n';
  }

  if (type === 'microservice') {
    return [
      "const http = require('http');",
      'const port = Number(process.env.PORT) || 3000;',
      'const server = http.createServer((request, response) => {',
      "  response.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });",
      `  response.end(JSON.stringify({ service: '${name}', status: 'ok' }));`,
      '});',
      '',
      'server.listen(port, () => {',
      '  console.log(`Service started: http://localhost:${port}`);',
      '});'
    ].join('\n') + '\n';
  }

  return [
    "const name = process.argv[2] || 'world';",
    `console.log(\`[${name}] Hello, \${name}!\`);`
  ].join('\n') + '\n';
}

function readmeContent(name, type, features) {
  return [
    `# ${name}`,
    '',
    `Тип проекта: ${PROJECT_TYPES[type]}.`,
    '',
    '## Запуск',
    '',
    '```bash',
    'npm start',
    '```',
    '',
    '## Тестирование',
    '',
    '```bash',
    features.jest ? 'npm test' : 'Тесты не подключены',
    '```',
    ''
  ].join('\n');
}

function writeProjectFiles(target, name, type, features) {
  fs.mkdirSync(path.join(target, 'src'), { recursive: true });
  fs.writeFileSync(path.join(target, 'package.json'), packageJsonContent(name, type, features), 'utf8');
  fs.writeFileSync(path.join(target, 'README.md'), readmeContent(name, type, features), 'utf8');
  fs.writeFileSync(path.join(target, '.gitignore'), 'node_modules/\ndist/\n.env\n', 'utf8');

  if (features.typescript) {
    fs.writeFileSync(path.join(target, 'src', 'index.ts'), indexContent(name, type, features), 'utf8');
    fs.writeFileSync(path.join(target, 'tsconfig.json'), `${JSON.stringify({
      compilerOptions: {
        target: 'ES2022',
        module: 'CommonJS',
        outDir: 'dist',
        rootDir: 'src',
        strict: true,
        esModuleInterop: true,
        skipLibCheck: true
      },
      include: ['src/**/*.ts']
    }, null, 2)}\n`, 'utf8');
  } else {
    fs.writeFileSync(path.join(target, 'src', 'index.js'), indexContent(name, type, features), 'utf8');
  }

  if (features.eslint) {
    fs.writeFileSync(path.join(target, '.eslintrc.json'), `${JSON.stringify({
      env: { node: true, es2022: true },
      extends: ['eslint:recommended'],
      parserOptions: { ecmaVersion: 2022 }
    }, null, 2)}\n`, 'utf8');
  }

  if (features.prettier) {
    fs.writeFileSync(path.join(target, '.prettierrc.json'), `${JSON.stringify({
      semi: true,
      singleQuote: true,
      trailingComma: 'none',
      printWidth: 100
    }, null, 2)}\n`, 'utf8');
  }

  if (features.jest) {
    fs.mkdirSync(path.join(target, 'tests'), { recursive: true });
    fs.writeFileSync(path.join(target, 'tests', 'index.test.js'), [
      'test("project is initialized", () => {',
      '  expect(true).toBe(true);',
      '});',
      ''
    ].join('\n'), 'utf8');
  }
}

function createProject(options = {}) {
  const {
    name,
    type,
    features: rawFeatures = {},
    git = false,
    token = '',
    cwd = process.cwd()
  } = options;

  const projectName = validateProjectName(name);
  const projectType = normalizeType(type);
  const features = normalizeFeatures(rawFeatures);
  const target = path.resolve(cwd, projectName);

  if (fs.existsSync(target) && fs.readdirSync(target).length > 0) {
    throw new CliError(`каталог "${projectName}" уже существует и не пуст.`);
  }

  fs.mkdirSync(target, { recursive: true });
  writeProjectFiles(target, projectName, projectType, features);

  let gitInitialized = false;

  if (git) {
    const result = spawnSync('git', ['init', '--quiet'], {
      cwd: target,
      stdio: 'ignore'
    });
    gitInitialized = result.status === 0;
  }

  return {
    name: projectName,
    type: projectType,
    typeLabel: PROJECT_TYPES[projectType],
    features,
    featureLabels: featureLabels(features),
    git: gitInitialized,
    tokenProvided: Boolean(token),
    target
  };
}

module.exports = {
  PROJECT_TYPES,
  FEATURE_KEYS,
  FEATURE_LABELS,
  validateProjectName,
  normalizeType,
  normalizeFeatures,
  featureLabels,
  createProject
};
