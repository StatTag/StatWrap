module.exports = {
  extends: 'erb',
  rules: {
    'react/destructuring-assignment': 0,
    'class-methods-use-this': 'off',
    'no-plusplus': 'off'
  },
  settings: {
    'import/resolver': {
      webpack: {
        config: require.resolve('./configs/webpack.config.eslint.js')
      }
    }
  }
}
