import type { MetadataRoute } from 'next';

const robots = (): MetadataRoute.Robots => ({
  rules: {
    userAgent: '*',
    allow: '/',
    disallow: ['/ucet', '/prihlaseni', '/registrace', '/api/'],
  },
  sitemap: 'https://vodnistav.cz/sitemap.xml',
});

export default robots;
