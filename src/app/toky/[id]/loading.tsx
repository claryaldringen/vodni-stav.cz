import Skeleton from '@mui/material/Skeleton';
import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid';

const Loading = () => (
  <>
    <Skeleton variant="text" width={160} height={32} sx={{ mb: 2 }} />
    <Skeleton variant="text" width="35%" height={40} />
    <Skeleton variant="text" width="15%" height={20} sx={{ mb: 3 }} />
    <Skeleton variant="rectangular" height={300} sx={{ mb: 3, borderRadius: 2 }} />
    <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
      {Array.from({ length: 4 }, (_, i) => (
        <Skeleton key={i} variant="rounded" width={64} height={32} />
      ))}
    </Box>
    <Skeleton variant="rectangular" height={350} sx={{ mb: 4, borderRadius: 2 }} />
    <Skeleton variant="text" width="30%" height={32} sx={{ mb: 2 }} />
    <Grid container spacing={2}>
      {Array.from({ length: 3 }, (_, i) => (
        <Grid key={i} size={{ xs: 12, sm: 6, md: 4 }}>
          <Skeleton variant="rectangular" height={80} sx={{ borderRadius: 1 }} />
        </Grid>
      ))}
    </Grid>
  </>
);

export default Loading;
