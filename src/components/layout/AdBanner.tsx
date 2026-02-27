import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';

interface AdBannerProps {
  position: 'top' | 'sidebar' | 'bottom';
}

const sizes: Record<AdBannerProps['position'], { w: number; h: number }> = {
  top: { w: 728, h: 90 },
  bottom: { w: 728, h: 90 },
  sidebar: { w: 300, h: 250 },
};

const AdBanner = ({ position }: AdBannerProps) => {
  const { w, h } = sizes[position];

  const isHorizontal = position === 'top' || position === 'bottom';
  const isSidebar = position === 'sidebar';

  return (
    <Box
      sx={{
        display: isHorizontal ? { xs: 'none', md: 'flex' } : { xs: 'none', lg: 'flex' },
        justifyContent: 'center',
        ...(isSidebar && { position: 'sticky', top: 80, flex: 1 }),
      }}
    >
      <Box
        sx={{
          width: isSidebar ? '100%' : w,
          height: isSidebar ? '100%' : h,
          minHeight: isSidebar ? 600 : undefined,
          border: '1px dashed',
          borderColor: 'grey.300',
          bgcolor: 'grey.50',
          borderRadius: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Typography variant="caption" color="text.disabled">
          Reklama {isSidebar ? 'sidebar' : `${w}×${h}`}
        </Typography>
      </Box>
    </Box>
  );
};

export default AdBanner;
