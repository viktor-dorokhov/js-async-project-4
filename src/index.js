import fs from 'fs/promises';
import fsSync from 'fs';
import path from 'path';
import * as cheerio from 'cheerio';
import Listr from 'listr';
import axios from 'axios';
import debug from 'debug';
import { addLogger } from 'axios-debug-log';

addLogger(axios);
const appLogger = debug('page-loader');

const regIsHttps = /^https?:\/\//;

const getMainFileName = (url) => {
  // не вижу, что в данном случае дает path.parse, код только усложнится
  // console.log(path.parse('https://ru.hexlet.io/courses'));
  /*
  {
    root: '',
    dir: 'https://ru.hexlet.io',
    base: 'courses',
    ext: '',
    name: 'courses'
  }
  */
  const convertedUrl = url.trim().replace(regIsHttps, '').replace(/\/$/, '').replace(/\W/g, '-');
  return `${convertedUrl}.html`;
};

const getExtName = (url, defaultExtName = '') => {
  const pathname = regIsHttps.test(url) ? (new URL(url)).pathname : url;
  return path.extname(pathname) || defaultExtName;
};

const isDataAttr = (value) => value.startsWith('data:');

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

const getLocalAssetPromise = (assetUrl, assetPath) => {
  appLogger(`Logger: starting http request to ${assetUrl} for local asset`);
  const promiseAsset = axios({
    method: 'get',
    url: assetUrl,
    responseType: 'arraybuffer',
  })
    .then((responseAsset) => {
      const assetFileData = Buffer.from(responseAsset.data, 'binary');
      return fs.writeFile(assetPath, assetFileData);
    });

  return promiseAsset;
};

const loadPage = (mainUrl, outputLocationPath = process.cwd()) => {
  if (!fsSync.existsSync(outputLocationPath)) {
    // добавлено, чтобы пройти новые автотесты
    // но раньше в конце апреля такого требования не было
    // директория создавалась в fs.writeFile, если были на это права
    return Promise.reject(new Error(`Directory ${outputLocationPath} is not exists`));
  }
  const htmlFileName = getMainFileName(mainUrl);
  const filePath = path.join(outputLocationPath, htmlFileName);
  const assetsDirName = `${path.parse(htmlFileName).name}_files`;
  const assetsPath = path.resolve(path.join(outputLocationPath, assetsDirName));
  const assetList = [];
  appLogger(`Logger: starting http request to ${mainUrl}`);
  return axios({
    method: 'get',
    url: mainUrl,
    responseType: 'arraybuffer',
  })
    .then((response) => {
      appLogger('Logger: extracting links from root HTML file');
      const fileData = Buffer.from(response.data, 'binary');
      const htmlContent = cheerio.load(fileData);
      assetMapping.forEach(({ tag, attr, defaultExtName }) => {
        const assets = htmlContent(tag);
        assets.each((_index, element) => {
          const assetAttrValue = htmlContent(element).attr(attr);
          if (isLocalAssetUrl(assetAttrValue, mainUrl)
            && getExtName(assetAttrValue, defaultExtName)
            && !isDataAttr(assetAttrValue)) {
            const assetUrl = getNormalizedAssetUrl(assetAttrValue, mainUrl);
            const assetFileName = getAssetFileName(assetUrl, defaultExtName);
            const assetPath = path.join(assetsPath, assetFileName);
            const localPath = path.join(assetsDirName, assetFileName);
            assetList.push({ tag, assetUrl, assetPath });
            htmlContent(element).attr(attr, localPath);
          }
        });
      });
      return htmlContent;
    })
    .then((htmlContent) => {
      appLogger(`Logger: creating file ${filePath}`);
      return fs.writeFile(filePath, htmlContent.html());
    })
    .then(() => {
      appLogger(`Logger: creating directory ${assetsPath}`);
      return fs.mkdir(assetsPath, { recursive: true });
    })
    .then(() => {
      appLogger('Logger: downloading local assets');
      const tasks = assetList.map(({ assetUrl, assetPath }) => (
        {
          title: assetUrl,
          task: () => getLocalAssetPromise(assetUrl, assetPath),
        }
      ));
      return new Listr(tasks, { concurrent: true, exitOnError: false });
    })
    .then((listr) => listr.run())
    .catch((err) => {
      // ignore Listr errors to prevent app crash
      if (err.constructor.name !== 'ListrError') {
        throw err;
      }
    })
    .then(() => filePath);
};

export default loadPage;
