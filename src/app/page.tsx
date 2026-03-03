import type { Metadata } from 'next';
import Typography from '@mui/material/Typography';
import { unstable_cache } from 'next/cache';
import { fetchRivers } from '@/src/lib/queries';
import RiverPicker from '@/src/components/river/RiverPicker';

export const metadata: Metadata = {
  title: 'Toky v ČR — přehled řek a jejich vodních stavů',
  description:
    'Přehled toků v České republice s aktuálními průměrnými průtoky a hladinami. Data z ČHMÚ.',
};

const getCachedRivers = unstable_cache(fetchRivers, ['rivers'], { revalidate: 600 });

const HomePage = async () => {
  const rivers = await getCachedRivers();

  return (
    <>
      <Typography variant="h4" fontWeight={700} gutterBottom>
        Toky v ČR
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Vyberte tok pro zobrazení průměrného průtoku a hladiny ze všech stanic.
      </Typography>
      <RiverPicker rivers={rivers} />
    </>
  );
};

export default HomePage;
