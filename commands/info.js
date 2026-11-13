module.exports = (program) => {
  program
    .command('info')
    .description('вывести информацию о группе')
    .action(() => {
      const date = new Date().toISOString().slice(0, 10);
      process.stdout.write([
        'Группа: ББМО-01-23',
        'Студент: Иванов Иван',
        'Лабораторная работа: №17',
        `Дата: ${date}`
      ].join('\n') + '\n');
    });
};
