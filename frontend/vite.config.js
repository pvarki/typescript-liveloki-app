import {defineConfig} from 'vite'

export default defineConfig({
  base: './',  // Use relative paths
  server: {
    proxy: {
      // TODO: would probably be a good idea to have all of the
      //       backend routes under a common prefix, like /api/
      '/events': 'http://localhost:3000',
    },
  },
});
