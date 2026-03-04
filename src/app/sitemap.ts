import type { MetadataRoute } from 'next';
import { unstable_cache } from 'next/cache';
import { fetchStations, fetchRivers } from '@/src/lib/queries';
import { slugify } from '@/src/lib/slug';

const BASE_URL = 'https://vodnistav.cz';

const getCachedStations = unstable_cache(fetchStations, ['sitemap-stations'], {
  revalidate: 3600,
});
const getCachedRivers = unstable_cache(fetchRivers, ['sitemap-rivers'], { revalidate: 3600 });

const sitemap = async (): Promise<MetadataRoute.Sitemap> => {
  const [stations, rivers] = await Promise.all([getCachedStations(), getCachedRivers()]);

  const staticPages: MetadataRoute.Sitemap = [
    { url: BASE_URL, changeFrequency: 'daily', priority: 1.0 },
    { url: `${BASE_URL}/stanice`, changeFrequency: 'daily', priority: 0.8 },
    { url: `${BASE_URL}/cenik`, changeFrequency: 'monthly', priority: 0.3 },
    { url: `${BASE_URL}/dokumentace`, changeFrequency: 'monthly', priority: 0.3 },
  ];

  const stationPages: MetadataRoute.Sitemap = stations.map((s) => ({
    url: `${BASE_URL}/stanice/${slugify(s.name)}`,
    changeFrequency: 'hourly',
    priority: 0.6,
  }));

  const riverPages: MetadataRoute.Sitemap = rivers.map((r) => ({
    url: `${BASE_URL}/toky/${r.id}`,
    changeFrequency: 'hourly',
    priority: 0.6,
  }));

  return [...staticPages, ...stationPages, ...riverPages];
};

export default sitemap;
