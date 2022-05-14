/*
    create的功能是创建项目
    拉取你自己的所有项目列出来，让用户选 安装哪个项目
    （查看github api文档 developer.github.com/v3 查找仓库找用法）
    （api.github.com/orgs/组织名/仓库）
    （https://api.github.com/orgs/zhu-cli/repos 获取组织下的仓库）
    选完后，再显示所有的版本号
    可能还需要用户配置一些数据来结合渲染我的项目

*/
const axios = require('axios');
const path = require('path');
const fs = require('fs');
const ora = require('ora');
const inquirer = require('inquirer');// 提供选择
const { promisify } = require('util');
// const downloadGitRepo=require('download-git-repo')
const downloadGitRepo = promisify(require('download-git-repo'));
const ncp = promisify(require('ncp'));
const MetalSmith = require('metalsmith');
// consolidate统一了所有的模板引擎
let { render } = require('consolidate').ejs;
const { downloadDirectory } = require('./constants');

render = promisify(render);

// 将异步的api转化为promise
// downloadGitRepo = promisify(downloadGitRepo);
// 获取项目列表
const fetchRepoList = async () => {
  const { data } = await axios.get('https://api.github.com/orgs/zhu-cli/repos');
  return data;
};
// 获取tag列表
const fetchTagList = async (repo) => {
  const { data } = await axios.get(`https://api.github.com/repos/zhu-cli/${repo}/tags`);
  return data;
};
// 在后面的选项中每次都要有loading效果，故把loading封装
// 获取tags需要传版本参数，故利用柯里化思想把loading函数进行改造
const waitFnLoading = (fn, message) => async (...args) => {
  const spinner = ora(message);
  try {
    spinner.start();
    const result = await fn(...args);
    spinner.succeed();
    return result;
  } catch (e) {
    console.log(e);
    spinner.fail();
    return e;
  }
};
const download = async (repo, tag) => {
  let api = `zhu-cli/${repo}`;
  if (tag) {
    api += `#${tag}`;
  }
  const dest = `${downloadDirectory}\\${repo}`;
  await downloadGitRepo(api, dest);
  return dest;// 下载的最终目录
};
module.exports = async (projectName) => {
  // 1.获取项目的所有模板
//   const spinner = ora('fetching template ...');
//   spinner.start();
//   let repos = await fetchRepoList();
//   spinner.succeed();
  let repos = await waitFnLoading(fetchRepoList, 'fetching template ...')();
  repos = repos.map((item) => item.name);

  // 在获取之前 显示loading 关闭loading
  // 选择模板 inquirer
  const { repo } = await inquirer.prompt({
    name: 'repo', // 获取选择后的结果
    type: 'list',
    choices: repos,
    message: 'please choise a template to create project',
  });

  //   console.log(repo);
  // 2.根据选择的项目，拉取获取版本号
  // api.github.com/repos/zhu-cli/vue-template/tags
  let tags = await waitFnLoading(fetchTagList, 'fetching tag ...')(repo);
  tags = tags.map((item) => item.name);
  const { tag } = await inquirer.prompt({
    name: 'tag', // 获取选择后的结果
    type: 'list',
    choices: tags,
    message: 'please choise a tag to create project',
  });

  //   console.log(repo, tag);
  // 3.把模板放到一个临时目录里存好，以备后期使用
  // 固定的临时目录，一般放在根目录里（cd ~/ (C:Users/li)里的一个隐藏文件夹）
  //   const result = await download(repo, tag);
  // 下载的目录
  const result = await waitFnLoading(download, 'fetching project ...')(repo, tag);
  console.log(result);
  if (!fs.existsSync(path.join(result, 'ask.js'))) {
    // 4.1拿到下载的目录 简单的直接拷贝到当前执行的目录下即可
    await ncp(result, path.resolve(projectName));
    console.log('project success');
  } else {
    // 4.2复杂的需要进行模板渲染 然后再拷贝(需要配置package.json或有模板的)
    // 把git上的项目下载下来，如果有ask.js 文件就是一个复杂的模板
    // 需要用户选择，选择后编译模板
    // metalsmith 模板编译 都需要这个模板
    // consolidate整合所有的模板

    console.log('complex');

    //   1) _让用户填信息
    await new Promise((resolve, reject) => {
      MetalSmith(__dirname)// 如果传入路径，会默认遍历当前路径下的src文件夹
        .source(result)
        .destination(path.resolve(projectName))
        .use(async (files, metal, done) => {
          const args = require(path.join(result, 'ask.js'));
          const obj = await inquirer.prompt(args);// 用户填写的结果
          // 两个use里的metal是同一个
          const meta = metal.metadata();
          Object.assign(meta, obj);
          delete files['ask.js'];
          done();
        })
        .use((files, metal, done) => {
          //   2）用用户填写的信息渲染模板

          // 用户填的数据
          const obj = metal.metadata();
          Reflect.ownKeys(files).forEach(async (file) => {
            // 要处理的模板是js或者json文件
            if (file.includes('js') || file.includes('json')) {
              // 将二进制编码转为utf-8中文
              // 文件内容
              let content = files[file].contents.toString();
              // 有<%的是需要替换的文件
              if (content.includes('<%')) {
                content = await render(content, obj);
                // 文件内容替换 会自动输出到destination的目录中
                files[file].contents = Buffer.from(content);
                console.log('project success');
              }
            }
          });

          done();
        })
        .build((err) => {
          if (err) {
            reject();
          } else {
            resolve();
          }
        });
    });
  }
};
// 扩展config install  add,核心是靠模板渲染

/*
  发布包
  nrm use npm 切换官方npm源，发布到官方去
  npm addUser
  npm publish

  安装：
  npm unlink（是否要在这个目录下？）
  npm i xx -g

  卸包：
  npm unpublish --force
*/
