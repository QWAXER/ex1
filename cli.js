const { Command } = require('commander');
const { version } = require('./package.json');
const { printFatal } = require('./utils/errors');
const registerGreet = require('./commands/greet');
const registerInfo = require('./commands/info');
const registerGenerate = require('./commands/generate');
const registerConvert = require('./commands/convert');
const registerInit = require('./commands/init');
const registerProcess = require('./commands/process');
const registerBuild = require('./commands/build');
const registerTest = require('./commands/test');
const registerDeploy = require('./commands/deploy');

const KNOWN_COMMANDS = new Set([
  'greet',
  'info',
  'generate',
  'convert',
  'init',
  'process',
  'build',
  'test',
  'deploy',
  'help'
]);

const HELP_LINES = [
  'Использование: my-cli <команда> [аргументы]',
  '',
  'Доступные команды:',
  '  greet <имя>             - поприветствовать пользователя',
  '  info                    - вывести информацию о группе',
  '  generate [options]      - сгенерировать отчёт',
  '  convert [options]       - конвертировать файл',
  '  init [options]          - инициализировать проект',
  '  process [options]       - обработать файлы',
  '  build [options]         - собрать проект',
  '  test                    - запустить тесты',
  '  deploy [options]        - развернуть проект',
  '  help [команда]          - показать справку',
  '',
  'Для справки используйте: my-cli --help'
];

function printHelp() {
  process.stdout.write(`${HELP_LINES.join('\n')}\n`);
}

function buildProgram() {
  const program = new Command();

  program
    .name('my-cli')
    .description('CLI-приложение для лабораторной работы №17')
    .version(version, '-V, --version', 'output the version number')
    .option('-v, --verbose', 'подробный вывод')
    .showHelpAfterError(false)
    .exitOverride();

  registerGreet(program);
  registerInfo(program);
  registerGenerate(program);
  registerConvert(program);
  registerInit(program);
  registerProcess(program);
  registerBuild(program);
  registerTest(program);
  registerDeploy(program);

  return program;
}

async function main(argv = process.argv) {
  const args = argv.slice(2);

  if (args.length === 0) {
    printHelp();
    return;
  }

  const first = args[0];

  if (!first.startsWith('-') && !KNOWN_COMMANDS.has(first)) {
    process.stderr.write(`Ошибка: неизвестная команда "${first}"\n`);
    process.stderr.write('Для справки используйте: my-cli --help\n');
    process.exitCode = 1;
    return;
  }

  const program = buildProgram();

  try {
    await program.parseAsync(argv);
  } catch (error) {
    if (error.code === 'commander.helpDisplayed' || error.code === 'commander.version') {
      process.exitCode = 0;
      return;
    }

    if (typeof error.code === 'string' && error.code.startsWith('commander.')) {
      process.exitCode = typeof error.exitCode === 'number' ? error.exitCode : 1;
      return;
    }

    throw error;
  }
}

process.on('uncaughtException', (error) => {
  printFatal(error);
});

process.on('unhandledRejection', (error) => {
  printFatal(error);
});

process.on('SIGINT', () => {
  process.stderr.write('Операция прервана пользователем\n');
  process.exit(130);
});

if (require.main === module) {
  main().catch((error) => {
    printFatal(error);
  });
}

module.exports = {
  buildProgram,
  main,
  printHelp
};
