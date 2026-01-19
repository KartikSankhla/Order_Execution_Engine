module.exports = {
    preset: 'ts-jest',
    testEnvironment: 'node',
    verbose: true,
    roots: ['<rootDir>/src', '<rootDir>/tests'],
    testMatch: ['**/*.test.ts'],
    forceExit: true, // Force exit after tests as we might have open handles
    moduleNameMapper: {
        '^uuid$': require.resolve('uuid'),
    },
};
