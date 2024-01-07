import {defineConfig} from 'vite';
import react from '@vitejs/plugin-react';

const config = defineConfig({
  plugins: [
    react({
      babel: {plugins: [['@babel/plugin-proposal-decorators', {version: '2023-01'}]]},
    }),
  ],
  base: '/sh-controller-model/',
});

export default config;
