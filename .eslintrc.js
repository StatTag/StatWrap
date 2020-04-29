module.exports = {
  extends: 'erb',
  rules: {
    'react/destructuring-assignment': 0
  },
  settings: {
    'import/resolver': {
      webpack: {
        config: require.resolve('./configs/webpack.config.eslint.js')
      }
    }
  }
}
