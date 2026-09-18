const fs = require('fs');
const path = require('path');
const util = require('util');

const readFile = util.promisify(fs.readFile);
const writeFile = util.promisify(fs.writeFile);
const unlink = util.promisify(fs.unlink);
const readdir = util.promisify(fs.readdir);
const stat = util.promisify(fs.stat);

class FileOperationError extends Error {
  constructor(message, code, operation, cause = null) {
    super(message);
    this.name = 'FileOperationError';
    this.code = code;
    this.operation = operation;
    this.cause = cause;
  }
}

class FileManagerHybrid {

  constructor(baseDir = './data-hybrid') {
    this.baseDir = baseDir;

    if (!fs.existsSync(baseDir)) {
      fs.mkdirSync(baseDir, { recursive: true });
      console.log(`Создана директория: ${baseDir}`);
    }
  }


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


  async createMultipleFiles(files) {
    const promises = files.map(({ filename, content }) => this.createFile(filename, content));
    return await Promise.all(promises);
  }

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
