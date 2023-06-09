const path = require('path')
const TerserPlugin = require('terser-webpack-plugin')

const resolve = (dir) => path.resolve(__dirname, dir)

const webpackConfig = {
  devtool: 'source-map',
  mode: 'production',
  entry: './src/index.js',
  output: {
    path: resolve('../ceas-web/bx-admin-crud'),
    filename: 'bx-admin-crud.min.js',
    libraryTarget: 'umd'
  },
  module: {
    rules: [
      {
        test: /\.js$/,
        loader: 'babel-loader',
        exclude: /node_modules/
      },
      {
        test: /\.scss$/,
        loaders: ['style-loader', 'css-loader', 'sass-loader']
      }
    ]
  },
  resolve: {
    alias: {
      '@': resolve('src')
    }
  },
  optimization: {
    minimize: true,
    minimizer: [
      new TerserPlugin({
        sourceMap: false
      })
    ]
  }
}

module.exports = webpackConfig
