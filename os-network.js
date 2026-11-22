const os = require('os');

const GROUP = '478';
const STUDENT = 'Филеня Кирилл';

function printField(label, value) {
  console.log(`${label.padEnd(28)}${value}`);
}

function maskMac(mac) {
  if (!mac || mac === '00:00:00:00:00:00') {
    return mac || 'нет';
  }

  const parts = mac.split(':');
  const visible = parts.slice(0, 3);
  const hidden = parts.slice(3).map(() => '**');
  return [...visible, ...hidden].join(':');
}

function isFamily(address, family, numericFamily) {
  return address.family === family || address.family === numericFamily;
}

function interfaceLines(name, addresses) {
  const ipv4 = addresses.filter((item) => isFamily(item, 'IPv4', 4));
  const ipv6 = addresses.filter((item) => isFamily(item, 'IPv6', 6));
  const internal = addresses.some((item) => item.internal);
  const lines = [`Интерфейс: ${name}`];

  if (ipv4.length > 0) {
    ipv4.forEach((item) => {
      lines.push(`  IPv4:        ${item.address}`);
    });
  } else {
    lines.push('  IPv4:        нет');
  }

  if (ipv6.length > 0) {
    ipv6.forEach((item) => {
      lines.push(`  IPv6:        ${item.address}`);
    });
  } else {
    lines.push('  IPv6:        нет');
  }

  const mac = addresses.map((item) => item.mac).find((value) => value && value !== '00:00:00:00:00:00');
  lines.push(`  MAC:         ${maskMac(mac)}`);
  lines.push(`  Внутренний:  ${internal ? 'да' : 'нет'}`);

  return lines;
}

function externalIpv4(addresses) {
  return addresses.find(
    (item) => isFamily(item, 'IPv4', 4) && !item.internal && !item.address.startsWith('169.254.')
  );
}

function findPrimaryInterface(interfaces) {
  const virtualPattern = /vpn|virtual|vethernet|hyper-v|vmware|virtualbox|docker|wsl|teredo|tunnel|loopback|tailscale|zerotier/i;
  const entries = Object.entries(interfaces).filter(([, addresses]) => addresses && externalIpv4(addresses));
  const physical = entries.find(([name]) => !virtualPattern.test(name));
  const chosen = physical || entries[0];

  return chosen ? { name: chosen[0], address: externalIpv4(chosen[1]).address } : null;
}

function userValue(value, fallback) {
  return value === undefined || value === null ? fallback : value;
}

const interfaces = os.networkInterfaces();
const names = Object.keys(interfaces);
const user = os.userInfo();
const platform = os.platform();
const isUnix = platform !== 'win32';
const uid = typeof process.getuid === 'function' ? process.getuid() : null;
const gid = typeof process.getgid === 'function' ? process.getgid() : null;
const isRoot = uid === 0;
const primary = findPrimaryInterface(interfaces);

console.log(`=== Сетевые интерфейсы (группа ${GROUP}) ===`);
printField('Студент:', STUDENT);
console.log('');

names.forEach((name, index) => {
  const addresses = interfaces[name] || [];
  interfaceLines(name, addresses).forEach((line) => console.log(line));

  if (index < names.length - 1) {
    console.log('');
  }
});

console.log('');
printField('Всего интерфейсов:', names.length);

if (primary) {
  printField('Основной интерфейс:', `${primary.name} (${primary.address})`);
} else {
  printField('Основной интерфейс:', 'не найден');
}

console.log('');
console.log('=== Информация о пользователе ===');
printField('Имя пользователя:', user.username);
printField('UID:', isUnix ? userValue(uid, 'недоступно') : 'недоступно (Windows)');
printField('GID:', isUnix ? userValue(gid, 'недоступно') : 'недоступно (Windows)');
printField('Домашняя директория:', user.homedir);
printField('Оболочка по умолчанию:', userValue(user.shell, 'недоступно (Windows)'));

console.log('');
printField('Группа:', GROUP);
printField('Проверка root:', isRoot ? 'да' : 'нет (обычный пользователь)');

if (isRoot) {
  console.log('ВНИМАНИЕ: скрипт запущен от имени root');
} else {
  console.log('Пользователь не является root');
}
