'use client';

import { useState } from 'react';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import IconButton from '@mui/material/IconButton';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import Typography from '@mui/material/Typography';

interface CodeBlockProps {
  children: string;
  language?: string;
}

const CodeBlock = ({ children, language }: CodeBlockProps) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(children);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Paper
      variant="outlined"
      sx={{
        position: 'relative',
        bgcolor: 'grey.50',
        my: 2,
        overflow: 'auto',
      }}
    >
      {language && (
        <Typography
          variant="caption"
          sx={{ position: 'absolute', top: 4, left: 8, color: 'text.secondary' }}
        >
          {language}
        </Typography>
      )}
      <IconButton
        size="small"
        onClick={handleCopy}
        sx={{ position: 'absolute', top: 4, right: 4 }}
      >
        <ContentCopyIcon fontSize="small" />
      </IconButton>
      {copied && (
        <Typography
          variant="caption"
          color="success.main"
          sx={{ position: 'absolute', top: 10, right: 40 }}
        >
          Zkopírováno!
        </Typography>
      )}
      <Box
        component="pre"
        sx={{
          p: 2,
          pt: language ? 4 : 2,
          m: 0,
          fontFamily: 'monospace',
          fontSize: '0.85rem',
          lineHeight: 1.6,
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
        }}
      >
        {children}
      </Box>
    </Paper>
  );
};

export default CodeBlock;
