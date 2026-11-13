const path = require('path');

function displayPath(target, cwd = process.cwd()) {
  const relative = path.relative(cwd, target);

  if (!relative) {
    return '.';
  }

  if (relative.startsWith('..') || path.isAbsolute(relative)) {
    return target;
  }

  return relative.split(path.sep).join('/');
}

function displayOutputPath(target, cwd = process.cwd()) {
  const value = displayPath(target, cwd);

  if (value.startsWith('.')) {
    return value;
  }

  return `./${value}`;
}

module.exports = {
  displayPath,
  displayOutputPath
};
