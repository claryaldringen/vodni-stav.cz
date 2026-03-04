import { describe, it, expect } from 'vitest';
import { apiError } from './errors';

describe('apiError', () => {
  it('returns correct JSON body', async () => {
    const response = apiError('Not found', 404);
    const body = await response.json();

    expect(body).toEqual({
      error: { message: 'Not found', status: 404 },
    });
  });

  it('sets correct status code', () => {
    expect(apiError('Bad Request', 400).status).toBe(400);
    expect(apiError('Internal Server Error', 500).status).toBe(500);
    expect(apiError('Unauthorized', 401).status).toBe(401);
  });

  it('returns NextResponse with JSON content type', () => {
    const response = apiError('test', 400);
    expect(response.headers.get('content-type')).toContain('application/json');
  });
});
