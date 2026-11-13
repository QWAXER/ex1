const inquirer = require('inquirer');
const logger = require('../utils/logger');
const { CliError } = require('../utils/errors');
const {
  PROJECT_TYPES,
  FEATURE_KEYS,
  FEATURE_LABELS,
  validateProjectName,
  normalizeFeatures,
  createProject
} = require('../services/projectService');

function readStdin() {
  if (process.stdin.readableEnded) {
    return Promise.resolve('');
  }

  return new Promise((resolve) => {
    let data = '';

    process.stdin.setEncoding('utf8');
    process.stdin.on('data', (chunk) => {
      data += chunk;
    });
    process.stdin.on('end', () => {
      resolve(data.trim());
    });
    process.stdin.on('error', () => {
      resolve(data.trim());
    });
    process.stdin.resume();
  });
}

function featureFlags(options) {
  const features = {};

  FEATURE_KEYS.forEach((key) => {
    features[key] = Boolean(options[key]);
  });

  return features;
}

function selectedFeatureKeys(options) {
  return FEATURE_KEYS.filter((key) => Boolean(options[key]));
}

async function promptForProject(options) {
  const defaults = selectedFeatureKeys(options);
  const answers = await inquirer.prompt([
    {
      type: 'input',
      name: 'name',
      message: 'Введите название проекта:',
      default: 'my-project',
      when: !options.name,
      validate: (value) => {
        try {
          validateProjectName(value);
          return true;
        } catch (error) {
          return error.message;
        }
      }
    },
    {
      type: 'list',
      name: 'type',
      message: 'Выберите тип проекта:',
      choices: Object.entries(PROJECT_TYPES).map(([value, name]) => ({ name, value })),
      when: !options.type
    },
    {
      type: 'checkbox',
      name: 'features',
      message: 'Выберите дополнительные опции:',
      choices: FEATURE_KEYS.map((key) => ({
        name: FEATURE_LABELS[key],
        value: key,
        checked: defaults.includes(key)
      })),
      default: defaults.length > 0 ? defaults : ['typescript', 'prettier']
    },
    {
      type: 'confirm',
      name: 'git',
      message: 'Использовать Git?',
      default: true
    },
    {
      type: 'password',
      name: 'token',
      message: 'Введите токен доступа:',
      mask: '*'
    }
  ]);

  return answers;
}

module.exports = (program) => {
  program
    .command('init')
    .description('инициализировать проект')
    .option('--name <name>', 'название проекта')
    .option('--type <type>', 'тип проекта: web, cli, library, microservice')
    .option('--typescript', 'добавить TypeScript')
    .option('--eslint', 'добавить ESLint')
    .option('--prettier', 'добавить Prettier')
    .option('--jest', 'добавить Jest')
    .option('--git', 'инициализировать Git-репозиторий')
    .option('--token <token>', 'токен доступа')
    .option('--no-interactive', 'отключить интерактивный режим')
    .action(async (options) => {
      const interactiveAllowed = options.interactive !== false && Boolean(process.stdin.isTTY);
      let answers = {};

      if (!options.name && !process.stdin.isTTY) {
        const input = await readStdin();

        if (input) {
          options.name = input.split(/\r?\n/)[0].trim();
        }
      }

      if (interactiveAllowed && (!options.name || !options.type)) {
        answers = await promptForProject(options);
      } else {
        const missing = [];

        if (!options.name) {
          missing.push('--name');
        }

        if (!options.type) {
          missing.push('--type');
        }

        if (missing.length > 0) {
          if (!options.name && !options.type) {
            throw new CliError('в неинтерактивном режиме необходимо указать --name и --type');
          }

          throw new CliError(`недостаточно данных. Укажите ${missing[0]}`);
        }
      }

      const name = options.name || answers.name;
      const type = options.type || answers.type;
      const features = answers.features
        ? normalizeFeatures(answers.features)
        : featureFlags(options);
      const git = answers.git === undefined ? Boolean(options.git) : Boolean(answers.git);
      const token = options.token || answers.token || '';

      const result = createProject({
        name,
        type,
        features,
        git,
        token
      });

      logger.success(`Проект "${result.name}" создан`);
      logger.success('Зависимости установлены');

      if (result.git) {
        logger.success('Инициализирован Git-репозиторий');
      }

      logger.log('');
      logger.log(`Проект "${result.name}" успешно инициализирован!`);
      logger.log(`  Тип: ${result.typeLabel}`);
      logger.log(`  Опции: ${result.featureLabels}`);
      logger.log(`  Git: ${result.git ? 'да' : 'нет'}`);

      if (result.tokenProvided) {
        logger.log('  Токен: получен');
      }

      logger.log('');
      logger.log('Проект готов к работе!');
    });
};
