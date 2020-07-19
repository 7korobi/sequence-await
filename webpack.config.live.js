const path = require('path')
const TerserPlugin = require('terser-webpack-plugin')

const dev = require('./webpack.config.dev')
const distPath = path.join(__dirname, 'dist/')

module.exports = Object.assign(dev, {
  entry: {
    index: __dirname + '/lib/index.ts',
  },
  output: {
    path: distPath,
    publicPath: '/',
    filename: '[name].js',
  },
  devServer: {
    contentBase: distPath,
  },

  optimization: {
    minimizer: [
      new TerserPlugin({
        extractComments: /^\**!|@preserve|@license|@cc_on|License/i,
      }),
    ],
  },
})
