import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';

export default defineConfig({
  root: 'src/ui',
  publicDir: '../../public',
  server: { port: Number(process.env.PORT ?? 8080), strictPort: true },
  build: {
    outDir: '../../dist-web',
    emptyOutDir: true,
  },
  environments: {
    client: {
      build: {
        rollupOptions: {
          input: {
            main: fileURLToPath(new URL('src/ui/index.html', import.meta.url)),
            help: fileURLToPath(new URL('src/ui/help/index.html', import.meta.url)),
          },
        },
      },
    },
  },
});
