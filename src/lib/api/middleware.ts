import { NextRequest, NextResponse } from 'next/server';
import { validateApiKey } from '../auth/api-key';
import { apiError } from './errors';
import { checkRateLimit } from './rate-limit';

export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, X-API-Key',
};

export const withCors = (response: NextResponse): NextResponse => {
  for (const [key, value] of Object.entries(corsHeaders)) {
    response.headers.set(key, value);
  }
  return response;
};

export const handleOptions = () =>
  withCors(new NextResponse(null, { status: 204 }));

export const requireApiKey = async (
  request: NextRequest,
): Promise<{ userId: string; mode: 'test' | 'live' } | NextResponse> => {
  const key = request.headers.get('X-API-Key');
  if (!key) {
    return withCors(apiError('Chybí API klíč. Přidejte header X-API-Key.', 401));
  }

  const result = await validateApiKey(key);
  if (!result) {
    return withCors(apiError('Neplatný nebo deaktivovaný API klíč.', 401));
  }

  if (result.mode === 'test') {
    const keyHash = key.slice(0, 12);
    const { allowed, remaining } = checkRateLimit(keyHash);
    if (!allowed) {
      const res = withCors(
        apiError('Rate limit překročen. Test klíč: max 60 požadavků/min.', 429),
      );
      res.headers.set('X-RateLimit-Remaining', String(remaining));
      return res;
    }
  }

  return { userId: result.userId, mode: result.mode };
};
