const fs = require('fs');
const os = require('os');
const path = require('path');
const {
  parseCsv,
  toCsv,
  convertContent,
  convertFile
} = require('../../services/convertService');

describe('convertService', () => {
  let directory;

  beforeEach(() => {
    directory = fs.mkdtempSync(path.join(os.tmpdir(), 'my-cli-convert-'));
  });

  afterEach(() => {
    fs.rmSync(directory, { recursive: true, force: true });
  });

  test('разбирает CSV в массив объектов', () => {
    const data = parseCsv('name,age\nIvan,25\nAnna,30\n');

    expect(data).toEqual([
      { name: 'Ivan', age: '25' },
      { name: 'Anna', age: '30' }
    ]);
  });

  test('формирует CSV из массива объектов', () => {
    const csv = toCsv([{ name: 'Ivan', age: 25 }]);

    expect(csv).toContain('name,age');
    expect(csv).toContain('Ivan,25');
  });

  test('конвертирует JSON в CSV', () => {
    const csv = convertContent('[{"name":"Ivan"}]', 'json', 'csv');

    expect(csv).toContain('name');
    expect(csv).toContain('Ivan');
  });

  test('конвертирует CSV в JSON', () => {
    const json = convertContent('name\nIvan\n', 'csv', 'json');

    expect(JSON.parse(json)).toEqual([{ name: 'Ivan' }]);
  });

  test('конвертирует файл и сохраняет результат', () => {
    fs.writeFileSync(path.join(directory, 'data.json'), '{"name":"Ivan"}', 'utf8');

    const result = convertFile({
      input: 'data.json',
      format: 'csv',
      cwd: directory
    });

    expect(fs.existsSync(result.output)).toBe(true);
    expect(fs.readFileSync(result.output, 'utf8')).toContain('Ivan');
  });

  test('выбрасывает ошибку для отсутствующего файла', () => {
    expect(() => convertFile({ input: 'missing.json', cwd: directory })).toThrow('не найден');
  });
});
