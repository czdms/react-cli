//合并生产模式和开发模式的配置


const path = require("path");
//eslint插件
const EslintWebpackPlugin = require("eslint-webpack-plugin");
//处理html资源的插件
const HtmlWebpackPlugin = require("html-webpack-plugin");
//将css文件单独打包，并通过link标签引入html加载，提升性能的插件
const MiniCssExtractPlugin = require("mini-css-extract-plugin");
//压缩css的插件
const CssMinimizerWebpackExtractPlugin = require("css-minimizer-webpack-plugin");
//用于处理 js 的压缩的插件
const TerserWebpackExtractPlugin = require("terser-webpack-plugin");
//用于图片压缩的插件
const ImageMinimizerPlugin = require("image-minimizer-webpack-plugin");
//复制文件的插件
const CopyPlugin = require("copy-webpack-plugin");
//编写react代码 热更新的插件
const ReactRefreshWebpackPlugin = require("@pmmmwh/react-refresh-webpack-plugin");

//在node中，有全局变量process表示的是当前的node进程。
// process.env包含着关于系统环境的信息，但是process.env中并不存在NODE_ENV这个东西。
// NODE_ENV是一个用户自定义的变量，在webpack中它的用途是判断生产环境或开发环境。
//获取cross-env定义的环境变量
const isProduction = process.env.NODE_ENV === "production";
//封装css-loader
const getStyleLoader = (pre) => {
  return [
    isProduction ? MiniCssExtractPlugin.loader : "style-loader",
    "css-loader",
    {
      //处理css兼容性
      //配合package.json中browserlist来制定兼容性
      loader: "postcss-loader",
      options: {
        postcssOptions: {
          plugings: ["postcss-preset-env"],
        },
      },
    },
    pre && {
      loader: pre,
      options:
        pre === "less-loader"
          ? {
              //antd自定义主题配置
              lessOptions: {
                modifyVars: { "@primary-color": "#1DA57A" },
                javascriptEnabled: true,
              },
            }
          : {},
    },
  ].filter(Boolean);
};

module.exports = {
  //入口文件
  entry: "./src/main.js",
  output: {
    path: isProduction ? path.resolve(__dirname, "../dist") : undefined,
    filename: isProduction
      ? "static/js/[name].[contenthash:10].js"
      : "static/js/[name].js",
    chunkFilename: isProduction
      ? "static/js/[name].[contenthash:10].chunk.js"
      : "static/js/[name].chunk.js",
    assetModuleFilename: "static/media/[hash:10][ext][query]",
    clean: true,
  },
  module: {
    //处理css
    rules: [
      {
        test: /\.css$/,
        use: getStyleLoader(),
      },
      {
        test: /\.less$/,
        use: getStyleLoader("less-loader"),
      },
      {
        test: /\.s[ac]ss$/,
        use: getStyleLoader("sass-loader"),
      },
      {
        test: /\.styl$/,
        use: getStyleLoader("stylus-loader"),
      },
      //处理图片
      {
        test: /\.(jpe?g|png|gif|webp|svg)/,
        type: "asset",
        parser: {
          dataUrlCondition: {
            maxSize: 10 * 1024,
          },
        },
      },
      //处理其他资源
      {
        test: /\.(woff2?|ttf)/,
        type: "asset/resource",
      },
      //处理js
      {
        test: /\.jsx?$/,
        include: path.resolve(__dirname, "../src"),
        loader: "babel-loader",
        options: {
          cacheDirectory: true,
          cacheCompression: false,
          plugins: [
            !isProduction && "react-refresh/babel", //激活js的HMR
          ].filter(Boolean),
        },
      },
    ],
  },
  //处理html
  plugins: [
    new EslintWebpackPlugin({
      context: path.resolve(__dirname, "../src"),
      exclude: "node_modules",
      //缓存
      cache: true,
      cacheLocation: path.resolve(
        __dirname,
        "../node_modules/.cache/.eslintcache"
      ),
    }),
    new HtmlWebpackPlugin({
      // 以 public/index.html 为模板创建文件
      // 新的html文件有两个特点：1. 内容和源文件一致 2. 自动引入打包生成的js等资源
      template: path.resolve(__dirname, "../public/index.html"),
    }),

    isProduction &&
      new MiniCssExtractPlugin({
        filename: "static/css/[name].[contenthash:10].css",
        chunkFilename: "static/css/[name].[contenthash:10].chunk.css",
      }),
    isProduction &&
    //将public下面的资源复制到dist目录去（除了index.html）
      new CopyPlugin({
        patterns: [
          {
            //将
            from: path.resolve(__dirname, "../public"),
            to: path.resolve(__dirname, "../dist"),
            //忽略文件
            globOptions: {
              //忽略index.html
              ignore: ["**/index.html"],
            },
          },
        ],
      }),
      //对react进行热更新
    !isProduction && new ReactRefreshWebpackPlugin(),
  ].filter(Boolean),
  mode: isProduction ? "production" : "development",
  devtool: isProduction ? "source-map" : "cheap-module-source-map",
  optimization: {
    splitChunks: {
      chunks: "all",
      cacheGroups: {
        // react react-dom react-router-dom 一起打包成一个js文件
        react: {
            test: /[\\/]node_modules[\\/]react(.*)?[\\/]/,
            name: 'chunk-react',
            priority: 40,
        },
        //antd 单独打包
        antd: {
            test: /[\\/]node_modules[\\/]antd[\\/]/,
            name: 'chunk-antd',
            priority: 30,
        },
        //剩下node_modules单独打包
        lib: {
            test: /[\\/]node_modules[\\/]/,
            name: 'chunk-libs',
            priority: 20,
        }
      }
    },
    runtimeChunk: {
      name: (entrypoint) => `runtime~${entrypoint.name}`,
    },
    minimize: isProduction,
    minimizer: [
      //压缩CSS文件
      new CssMinimizerWebpackExtractPlugin(),
      //处理 js 的压缩
      new TerserWebpackExtractPlugin(),
      //压缩图片
      new ImageMinimizerPlugin({
        minimizer: {
          implementation: ImageMinimizerPlugin.imageminGenerate,
          options: {
            plugins: [
              ["gifsicle", { interlaced: true }],
              ["jpegtran", { progressive: true }],
              ["optipng", { optimizationLevel: 5 }],
              [
                "svgo",
                {
                  plugins: [
                    "preset-default",
                    "prefixIds",
                    {
                      name: "sortAttrs",
                      params: {
                        xmlnsOrder: "alphabetical",
                      },
                    },
                  ],
                },
              ],
            ],
          },
        },
      }),
    ],
  },
  devServer: {
    host: "localhost",
    //本来是3000的，但是另一个文件用了3000，打开页面会跳转到原本是3000的另一个页面，应该是开起来缓存的问题
    port: 3003,
    open: true,
    hot: true, //开启HMR
    historyApiFallback: true, //解决前端路由刷新404
  },
  //webpack解析模块加载选项
  resolve: {
    //自动补全文件加载名
    extensions: [".jsx", ".js", ".json"],
  },
  performance: false, //关闭性能分析，提升打包速度
};
