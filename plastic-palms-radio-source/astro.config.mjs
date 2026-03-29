import { defineConfig } from 'astro/config';

export default defineConfig({
  output: 'static',
  base: '/plastic-palms-radio',
  outDir: '../plastic-palms-radio',
  devToolbar: { enabled: false },
});
