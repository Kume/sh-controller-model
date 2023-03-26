import {defineConfig} from 'vite';
import babel from 'vite-plugin-babel';
import react from '@vitejs/plugin-react';

const config = defineConfig({
  plugins: [
    react(),
    babel({
      babelConfig: {
        babelrc: false,
        configFile: false,
        plugins: [['@babel/plugin-proposal-decorators', {version: '2023-01'}]],
      },
    }),
  ],
});

console.log('xxxx config', config);

export default config;
