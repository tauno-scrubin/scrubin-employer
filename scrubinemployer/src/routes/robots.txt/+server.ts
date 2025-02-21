import { PUBLIC_ORIGIN } from '$env/static/public';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async () => {
  const robotsTxt = `
User-agent: *
Allow: /
Disallow: /admin/
Disallow: /api/

Sitemap: ${PUBLIC_ORIGIN}/sitemap.xml
`.trim();

  return new Response(robotsTxt, {
    headers: {
      'Content-Type': 'text/plain'
    }
  });
}; 