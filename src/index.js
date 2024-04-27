import axios from 'axios';
import fs from 'fs/promises';
import path from 'path';

export const getFileNameByUrl = (url) => {
  const cleanedUrl = url.trim().replace(/^https?:\/\//, '').replace(/\W/g, '-');
  return `${cleanedUrl}.html`;
};

/*
import fs from 'fs';
const downloadFile = (fileUrl, outputLocationPath) => {
  return axios({
    method: 'get',
    url: fileUrl,
    responseType: 'stream',
  }).then(response => {
    const filePath = path.join(outputLocationPath, getFileNameByUrl(fileUrl));
    const writer = fs.createWriteStream(filePath);
    response.data.pipe(writer);
    return filePath;
  });
}
*/

// https://stackforgeeks.com/blog/nodejs-axios-download-file-stream-and-writefile
const downloadFile = (fileUrl, outputLocationPath) => {
  const filePath = path.join(outputLocationPath, getFileNameByUrl(fileUrl));
  return axios({
    method: 'get',
    url: fileUrl,
    responseType: 'arraybuffer',
  })
    .then((response) => {
      const fileData = Buffer.from(response.data, 'binary');
      return fs.writeFile(filePath, fileData);
    })
    .then(() => filePath)
    .catch((err) => {
      throw new Error(`Request of ${fileUrl} failed with status code: ${err.response.status}`);
    });
};

const loadPage = (url, output) => (
  downloadFile(url, output).then((filepath) => filepath)
);

export default loadPage;
