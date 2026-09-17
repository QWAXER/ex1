const fs = require('fs');
const path = require('path');
const util = require('util');

// Преобразуем методы fs в промисы (как в fileOperationsPromises.js)
const readFile = util.promisify(fs.readFile);
const writeFile = util.promisify(fs.writeFile);
const unlink = util.promisify(fs.unlink);
const readdir = util.promisify(fs.readdir);
const stat = util.promisify(fs.stat);

/**
 * Ошибка операции с файлом.
 * Хранит код ошибки (ENOENT, EINVAL и т.д.), название операции и исходную ошибку.
 */
class FileOperationError extends Error {
  constructor(message, code, operation, cause = null) {
    super(message);
    this.name = 'FileOperationError';
    this.code = code;
    this.operation = operation;
    this.cause = cause;
  }
}

/**
 * Класс для работы с файлами с использованием колбэков И промисов.
 * Если последним аргументом метода передан callback — используется колбэк-стиль,
 * как в fileOperations.js. Если callback не передан — метод возвращает Promise,
 * как в fileOperationsPromises.js.
 */
class FileManagerHybrid {
  /**
   * Конструктор
   * @param {string} baseDir - базовая директория для операций
   */
  constructor(baseDir = './data-hybrid') {
    this.baseDir = baseDir;

    // Создаём директорию, если её нет (синхронно для простоты)
    if (!fs.existsSync(baseDir)) {
      fs.mkdirSync(baseDir, { recursive: true });
      console.log(`Создана директория: ${baseDir}`);
    }
  }

  /**
   * Проверка имени файла и оборачивание ошибок в FileOperationError.
   * Общая часть для обоих стилей, чтобы не дублировать код.
   */
  _checkFilename(filename, operation) {
    if (typeof filename !== 'string' || filename.trim() === '') {
      throw new FileOperationError('Имя файла должно быть непустой строкой', 'EINVAL', operation);
    }
  }

  _wrapError(err, operation) {
    if (err instanceof FileOperationError) return err;
    const code = err && err.code ? err.code : 'EUNKNOWN';
    return new FileOperationError(err.message, code, operation, err);
  }

  /**
   * Создание файла с содержимым (колбэк или промис)
   * @param {string} filename - имя файла
   * @param {string} content - содержимое
   * @param {Function} [callback] - (err, filePath) => void; если не передан — возвращается Promise<string>
   */
  createFile(filename, content, callback) {
    const filePath = path.join(this.baseDir, filename);

    if (typeof callback === 'function') {
      try {
        this._checkFilename(filename, 'createFile');
      } catch (err) {
        callback(err, null);
        return;
      }

      fs.writeFile(filePath, content, 'utf8', (err) => {
        if (err) {
          callback(this._wrapError(err, 'createFile'), null);
          return;
        }
        callback(null, filePath);
      });
      return;
    }

    return (async () => {
      try {
        this._checkFilename(filename, 'createFile');
        await writeFile(filePath, content, 'utf8');
        return filePath;
      } catch (err) {
        throw this._wrapError(err, 'createFile');
      }
    })();
  }

  /**
   * Чтение файла (колбэк или промис)
   * @param {string} filename - имя файла
   * @param {Function} [callback] - (err, content) => void; если не передан — возвращается Promise<string>
   */
  readFile(filename, callback) {
    const filePath = path.join(this.baseDir, filename);

    if (typeof callback === 'function') {
      try {
        this._checkFilename(filename, 'readFile');
      } catch (err) {
        callback(err, null);
        return;
      }

      fs.readFile(filePath, 'utf8', (err, data) => {
        if (err) {
          callback(this._wrapError(err, 'readFile'), null);
          return;
        }
        callback(null, data);
      });
      return;
    }

    return (async () => {
      try {
        this._checkFilename(filename, 'readFile');
        return await readFile(filePath, 'utf8');
      } catch (err) {
        throw this._wrapError(err, 'readFile');
      }
    })();
  }

