const nextJest = require('next/jest');
const createJestConfig = nextJest({ dir: './' });
module.exports = createJestConfig({ testMatch: ['**/__tests__/**/*.test.[jt]s?(x)'] });
