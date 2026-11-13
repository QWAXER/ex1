# Лабораторная работа №17

CLI-приложение на Node.js с архитектурой «Команда». Все пять заданий лабораторной работы реализованы в одном приложении `my-cli`.

## Быстрый запуск

```bash
npm install
node cli.js
node cli.js --help
node cli.js greet "Иван"
node cli.js info
```

Исполняемый файл находится в корне проекта: `cli.js`.

## Структура

```text
my-node-app/
├── cli.js                  точка входа в корне проекта
├── bin/
│   └── my-cli.js           bin-точка входа для npm link и pkg
├── commands/               подкоманды CLI
│   ├── greet.js
│   ├── info.js
│   ├── generate.js
│   ├── convert.js
│   ├── init.js
│   ├── process.js
│   ├── build.js
│   ├── test.js
│   └── deploy.js
├── services/               бизнес-логика
│   ├── reportService.js
│   ├── convertService.js
│   ├── projectService.js
│   ├── processService.js
│   ├── buildService.js
│   ├── testService.js
│   └── deployService.js
├── utils/                  форматирование, ошибки, пути
├── tests/                  unit- и интеграционные тесты
├── config.json
└── package.json
```

## Задание 1. Базовое CLI

```bash
node cli.js
node cli.js greet "Иван"
node cli.js info
node cli.js unknown
echo %ERRORLEVEL%
```

Без аргументов выводится справка. При успехе код возврата `0`, при ошибке `1`.

## Задание 2. Опции и флаги commander

```bash
node cli.js --help
node cli.js --version
node cli.js generate --help
node cli.js generate --type pdf --output report.pdf --verbose
node cli.js generate --type html --dry-run
node cli.js generate --type unknown
node cli.js convert data.json --format csv
```

Поддерживаются короткие и длинные опции, значения по умолчанию, булевы флаги, `--help` и `--version`.

## Задание 3. Интерактивный режим inquirer

```bash
node cli.js init
```

Без обязательных флагов запускается диалог: `input`, `list`, `checkbox`, `confirm`, `password`.

Неинтерактивный режим:

```bash
node cli.js init --name my-project --type cli --typescript --prettier --git
node cli.js init --no-interactive
echo my-project | node cli.js init --no-interactive
```

При передаче данных через stdin интерактивность отключается автоматически.

## Задание 4. Форматированный вывод

```bash
node cli.js process --files package.json config.json
node cli.js process --files package.json missing.txt
node cli.js process --files package.json > result.json
```

Используются `chalk`, `ora` и `cli-progress`. Данные пишутся в stdout, логи и ошибки — в stderr. При перенаправлении stdout в файл в терминале остаются только предупреждения и ошибки.

## Задание 5. Архитектура, ошибки, тесты, упаковка

```bash
node cli.js build
node cli.js build --dry-run
node cli.js test
node cli.js deploy --env production
node cli.js deploy --env production --force
NODE_ENV=production node cli.js build
```

Команда `build` читает `config.json`, команда `test` запускает Jest, команда `deploy` требует `--force` для production в неинтерактивном режиме.

Глобальные слушатели `uncaughtException` и `unhandledRejection` выводят понятные сообщения в stderr и возвращают код `1`. В `development` показывается стек ошибки, в `production` — краткое сообщение.

## Тесты

```bash
npm test
npm run test:coverage
node cli.js test
```

Unit-тесты проверяют сервисы, интеграционные тесты запускают CLI через `child_process.spawnSync`.

## Упаковка

```bash
npm link
my-cli --version
npm run build:binary
```

Для сборки автономного бинарника используется `@yao-pkg/pkg`. Результат появляется в `dist/`.

## Группа

- Группа: ББМО-01-23
- Студент: Иванов Иван
- Лабораторная работа: №17
