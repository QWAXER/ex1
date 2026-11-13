const logger = require('../utils/logger');
const { displayPath } = require('../utils/paths');
const { VALID_FORMATS, convertFile } = require('../services/convertService');

module.exports = (program) => {
  program
    .command('convert <input>')
    .description('конвертировать файл')
    .option('-o, --output <path>', 'путь для сохранения')
    .option('-f, --format <format>', 'целевой формат', 'json')
    .option('--force', 'перезаписать существующий файл')
    .action((input, options, command) => {
      const settings = command.optsWithGlobals();

      logger.verbose(settings.verbose, 'Запуск конвертации файла...');
      logger.verbose(settings.verbose, `Входной файл: ${input}`);
      logger.verbose(settings.verbose, `Целевой формат: ${settings.format}`);
      logger.verbose(settings.verbose, `Допустимые форматы: ${VALID_FORMATS.join(', ')}`);

      const result = convertFile({
        input,
        output: settings.output,
        format: settings.format,
        force: Boolean(settings.force)
      });

      logger.log(`Файл сконвертирован: ${displayPath(result.output)}`);
    });
};
