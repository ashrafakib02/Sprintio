/** @type {import("eslint").Linter.Config} */
module.exports = {
  extends: ['./base.js'],
  rules: {
    '@typescript-eslint/consistent-type-imports': 'warn',
    '@typescript-eslint/no-misused-promises': ['error', { checksVoidReturn: false }],
  },
};
