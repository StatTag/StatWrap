/* eslint global-require: off */

const developmentEnvironments = ['development', 'test'];

const developmentPlugins = [];

const productionPlugins = [
  require('babel-plugin-dev-expression'),

  // babel-preset-react-optimize
  require('@babel/plugin-transform-react-constant-elements'),
  require('@babel/plugin-transform-react-inline-elements'),
  require('babel-plugin-transform-react-remove-prop-types'),
];

module.exports = (api) => {
  // see docs about api at https://babeljs.io/docs/en/config-files#apicache

  const development = api.env(developmentEnvironments);

  return {
    presets: [
      [
        require('@babel/preset-env'),
        // After upgrading electron, this started throwing errors for some reason.  Commenting out
        // as it doesn't seem to be needed, but leaving in in case we need to revert.
        // {
        //   targets: { electron: require('electron/package.json').version }
        // }
      ],
      require('@babel/preset-flow'),
      [require('@babel/preset-react'), { development }],
    ],
    plugins: [
      // Stage 0
      require('@babel/plugin-proposal-function-bind'),

      // Stage 1
      require('@babel/plugin-proposal-export-default-from'),
      require('@babel/plugin-proposal-logical-assignment-operators'),
      [require('@babel/plugin-transform-optional-chaining'), { loose: false }],
      [require('@babel/plugin-proposal-pipeline-operator'), { proposal: 'minimal' }],
      [require('@babel/plugin-proposal-nullish-coalescing-operator'), { loose: false }],

      // Disable warnings
      ['@babel/plugin-proposal-private-methods', { loose: true }],
      ['@babel/plugin-transform-private-property-in-object', { loose: true }],

      require('@babel/plugin-proposal-do-expressions'),

      // Stage 2
      [require('@babel/plugin-proposal-decorators'), { legacy: true }],
      require('@babel/plugin-proposal-function-sent'),
      require('@babel/plugin-proposal-export-namespace-from'),
      require('@babel/plugin-proposal-numeric-separator'),
      require('@babel/plugin-proposal-throw-expressions'),

      // Stage 3
      require('@babel/plugin-syntax-dynamic-import'),
      require('@babel/plugin-syntax-import-meta'),
      [require('@babel/plugin-proposal-class-properties'), { loose: true }],
      require('@babel/plugin-proposal-json-strings'),

      ...(development ? developmentPlugins : productionPlugins),
    ],
  };
};
