import { describe, it, expect } from 'vitest';
import { apiSuccess } from './responses';

describe('apiSuccess', () => {
  it('returns data without meta', async () => {
    const response = apiSuccess({ id: 1, name: 'test' });
    const body = await response.json();

    expect(body).toEqual({ data: { id: 1, name: 'test' } });
    expect(body).not.toHaveProperty('meta');
  });

  it('returns data with meta', async () => {
    const response = apiSuccess([1, 2, 3], { count: 3 });
    const body = await response.json();

    expect(body).toEqual({ data: [1, 2, 3], meta: { count: 3 } });
  });

  it('returns 200 status', () => {
    expect(apiSuccess('ok').status).toBe(200);
  });

  it('returns JSON content type', () => {
    const response = apiSuccess(null);
    expect(response.headers.get('content-type')).toContain('application/json');
  });

  it('handles null data', async () => {
    const body = await apiSuccess(null).json();
    expect(body).toEqual({ data: null });
  });

  it('handles empty array', async () => {
    const body = await apiSuccess([], { count: 0 }).json();
    expect(body).toEqual({ data: [], meta: { count: 0 } });
  });
});
