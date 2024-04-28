// import { fileURLToPath } from 'url';
import {
  resolve,
  // dirname,
  sep,
  join,
  basename,
  dirname,
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

const getFixturePath = (filename) => resolve(`${dirR}${filename}`);

const urlOrigin = 'https://ru.hexlet.io';
const urlPathName = '/courses';
const urlPathNameWrong = '/wrong';
const url = `${urlOrigin}${urlPathName}`;
const urlWrong = `${urlOrigin}${urlPathNameWrong}`;
const pathAssets = '/ru-hexlet-io-courses_files/';
const fileNameImg = 'ru-hexlet-io-assets-professions-nodejs.png';
const pathAssetsImg = `${pathAssets}${fileNameImg}`;
const urlPathNameImg = '/assets/professions/nodejs.png';
const expectedFileName = 'ru-hexlet-io-courses.html';

const fixturePathImg = getFixturePath(pathAssetsImg);

console.log(urlPathNameImg);
console.log(fixturePathImg);

let originHtml;
let expectedHtml;
let tempDir;

nock.disableNetConnect();

beforeAll(async () => {
  expectedHtml = await fs.readFile(getFixturePath('expected.html'), 'utf-8');
  originHtml = await fs.readFile(getFixturePath('origin.html'), 'utf-8');
});

beforeEach(async () => {
  tempDir = await fs.mkdtemp(join(os.tmpdir(), 'page-loader-'));
  nock(urlOrigin)
    .get(urlPathName)
    .reply(200, originHtml)
    .get(urlPathNameImg)
    .replyWithFile(200, fixturePathImg);
});

test('root html file', async () => {
  const filePath = await loadPage(url, tempDir);
  const content = await fs.readFile(filePath, 'utf-8');
  expect(content).toEqual(expectedHtml);
  const fileName = basename(filePath);
  expect(fileName).toEqual(expectedFileName);
});

test('image', async () => {
  const filePath = await loadPage(url, tempDir);
  const dirPath = dirname(filePath);
  const stat = await fs.stat(resolve(`${dirPath}${pathAssetsImg}`));
  expect(stat.isFile()).toBe(true);
});

test('wrong url', async () => {
  nock(urlOrigin)
    .get(urlPathNameWrong)
    .reply(404, null);
  await expect(loadPage(urlWrong, tempDir))
    .rejects.toThrow(`Request of ${urlWrong} failed with status code: 404`);
});

// TODO remove temp directories?
// rm -rf $(find . -type d -name 'page-loader-*')
