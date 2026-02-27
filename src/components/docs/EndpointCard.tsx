import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';
import Chip from '@mui/material/Chip';
import Box from '@mui/material/Box';
import type { ReactNode } from 'react';

interface EndpointCardProps {
  method: string;
  path: string;
  description: string;
  children?: ReactNode;
}

const methodColors: Record<string, 'success' | 'primary' | 'warning' | 'error'> = {
  GET: 'success',
  POST: 'primary',
  PUT: 'warning',
  DELETE: 'error',
};

const EndpointCard = ({ method, path, description, children }: EndpointCardProps) => (
  <Card variant="outlined" sx={{ mb: 3 }}>
    <CardContent>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
        <Chip label={method} color={methodColors[method] ?? 'default'} size="small" />
        <Typography
          variant="body1"
          sx={{ fontFamily: 'monospace', fontWeight: 600 }}
        >
          {path}
        </Typography>
      </Box>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        {description}
      </Typography>
      {children}
    </CardContent>
  </Card>
);

export default EndpointCard;
