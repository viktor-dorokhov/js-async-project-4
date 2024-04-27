// import { fileURLToPath } from 'url';
import {
  resolve,
  // dirname,
  sep,
  join,
  basename,
} from 'path';
import fs from 'fs/promises';
import { test, expect } from '@jest/globals';
import nock from 'nock';
import os from 'os';
import loadPage from '../src/index.js';

// const __filename = fileURLToPath(import.meta.url);
// const __dirname = dirname(__filename);
// const dirA = `${__dirname}${sep}..${sep}__fixtures__${sep}`;
const dirR = `__fixtures__${sep}`;
const urlOrigin = 'https://ru.hexlet.io';
const urlPathName = '/courses';
const urlPathNameWrong = '/wrong';
const url = `${urlOrigin}${urlPathName}`;
const urlWrong = `${urlOrigin}${urlPathNameWrong}`;
const expectedFileName = 'ru-hexlet-io-courses.html';

let expectedHtml;
let tempDir;

const getFixturePath = (filename) => resolve(`${dirR}${filename}`);

nock.disableNetConnect();

beforeAll(async () => {
  expectedHtml = await fs.readFile(getFixturePath('expected.html'), 'utf-8');
});

beforeEach(async () => {
  tempDir = await fs.mkdtemp(join(os.tmpdir(), 'page-loader-'));
  nock(urlOrigin)
    .get(urlPathName)
    .reply(200, expectedHtml);
});

test('check file name', async () => {
  const filePath = await loadPage(url, tempDir);
  const fileName = basename(filePath);
  expect(fileName).toEqual(expectedFileName);
});

test('check file content', async () => {
  const filePath = await loadPage(url, tempDir);
  const content = await fs.readFile(filePath, 'utf-8');
  expect(content).toEqual(expectedHtml);
});

test('check wrong url', async () => {
  nock(urlOrigin)
    .get(urlPathNameWrong)
    .reply(404, null);
  await expect(loadPage(urlWrong, tempDir))
    .rejects.toThrow(`Request of ${urlWrong} failed with status code: 404`);
});

// TODO remove temp directories?
// rm -rf $(find . -type d -name 'page-loader-*')
