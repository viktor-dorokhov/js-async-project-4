#! /usr/bin/env node

import { program } from 'commander';
import axios from 'axios';
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
    loadPage(url, output).then((filepath) => {
      console.log(`Page was successfully downloaded into '${filepath}'`);
      process.exit(0);
    }).catch((err) => {
      if (axios.isAxiosError(err)) {
        const status = err.response?.status;
        const mainUrl = err.config.url;
        const mainErrorMessage = `Request to ${mainUrl} failed`;
        console.error(`${mainErrorMessage}${status ? ` with status code ${status}` : ''}`);
      } else {
        console.error(`An error has occurred: ${err.message}`);
      }
      process.exit(1);
    });
  });

program.parse();
