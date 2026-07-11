/** @type {import('commitlint').Config} */
module.exports = {
  extends: ['@commitlint/config-conventional'],

  rules: {
    // ----- Type -----
    'type-enum': [
      2,
      'always',
      [
        'feat', // A new feature
        'fix', // A bug fix
        'docs', // Documentation only changes
        'style', // Code style changes (formatting, missing semicolons, etc.)
        'refactor', // Code change that neither fixes a bug nor adds a feature
        'perf', // A code change that improves performance
        'test', // Adding or correcting tests
        'build', // Changes to build process or external dependencies
        'ci', // Changes to CI configuration files and scripts
        'chore', // Other changes that don't modify src or test files
        'revert', // Reverts a previous commit
      ],
    ],
    'type-case': [2, 'always', 'lower-case'],
    'type-empty': [2, 'never'],

    // ----- Scope -----
    'scope-case': [2, 'always', 'lower-case'],
    'scope-empty': [1, 'never'], // Warn if no scope — encourage adding one
    'scope-enum': [
      1,
      'always',
      [
        'core',
        'ui',
        'api',
        'auth',
        'db',
        'docs',
        'config',
        'ci',
        'deps',
        'monorepo',
        // Add more scopes as the project grows
      ],
    ],

    // ----- Subject -----
    'subject-case': [2, 'never', ['start-case', 'pascal-case', 'upper-case']],
    'subject-empty': [2, 'never'],
    'subject-full-stop': [2, 'never', '.'],
    'subject-max-length': [2, 'always', 72],

    // ----- Header (type + scope + subject combined) -----
    'header-max-length': [2, 'always', 100],

    // ----- Body -----
    'body-leading-blank': [2, 'always'],
    'body-max-line-length': [2, 'always', 200],

    // ----- Footer -----
    'footer-leading-blank': [2, 'always'],
    'footer-max-line-length': [2, 'always', 200],

    // ----- References -----
    'references-empty': [1, 'never'], // Warn if no issue reference
  },
};
