import { NextRequest, NextResponse } from 'next/server';
import { validateApiKey, resolveApiKeyMode } from '../auth/api-key';
import { apiError } from './errors';
import { checkRateLimit } from './rate-limit';

const ALLOWED_ORIGINS = new Set([
  'https://vodnistav.cz',
  'https://www.vodnistav.cz',
]);

const getCorsOrigin = (request?: NextRequest): string => {
  const origin = request?.headers.get('origin') ?? '';
  return ALLOWED_ORIGINS.has(origin) ? origin : 'https://vodnistav.cz';
};

export const withCors = (response: NextResponse, request?: NextRequest): NextResponse => {
  response.headers.set('Access-Control-Allow-Origin', getCorsOrigin(request));
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, X-API-Key');
  return response;
};

export const handleOptions = (request?: NextRequest) =>
  withCors(new NextResponse(null, { status: 204 }), request);

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

  const mode = await resolveApiKeyMode(result.userId);

  if (mode === 'test') {
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

  return { userId: result.userId, mode };
};
