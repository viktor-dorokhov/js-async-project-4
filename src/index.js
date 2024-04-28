import fs from 'fs/promises';
import path from 'path';
import axios, { AxiosError } from 'axios';
import * as cheerio from 'cheerio';

const regIsHttps = /^https?:\/\//;

const getMainFileName = (url) => {
  const convertedUrl = url.trim().replace(regIsHttps, '').replace(/\/$/, '').replace(/\W/g, '-');
  return `${convertedUrl}.html`;
};

const getExtName = (url) => {
  const pathname = regIsHttps.test(url) ? (new URL(url)).pathname : url;
  return path.extname(pathname);
};

const getNormalizedAssetUrl = (assetUrl, mainUrl) => {
  if (regIsHttps.test(assetUrl)) {
    return assetUrl;
  }
  return String(new URL(assetUrl, mainUrl));
};

const getAssetFileName = (assetUrl) => {
  // const pathname = regIsHttps.test(assetUrl) ? (new URL(assetUrl)).pathname: assetUrl;
  const { pathname } = new URL(assetUrl);
  const extname = getExtName(pathname);
  const convertedAssetUrl = assetUrl
    .replace(regIsHttps, '')
    .replace(/^\//, '')
    .slice(0, -extname.length)
    .replace(/\W/g, '-')
    .concat(extname);
  /* if (!regIsHttps.test(assetUrl)) {
    const mainUrlObject = new URL(mainUrl);
    return `${mainUrlObject.hostname.replace(/\W/g, '-')}-${convertedAssetUrl}`;
  } */
  return convertedAssetUrl;
};

const getMainDomain = (url) => {
  try {
    const { hostname } = new URL(url);
    const domains = hostname.split('.');
    return domains.slice(-2).join('.');
  } catch (e) {
    return null;
  }
};

const isLocalAssetUrl = (assetUrl, mainUrl) => (
  assetUrl
    && (!regIsHttps.test(assetUrl) || getMainDomain(assetUrl) === getMainDomain(mainUrl))
);

const assetMapping = [
  { tag: 'img', attr: 'src' },
  // { tag: 'link', attr: 'href' },
  // { tag: 'script', attr: 'src' },
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
  return axios({
    method: 'get',
    url: mainUrl,
    responseType: 'arraybuffer',
  })
    .then((response) => {
      fileData = Buffer.from(response.data, 'binary');
      htmlContent = cheerio.load(fileData);
      assetMapping.forEach(({ tag, attr }) => {
        const assets = htmlContent(tag);
        assets.each((_index, element) => {
          const assetAttrValue = htmlContent(element).attr(attr);
          // пока без расширения не работаем
          if (isLocalAssetUrl(assetAttrValue, mainUrl) && getExtName(assetAttrValue)) {
            const assetUrl = getNormalizedAssetUrl(assetAttrValue, mainUrl);
            const assetFileName = getAssetFileName(assetUrl);
            const assetPath = path.join(assetsPath, assetFileName);
            const localPath = path.join(assetsDirName, assetFileName);
            assetList.push({ tag, assetUrl, assetPath });
            htmlContent(element).attr(attr, localPath);
          }
        });
      });
    })
    .then(() => fs.mkdir(assetsPath, { recursive: true }))
    .then(() => {
      const promises = [];
      assetList.forEach(({ assetUrl, assetPath }) => {
        try {
          promises.push(axios({
            method: 'get',
            url: assetUrl,
            responseType: 'arraybuffer',
          })
            .then((responseAsset) => {
              const assetFileData = Buffer.from(responseAsset.data, 'binary');
              // console.log(`Tag: ${tag} Src: ${assetPath}`);
              return fs.writeFile(assetPath, assetFileData);
            }))
            .catch(() => { /* */ });
        } catch (e) { /* */ }
      });
      return promises;
    })
    .then((promises) => Promise.all(promises))
    .then(() => fs.writeFile(filePath, htmlContent.html())) // fileData
    .then(() => filePath)
    .catch((err) => {
      if (err instanceof AxiosError) {
        throw new Error(`Request of ${mainUrl} failed with status code: ${err.response.status}`);
      }
      throw new Error(err.message);
    });
};

export default loadPage;
