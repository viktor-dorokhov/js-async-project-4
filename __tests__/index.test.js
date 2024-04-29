import {
  resolve,
  join,
  basename,
  dirname,
} from 'path';
import fs from 'fs/promises';
import { test, expect } from '@jest/globals';
import nock from 'nock';
import os from 'os';
import loadPage from '../src/index.js';

const dirR = '__fixtures__/';
const getFixturePath = (filename) => resolve(`${dirR}${filename}`);

const urlOrigin = 'https://ru.hexlet.io';
const urlPathName = '/courses';
const urlPathNameWrong = '/wrong';
const wrongDir = '/temp1';
const url = `${urlOrigin}${urlPathName}`;
const urlWrong = `${urlOrigin}${urlPathNameWrong}`;
const pathAssets = '/ru-hexlet-io-courses_files/';
const fileNameImg = 'ru-hexlet-io-assets-professions-nodejs.png';
const fileNameLink = 'ru-hexlet-io-assets-application.css';
const fileNameScript = 'ru-hexlet-io-packs-js-runtime.js';
const fileNameHtml = 'ru-hexlet-io-courses.html';
const pathAssetsImg = `${pathAssets}${fileNameImg}`;
const pathAssetsLink = `${pathAssets}${fileNameLink}`;
const pathAssetsScript = `${pathAssets}${fileNameScript}`;
const pathAssetsHtml = `${pathAssets}${fileNameHtml}`;
const urlPathNameImg = '/assets/professions/nodejs.png';
const urlPathNameLink = '/assets/application.css';
const urlPathNameScript = '/packs/js/runtime.js';
const urlPathNameHtml = '/courses';
const expectedFileName = 'ru-hexlet-io-courses.html';

const fixturePathImg = getFixturePath(pathAssetsImg);
const fixturePathLink = getFixturePath(pathAssetsLink);
const fixturePathScript = getFixturePath(pathAssetsScript);
const fixturePathHtml = getFixturePath(pathAssetsHtml);

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
    .replyWithFile(200, fixturePathImg)
    .get(urlPathNameLink)
    .replyWithFile(200, fixturePathLink)
    .get(urlPathNameScript)
    .replyWithFile(200, fixturePathScript)
    .get(urlPathNameHtml)
    .replyWithFile(200, fixturePathHtml);
});

test('root html file', async () => {
  const filePath = await loadPage(url, tempDir);
  const content = await fs.readFile(filePath, 'utf-8');
  expect(content).toEqual(expectedHtml);
  const fileName = basename(filePath);
  expect(fileName).toEqual(expectedFileName);
});

test('asset image', async () => {
  const filePath = await loadPage(url, tempDir);
  const dirPath = dirname(filePath);
  const stat = await fs.stat(resolve(`${dirPath}${pathAssetsImg}`));
  expect(stat.isFile()).toBe(true);
});

test('asset link', async () => {
  const filePath = await loadPage(url, tempDir);
  const dirPath = dirname(filePath);
  const stat = await fs.stat(resolve(`${dirPath}${pathAssetsLink}`));
  expect(stat.isFile()).toBe(true);
});

test('asset script', async () => {
  const filePath = await loadPage(url, tempDir);
  const dirPath = dirname(filePath);
  const stat = await fs.stat(resolve(`${dirPath}${pathAssetsScript}`));
  expect(stat.isFile()).toBe(true);
});

test('asset html', async () => {
  const filePath = await loadPage(url, tempDir);
  const dirPath = dirname(filePath);
  const stat = await fs.stat(resolve(`${dirPath}${pathAssetsHtml}`));
  expect(stat.isFile()).toBe(true);
});

test('wrong url', async () => {
  nock(urlOrigin)
    .get(urlPathNameWrong)
    .reply(404, null);
  await expect(loadPage(urlWrong, tempDir))
    .rejects.toThrow(`Request to ${urlWrong} failed with status code 404`);
});

test('wrong directory', async () => {
  await expect(loadPage(url, wrongDir))
    .rejects.toThrow(`Unable to create directory ${wrongDir}`);
});

// remove temp directories
// cd /tmp
// rm -rf $(find . -type d -name 'page-loader-*')
