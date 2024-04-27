#! /usr/bin/env node

import { program } from 'commander';
import loadPage from '../src/index.js';

const currentDir = process.cwd();

program
  .name('page-loader')
  .description('Page loader utility')
  .version('1.0.0');

program
  .option('-o, --output <dir>', 'output dir', currentDir)
  .arguments('<url>')
  .action((url, { output }) => {
    // const result = loadPage(url, output);
    loadPage(url, output).then((filepath) => {
      console.log(filepath);
    }).catch((err) => {
      console.log(err.message);
      // console.log('Page loader failure!');
      process.exit();
    });
    /* if (result) {
      console.log(result);
    } */
  });

program.parse();
