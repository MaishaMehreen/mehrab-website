// Generated so the sitemap link always matches the live address
export function GET({ site }) {
  const base = import.meta.env.BASE_URL.replace(/\/?$/, '/');
  return new Response(`User-agent: *\nAllow: /\n\nSitemap: ${new URL(`${base}sitemap-index.xml`, site).href}\n`, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
}