  /**
   * Получение информации о файле (колбэк или промис)
   * @param {string} filename - имя файла
   * @param {Function} [callback] - (err, stats) => void; если не передан — возвращается Promise<Object>
   */
  getFileStats(filename, callback) {
    const filePath = path.join(this.baseDir, filename);

    if (typeof callback === 'function') {
      try {
        this._checkFilename(filename, 'getFileStats');
      } catch (err) {
        callback(err, null);
        return;
      }

      fs.stat(filePath, (err, stats) => {
        if (err) {
          callback(this._wrapError(err, 'getFileStats'), null);
          return;
        }
        callback(null, {
          size: stats.size,
          created: stats.birthtime,
          modified: stats.mtime,
          isFile: stats.isFile(),
        });
      });
      return;
    }

    return (async () => {
      try {
        this._checkFilename(filename, 'getFileStats');
        const stats = await stat(filePath);
        return {
          size: stats.size,
          created: stats.birthtime,
          modified: stats.mtime,
          isFile: stats.isFile(),
        };
      } catch (err) {
        throw this._wrapError(err, 'getFileStats');
      }
    })();
  }

  /**
   * Удаление файла (колбэк или промис)
   * @param {string} filename - имя файла
   * @param {Function} [callback] - (err) => void; если не передан — возвращается Promise<void>
   */
  deleteFile(filename, callback) {
    const filePath = path.join(this.baseDir, filename);

    if (typeof callback === 'function') {
      try {
        this._checkFilename(filename, 'deleteFile');
      } catch (err) {
        callback(err);
        return;
      }

      fs.unlink(filePath, (err) => {
        if (err) {
          callback(this._wrapError(err, 'deleteFile'));
          return;
        }
        callback(null);
      });
      return;
    }

    return (async () => {
      try {
        this._checkFilename(filename, 'deleteFile');
        await unlink(filePath);
      } catch (err) {
        throw this._wrapError(err, 'deleteFile');
      }
    })();
  }

  /**
   * Список файлов в директории (колбэк или промис)
   * @param {Function} [callback] - (err, files) => void; если не передан — возвращается Promise<string[]>
   */
  listFiles(callback) {
    if (typeof callback === 'function') {
      fs.readdir(this.baseDir, (err, files) => {
        if (err) {
          callback(this._wrapError(err, 'listFiles'), null);
          return;
        }

        // Фильтруем только файлы (не директории)
        const filePromises = files.map((file) => {
          return new Promise((resolve) => {
            const filePath = path.join(this.baseDir, file);
            fs.stat(filePath, (err, stats) => {
              resolve({ name: file, isFile: !err && stats.isFile() });
            });
          });
        });

        Promise.all(filePromises)
          .then((results) => {
            const onlyFiles = results.filter((r) => r.isFile).map((r) => r.name);
            callback(null, onlyFiles);
          })
          .catch((err) => callback(this._wrapError(err, 'listFiles'), null));
      });
      return;
    }

    return (async () => {
      try {
        const files = await readdir(this.baseDir);
        const fileStats = await Promise.all(
          files.map(async (file) => {
            const filePath = path.join(this.baseDir, file);
            const stats = await stat(filePath);
            return { name: file, isFile: stats.isFile() };
          })
        );
        return fileStats.filter((f) => f.isFile).map((f) => f.name);
      } catch (err) {
        throw this._wrapError(err, 'listFiles');
      }
    })();
  }

  /**
   * Создание нескольких файлов параллельно
   * @param {Array<{filename: string, content: string}>} files
   * @returns {Promise<string[]>} - массив путей
   */
  async createMultipleFiles(files) {
    const promises = files.map(({ filename, content }) => this.createFile(filename, content));
    return await Promise.all(promises);
  }

  /**
   * Чтение нескольких файлов параллельно
   * @param {string[]} filenames
   * @returns {Promise<Object>} - объект { filename: content }
   */
  async readMultipleFiles(filenames) {
    const promises = filenames.map(async (filename) => {
      const content = await this.readFile(filename);
      return { [filename]: content };
    });
    const results = await Promise.all(promises);
    return Object.assign({}, ...results);
  }
}

module.exports = { FileManagerHybrid, FileOperationError };
