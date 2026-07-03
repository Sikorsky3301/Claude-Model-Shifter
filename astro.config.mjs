import { defineConfig } from 'astro/config';
import vercel from '@astrojs/vercel';

export default defineConfig({
  output: 'static',
  site: 'https://claude-shifter.app',
  adapter: vercel(),
});
