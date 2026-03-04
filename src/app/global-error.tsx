'use client';

interface GlobalErrorProps {
  error: Error;
  reset: () => void;
}

const GlobalError = ({ reset }: GlobalErrorProps) => (
  <html lang="cs">
    <body>
      <div style={{ padding: '2rem', textAlign: 'center', fontFamily: 'system-ui, sans-serif' }}>
        <h1 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>Nastala neočekávaná chyba</h1>
        <p style={{ color: '#666', marginBottom: '1.5rem' }}>
          Omlouváme se, něco se pokazilo. Zkuste to prosím znovu.
        </p>
        <button
          onClick={reset}
          style={{
            padding: '0.5rem 1.5rem',
            fontSize: '1rem',
            cursor: 'pointer',
            border: '1px solid #ccc',
            borderRadius: '4px',
            background: '#fff',
          }}
        >
          Zkusit znovu
        </button>
      </div>
    </body>
  </html>
);

export default GlobalError;
