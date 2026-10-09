import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import site from './src/content/site.json' with { type: 'json' };

export default defineConfig({
  site: site.siteUrl,
  trailingSlash: 'ignore',
  integrations: [sitemap()],
  devToolbar: { enabled: false },
});
