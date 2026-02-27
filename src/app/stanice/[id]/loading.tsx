import Skeleton from '@mui/material/Skeleton';
import Box from '@mui/material/Box';

const Loading = () => (
  <>
    <Skeleton variant="text" width={160} height={32} sx={{ mb: 2 }} />
    <Skeleton variant="text" width="40%" height={40} />
    <Skeleton variant="text" width="25%" height={28} sx={{ mb: 3 }} />
    <Skeleton variant="rectangular" height={300} sx={{ mb: 3, borderRadius: 2 }} />
    <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
      {Array.from({ length: 4 }, (_, i) => (
        <Skeleton key={i} variant="rounded" width={64} height={32} />
      ))}
    </Box>
    <Skeleton variant="rectangular" height={350} sx={{ borderRadius: 2 }} />
  </>
);

export default Loading;
