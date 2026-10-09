import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import { readdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import site from './src/content/site.json' with { type: 'json' };

// GitHub Pages serves the site from a sub-folder (e.g. /mehrab-website).
// The GitHub workflow sets BASE_PATH and SITE_URL; locally and on Netlify they are empty → site lives at "/".
const base = (process.env.BASE_PATH || '/').replace(/\/?$/, '/');
const siteUrl = process.env.SITE_URL || site.siteUrl;

// After building, put the sub-folder in front of every root link ("/work" → "/mehrab-website/work").
function prefixLinks() {
  return {
    name: 'prefix-links',
    hooks: {
      'astro:build:done': async ({ dir }) => {
        if (base === '/') return;
        const b = base.slice(0, -1);
        const root = fileURLToPath(dir);
        const walk = async (d) => (await readdir(d, { withFileTypes: true })).flatMap((e) => (e.isDirectory() ? [] : [join(d, e.name)]))
          .concat(...(await Promise.all((await readdir(d, { withFileTypes: true })).filter((e) => e.isDirectory()).map((e) => walk(join(d, e.name))))));
        for (const file of (await walk(root)).filter((f) => f.endsWith('.html'))) {
          const html = await readFile(file, 'utf8');
          const out = html.replace(/(\s(?:href|src|action|data-src|poster)=")\/(?!\/)([^"]*)"/g, (m, attr, rest) =>
            ('/' + rest).startsWith(base) || '/' + rest === b ? m : `${attr}${b}/${rest}"`);
          if (out !== html) await writeFile(file, out);
        }
      },
    },
  };
}

export default defineConfig({
  site: siteUrl,
  base,
  trailingSlash: 'ignore',
  integrations: [sitemap(), prefixLinks()],
  devToolbar: { enabled: false },
});
