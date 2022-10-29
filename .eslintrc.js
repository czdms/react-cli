module.exports = {
  //继承‘react-app’的规则
    extends: ["react-app"], // 继承 react 官方规则
    //解析选项
    parserOptions: {
      babelOptions: {
        presets: [
          // 解决页面报错问题
          ["babel-preset-react-app", false],
          "babel-preset-react-app/prod",
        ],
      },
    },
  };