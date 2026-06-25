// Two test environments live in this repo: the Express backend (CommonJS, Node)
// and the Vite/React frontend (ESM + JSX, needs jsdom). Jest "projects" lets each
// run under the right environment from a single `jest` invocation at the repo root.
module.exports = {
  projects: [
    {
      displayName: 'backend',
      testEnvironment: 'node',
      testMatch: ['<rootDir>/backend/tests/**/*.test.js'],
      // Backend source is plain CommonJS — no transform needed.
      transform: {},
    },
    {
      displayName: 'frontend',
      testEnvironment: 'jsdom',
      testMatch: ['<rootDir>/frontend/src/**/*.test.{js,jsx}'],
      // The frontend deps (react, react-dom, react-spinners…) are installed under
      // frontend/node_modules, but jest + testing-library live at the repo root.
      // Add frontend/node_modules so both resolve to the same React instance.
      moduleDirectories: ['node_modules', '<rootDir>/frontend/node_modules'],
      // Mirror the Vite "@" -> src alias so imports resolve in tests too.
      moduleNameMapper: {
        '^@/(.*)$': '<rootDir>/frontend/src/$1',
      },
      // Babel config is inlined here (configFile/babelrc disabled) so it is scoped
      // to tests only and never interferes with the Vite build's own React plugin.
      transform: {
        '^.+\\.jsx?$': [
          'babel-jest',
          {
            configFile: false,
            babelrc: false,
            presets: [
              ['@babel/preset-env', { targets: { node: 'current' } }],
              ['@babel/preset-react', { runtime: 'automatic' }],
            ],
          },
        ],
      },
      setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
    },
  ],
};
