/**
 * Base webpack config used across other specific configs
 */

const path = require('path');
const webpack = require('webpack');
const { dependencies: externals } = require('../app/package.json');

module.exports = {
  // Explicitly exclude node-gyp.  This causes some issues on macOS otherwise when yarn install is run.
  externals: ['node-gyp', ...Object.keys(externals || {})],

  module: {
    rules: [
      {
        test: /\.jsx?$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: {
            cacheDirectory: true,
          },
        },
      },
    ],
  },

  output: {
    path: path.join(__dirname, '..', 'app'),
    // https://github.com/webpack/webpack/issues/1114
    libraryTarget: 'commonjs2',
  },

  /**
   * Determine the array of extensions that should be used to resolve modules.
   */
  resolve: {
    extensions: ['.js', '.jsx', '.json'],
    modules: [path.join(__dirname, '..', 'app'), 'node_modules'],
  },

  plugins: [
    new webpack.EnvironmentPlugin({
      NODE_ENV: 'production',
    }),
  ],
};
