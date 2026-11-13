module.exports = (program) => {
  program
    .command('greet <name>')
    .description('поприветствовать пользователя')
    .action((name) => {
      process.stdout.write(`Привет, ${name}! Добро пожаловать в CLI-приложение группы ББМО-01-23.\n`);
    });
};
