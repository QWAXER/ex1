const { FileManagerHybrid, FileOperationError } = require('./fileOperationsHybrid');

const fileManager = new FileManagerHybrid('./test-data-hybrid');

console.log('=== ТЕСТИРОВАНИЕ ГИБРИДНОГО МОДУЛЯ ===\n');

console.log('1. Создание файла (колбэк)...');
fileManager.createFile('test1.txt', 'Привет, мир!', (err, filePath) => {
  if (err) {
    console.error(' ❌ Ошибка создания:', err.message);
    return;
  }
  console.log(` ✅ Файл создан: ${filePath}`);

  console.log('\n2. Чтение файла (колбэк)...');
  fileManager.readFile('test1.txt', (err, content) => {
    if (err) {
      console.error(' ❌ Ошибка чтения:', err.message);
      return;
    }
    console.log(` ✅ Содержимое: "${content}"`);

    console.log('\n3. Попытка прочитать несуществующий файл (колбэк)...');
    fileManager.readFile('no-such-file.txt', (err) => {
      if (err instanceof FileOperationError) {
        console.log(` ⚠️  Ожидаемая ошибка: [${err.code}] ${err.message}`);
      }

      runPromisePart();
    });
  });
});

async function runPromisePart() {
  console.log('\n=== ТА ЖЕ ДИРЕКТОРИЯ, НО ЧЕРЕЗ ПРОМИСЫ ===\n');

  try {
    console.log('4. Чтение файла test1.txt, созданного колбэком, но через промис...');
    const content = await fileManager.readFile('test1.txt');
    console.log(` ✅ Содержимое: "${content}"`);

    console.log('\n5. Получение статистики (промис)...');
    const stats = await fileManager.getFileStats('test1.txt');
    console.log(` ✅ Размер: ${stats.size} байт, изменён: ${stats.modified}`);

    console.log('\n6. Создание нескольких файлов параллельно (промис)...');
    const paths = await fileManager.createMultipleFiles([
      { filename: 'test2.txt', content: 'Второй файл' },
      { filename: 'test3.txt', content: 'Третий файл' },
    ]);
    console.log(` ✅ Создано файлов: ${paths.length}`);

    console.log('\n7. Список файлов (промис)...');
    const files = await fileManager.listFiles();
    console.log(` ✅ Файлы в директории: ${files.join(', ')}`);

    console.log('\n8. Валидация: пустое имя файла (промис)...');
    try {
      await fileManager.readFile('');
    } catch (err) {
      console.log(` ⚠️  Ожидаемая ошибка: [${err.code}] ${err.message}`);
    }

    console.log('\n9. Очистка...');
    for (const file of files) {
      await fileManager.deleteFile(file);
      console.log(` ✅ ${file} удалён`);
    }

    console.log('\n✅ Все операции завершены! Оба стиля работают на одном классе.');
  } catch (error) {
    console.error('\n❌ Ошибка:', error.message);
  }
}
