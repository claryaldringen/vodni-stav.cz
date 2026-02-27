import Typography from '@mui/material/Typography';
import { fetchStations } from '@/src/lib/queries';
import StationPicker from '@/src/components/station/StationPicker';

const StationsPage = async () => {
  const stations = await fetchStations();

  return (
    <>
      <Typography variant="h4" fontWeight={700} gutterBottom>
        Vodní stanice v ČR
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Vyberte měřicí stanici pro zobrazení aktuálních hladin a průtoků.
      </Typography>
      <StationPicker stations={stations} />
    </>
  );
};

export default StationsPage;
