#!/usr/bin/env node
const { main } = require('../cli');
const { printFatal } = require('../utils/errors');

main().catch((error) => {
  printFatal(error);
});
