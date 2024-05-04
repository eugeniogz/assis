const path = require('path');
const webpack = require('webpack');

module.exports = {
  // The entry point file described above
  entry: './src/index.ts',
  // The location of the build folder described above
  output: {
    path: path.resolve(__dirname, 'docs/sjcllib'),
    filename: 'index.js'
  },
  module: {
    rules: [
      {
        test: /\.ts$/,
        use: {
          loader: 'ts-loader',
          options: {
            transpileOnly: true,
          },
        },
      },
    ],
  },
  resolve: {
    extensions: ['.ts', '.js'],
  },
  // Optional and for development only. This provides the ability to
  // map the built code back to the original source format when debugging.
  devtool: 'eval-source-map',
};