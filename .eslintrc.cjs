module.exports = {
  env: {
    browser: true,
    es2021: true,
    node: true,
    jest: true
  },
  extends: ['standard'],
  overrides: [
    {
      env: {
        node: true
      },
      files: ['.eslintrc.{js,cjs}'],
      parserOptions: {
        sourceType: 'script'
      }
    }
  ],
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module'
  },
  rules: {
    // TODO: Remove these relaxed rules after refactoring existing scripts
    'no-eval': 'warn', // AUTO-FARM.js and AUTO-IMAGE.js use eval for dynamic loading
    'no-unused-vars': 'warn',
    camelcase: 'warn'
  }
}
