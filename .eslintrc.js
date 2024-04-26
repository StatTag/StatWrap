module.exports = {
  extends: 'erb',
  rules: {
    'react/destructuring-assignment': 0,
    'class-methods-use-this': 0,
    'no-plusplus': 0,
    'no-console': 0,
    'no-param-reassign': ['error', { props: false }],
    'import/no-extraneous-dependencies': ['error', { packageDir: __dirname }],
    'react/jsx-filename-extension': [1, { extensions: ['.js', '.jsx'] }],
    'react-hooks/rules-of-hooks': 0,
    'react/prefer-stateless-function': 0,
    'react/forbid-prop-types': 0,
    'react/no-children-prop': 0,
    'no-nested-ternary': 0,
    'prefer-regex-literals': 0,
    'jest/no-commented-out-tests': 0,
    'jest/no-standalone-expect': 0,
    'jest/expect-expect': 0,
    'no-unused-vars': 0,
  },
  settings: {
    'import/resolver': {
      webpack: {
        config: require.resolve('./configs/webpack.config.eslint.js'),
      },
    },
  },
};
