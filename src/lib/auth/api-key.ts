import { connectDb } from '../db';

const sha256 = async (data: string): Promise<string> => {
  const encoder = new TextEncoder();
  const buf = await crypto.subtle.digest('SHA-256', encoder.encode(data));
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
};

const randomHex = (bytes: number): string => {
  const arr = new Uint8Array(bytes);
  crypto.getRandomValues(arr);
  return Array.from(arr)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
};

export const generateApiKey = async () => {
  const raw = randomHex(24); // 48 hex chars
  const fullKey = `vsc_${raw}`;
  const prefix = fullKey.slice(0, 12);
  const keyHash = await sha256(fullKey);
  return { fullKey, prefix, keyHash };
};

interface CreatedApiKey {
  id: number;
  name: string;
  key_prefix: string;
  created_at: string;
  fullKey: string;
}

export const createApiKeyForUser = async (
  userId: string,
  name: string,
  mode: 'test' | 'live' = 'test',
): Promise<CreatedApiKey> => {
  const { fullKey, prefix, keyHash } = await generateApiKey();
  const sql = await connectDb();
  const rows = await sql<{ id: number; name: string; key_prefix: string; created_at: string }[]>`
    INSERT INTO api_key (user_id, name, key_prefix, key_hash, mode)
    VALUES (${userId}, ${name}, ${prefix}, ${keyHash}, ${mode})
    RETURNING id, name, key_prefix, created_at
  `;
  return { ...rows[0], fullKey };
};

// --- Validation cache (TTL 10s) to avoid DB write on every request ---

const CACHE_TTL_MS = 10_000;

interface CachedResult {
  userId: string;
  mode: 'test' | 'live';
  cachedAt: number;
}

const validationCache = new Map<string, CachedResult>();

export const validateApiKey = async (
  key: string,
): Promise<{ userId: string; mode: 'test' | 'live' } | null> => {
  const keyHash = await sha256(key);
  const now = Date.now();

  // Check cache first
  const cached = validationCache.get(keyHash);
  if (cached && now - cached.cachedAt < CACHE_TTL_MS) {
    return { userId: cached.userId, mode: cached.mode };
  }

  const sql = await connectDb();

  // Validate: SELECT instead of UPDATE for cached reads
  const rows = await sql<{ user_id: string; mode: string }[]>`
    SELECT user_id, mode FROM api_key
    WHERE key_hash = ${keyHash} AND is_active = true
  `;
  if (!rows[0]) {
    validationCache.delete(keyHash);
    return null;
  }

  const result = { userId: rows[0].user_id, mode: rows[0].mode as 'test' | 'live' };

  // Cache the result
  validationCache.set(keyHash, { ...result, cachedAt: now });

  // Update usage stats asynchronously (fire-and-forget)
  sql`
    UPDATE api_key
    SET last_used_at = NOW(), request_count = request_count + 1
    WHERE key_hash = ${keyHash}
  `.catch(() => {});

  return result;
};

export interface ApiKeyInfo {
  id: number;
  name: string;
  key_prefix: string;
  mode: 'test' | 'live';
  last_used_at: string | null;
  request_count: number;
  is_active: boolean;
  created_at: string;
}

export const listApiKeys = async (userId: string): Promise<ApiKeyInfo[]> => {
  const sql = await connectDb();
  return sql<ApiKeyInfo[]>`
    SELECT id, name, key_prefix, mode, last_used_at, request_count, is_active, created_at
    FROM api_key
    WHERE user_id = ${userId}
    ORDER BY created_at DESC
  `;
};

export const revokeApiKey = async (keyId: number, userId: string): Promise<boolean> => {
  const sql = await connectDb();
  const rows = await sql`
    UPDATE api_key SET is_active = false
    WHERE id = ${keyId} AND user_id = ${userId}
    RETURNING id
  `;
  return rows.length > 0;
};
