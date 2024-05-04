//This is webpack.config.js
const path = require('path');
const webpack = require('webpack');

module.exports = {
  // The entry point file described above
  entry: './src/test.ts',
  // The location of the build folder described above
  output: {
    path: path.resolve(__dirname, 'docs/sjcllib'),
    filename: 'index.js'
  },
  /*
  module: {
    rules: [
      {
        test: /\.ts$/,
        use: {
          loader: 'ts-loader',
        },
      },
    ],
  },
  resolve: {
    extensions: ['.ts', '.js'],
  },*/
};