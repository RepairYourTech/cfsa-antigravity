module.exports = {
    extends: ['@commitlint/config-conventional'],
    rules: {
        'type-enum': [
            2,
            'always',
            [
                'feat',     // New feature or capability
                'fix',      // Bug fix
                'docs',     // Documentation only
                'style',    // Formatting, no code change
                'refactor', // Code change, no feature or fix
                'perf',     // Performance improvement
                'test',     // Adding or updating tests
                'build',    // Build system or dependencies
                'ci',       // CI/CD changes
                'chore',    // Maintenance tasks
                'revert',   // Revert a previous commit
            ],
        ],
        'subject-case': [2, 'never', ['start-case', 'pascal-case', 'upper-case']],
        'header-max-length': [2, 'always', 100],
    },
};
