import fs from 'fs/promises';
import path from 'path';
import * as cheerio from 'cheerio';
import axios from 'axios';
import debug from 'debug';
import { addLogger } from 'axios-debug-log';

addLogger(axios);
const appLogger = debug('page-loader');

const regIsHttps = /^https?:\/\//;

const getMainFileName = (url) => {
  const convertedUrl = url.trim().replace(regIsHttps, '').replace(/\/$/, '').replace(/\W/g, '-');
  return `${convertedUrl}.html`;
};

const getExtName = (url, defaultExtName = '') => {
  const pathname = regIsHttps.test(url) ? (new URL(url)).pathname : url;
  return path.extname(pathname) || defaultExtName;
};

const getNormalizedAssetUrl = (assetUrl, mainUrl) => {
  if (regIsHttps.test(assetUrl)) {
    return assetUrl;
  }
  return String(new URL(assetUrl, mainUrl));
};

const getAssetFileName = (assetUrl, defaultExtName) => {
  const { pathname } = new URL(assetUrl);
  const extname = getExtName(pathname);
  const convertedAssetUrl = assetUrl
    .replace(regIsHttps, '')
    .replace(/^\//, '')
    .slice(0, extname ? -extname.length : undefined)
    .replace(/\W/g, '-')
    .concat(extname || defaultExtName);
  return convertedAssetUrl;
};

const geHostName = (url) => {
  try {
    const { hostname } = new URL(url);
    return hostname;
  } catch (err) {
    return null;
  }
};

const isLocalAssetUrl = (assetUrl, mainUrl) => (
  assetUrl
    && (!regIsHttps.test(assetUrl) || geHostName(assetUrl) === geHostName(mainUrl))
);

const assetMapping = [
  { tag: 'img', attr: 'src', defaultExtName: '' },
  { tag: 'link', attr: 'href', defaultExtName: '.html' },
  { tag: 'script', attr: 'src', defaultExtName: '.js' },
];

const loadPage = (mainUrl, outputLocationPath) => {
  const htmlFileName = getMainFileName(mainUrl);

  const filePath = path.join(outputLocationPath, htmlFileName);
  const assetsDirName = `${path.parse(htmlFileName).name}_files`;
  const assetsPath = path.resolve(path.join(outputLocationPath, assetsDirName));
  const assetList = [];
  let htmlContent;
  let fileData;
  // https://stackforgeeks.com/blog/nodejs-axios-download-file-stream-and-writefile
  appLogger(`Logger: starting http request to ${mainUrl}`);
  return axios({
    method: 'get',
    url: mainUrl,
    responseType: 'arraybuffer',
  })
    .then((response) => {
      appLogger(`Logger: http request to ${mainUrl} was completed`);
      fileData = Buffer.from(response.data, 'binary');
      htmlContent = cheerio.load(fileData);
      assetMapping.forEach(({ tag, attr, defaultExtName }) => {
        const assets = htmlContent(tag);
        assets.each((_index, element) => {
          const assetAttrValue = htmlContent(element).attr(attr);
          if (isLocalAssetUrl(assetAttrValue, mainUrl)
            && getExtName(assetAttrValue, defaultExtName)) {
            const assetUrl = getNormalizedAssetUrl(assetAttrValue, mainUrl);
            const assetFileName = getAssetFileName(assetUrl, defaultExtName);
            const assetPath = path.join(assetsPath, assetFileName);
            const localPath = path.join(assetsDirName, assetFileName);
            assetList.push({ tag, assetUrl, assetPath });
            htmlContent(element).attr(attr, localPath);
          }
        });
      });
    })
    .catch((err) => {
      if (err.response.status !== 200) {
        throw new Error(`Request to ${mainUrl} failed with status code ${err.response.status}`);
      }
    })
    .then(() => (
      fs.mkdir(assetsPath, { recursive: true }).then(() => (
        appLogger(`Logger: directory ${assetsPath} was created`)
      )).catch(() => {
        appLogger(`Logger: directory ${assetsPath} was not created`);
        throw new Error(`Unable to create directory ${assetsPath}`);
      })))
    .then(() => {
      const promises = [];
      assetList.forEach(({ assetUrl, assetPath }) => {
        try {
          appLogger(`Logger: starting http request to ${assetUrl}`);
          promises.push(axios({
            method: 'get',
            url: assetUrl,
            responseType: 'arraybuffer',
          })
            .then((responseAsset) => {
              appLogger(`Logger: http request to ${assetUrl} was completed`);
              const assetFileData = Buffer.from(responseAsset.data, 'binary');
              return fs.writeFile(assetPath, assetFileData).then(() => (
                appLogger(`Logger: file ${assetPath} was created`)
              ));
            }))
            .catch(() => { /* */ });
        } catch (err) { /* */ }
      });
      return promises;
    })
    .then((promises) => Promise.all(promises))
    .then(() => fs.writeFile(filePath, htmlContent.html()).then(() => (
      appLogger(`Logger: file ${filePath} was created`)
    ))) // fileData
    .then(() => filePath);
};

export default loadPage;
