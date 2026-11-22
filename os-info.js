const os = require('os');

const GROUP = '478';
const STUDENT = 'Филеня Кирилл';

function printField(label, value) {
  console.log(`${label.padEnd(16)}${value}`);
}

function formatUptime(seconds) {
  const total = Math.floor(seconds);
  const days = Math.floor(total / 86400);
  const hours = Math.floor((total % 86400) / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const rest = total % 60;
  const parts = [];

  if (days > 0) {
    parts.push(`${days} д`);
  }

  parts.push(`${hours} ч`);
  parts.push(`${minutes} мин`);
  parts.push(`${rest} сек`);

  return parts.join(' ');
}

function platformMessage(platform) {
  const messages = {
    win32: 'Вы работаете в Windows',
    linux: 'Вы работаете в Linux',
    darwin: 'Вы работаете в macOS'
  };

  return messages[platform] || 'Неизвестная платформа';
}

const platform = os.platform();

console.log(`=== Информация о системе (группа ${GROUP}) ===`);
printField('Студент:', STUDENT);
printField('Платформа:', platform);
printField('Тип ОС:', os.type());
printField('Архитектура:', os.arch());
printField('Версия ОС:', os.release());
printField('Имя хоста:', os.hostname());
printField('Время работы:', formatUptime(os.uptime()));
console.log('');
console.log(platformMessage(platform));
