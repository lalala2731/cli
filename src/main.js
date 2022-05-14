// 找到要执行的核心文件

/*
    eslint初始化
    1.npm i eslint
    npx eslint --init
    选择流行模板airbnb
    配置在javascript
*/
const program = require('commander');
const path = require('path');
const { version } = require('./constants');

// 配置命令的数组
const mapActions = {
  create: {
    alias: 'c',
    description: 'create a project',
    examples: [
      'my-cli create <project-name>',
    ],
  },
  config: {
    alias: 'conf',
    description: 'config project variable',
    examples: [
      'my-cli config set <k> <v>',
      'my-cli config get <k>',
    ],
  },
  '*': {
    alias: '',
    description: 'commannd not found',
    examples: [],
  },
};

// 批量产生cli命令 Object.keys()
Reflect.ownKeys(mapActions).forEach((action) => {
  // 设置cli的命令
  program
    .command(action)// 配置命令的名字 action是字符串
    .alias(mapActions[action].alias)// 命令的别名
    .description(mapActions[action].description)// 命令对应的描述
    .action(() => {
      // console.log(action);
      if (action === '*') {
        console.log(mapActions[action].description);
      } else { // create config
        // 如果命令很多，就要写很多个判断
        // 解决方案：根据命令建立命令文件
        // 把文件引进来即可
        require(path.resolve(__dirname, action))(...process.argv.slice(3));
      }
    });
});
// 监听用户的help事件
program.on('--help', () => {
  console.log('\nExamples:');
  Reflect.ownKeys(mapActions).forEach((action) => {
    mapActions[action].examples.forEach((example) => {
      console.log(`  ${example}`);
    });
  });
});

// // [node，my-cli，create，xxx]
// console.log(process.argv);

// 解析用户传递过来的参数
// my-cli --version
program.version(version).parse(process.argv);
