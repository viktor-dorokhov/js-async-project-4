import fs from 'fs/promises';
import path from 'path';
import * as cheerio from 'cheerio';
import axios, { AxiosError } from 'axios';
import debug from 'debug';
import { addLogger } from 'axios-debug-log';

addLogger(axios);
const appLogger = debug('page-loader');
// const appLogger = console.log;

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
  } catch (e) {
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
  appLogger(`starting http request to ${mainUrl}`);
  return axios({
    method: 'get',
    url: mainUrl,
    responseType: 'arraybuffer',
  })
    .then((response) => {
      appLogger(`http request to ${mainUrl} was completed`);
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
    .then(() => (
      fs.mkdir(assetsPath, { recursive: true }).then(() => (
        appLogger(`directory ${assetsPath} was created`)
      ))))
    .then(() => {
      const promises = [];
      assetList.forEach(({ assetUrl, assetPath }) => {
        try {
          appLogger(`starting http request to ${assetUrl}`);
          promises.push(axios({
            method: 'get',
            url: assetUrl,
            responseType: 'arraybuffer',
          })
            .then((responseAsset) => {
              appLogger(`http request to ${assetUrl} was completed`);
              const assetFileData = Buffer.from(responseAsset.data, 'binary');
              // console.log(`Tag: ${tag} Src: ${assetPath}`);
              return fs.writeFile(assetPath, assetFileData).then(() => (
                appLogger(`file ${assetPath} was created`)
              ));
            }))
            .catch(() => { /* */ });
        } catch (e) { /* */ }
      });
      return promises;
    })
    .then((promises) => Promise.all(promises))
    .then(() => fs.writeFile(filePath, htmlContent.html()).then(() => (
      appLogger(`file ${filePath} was created`)
    ))) // fileData
    .then(() => filePath)
    .catch((err) => {
      if (err instanceof AxiosError) {
        throw new Error(`Request to ${mainUrl} failed with status code: ${err.response.status}`);
      }
      throw new Error(err.message);
    });
};

export default loadPage;
