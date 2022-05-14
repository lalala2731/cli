// 存放用户所需要的常量
const { version } = require('../package.json');
// 存储模板的位置
// mac是darwin，window是win32，
// 根目录mac在环境变量的HOME属性中，window在USERPROFILE中
// win: C:\Users\li mac:/Users/maoerbaby
const downloadDirectory = `${process.env[process.platform === 'darwin' ? 'HOME' : 'USERPROFILE']}\\.template`;

module.exports = {
  version,
  downloadDirectory,
};
