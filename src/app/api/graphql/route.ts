import { createSchema, createYoga } from 'graphql-yoga';
import { typeDefs } from './schema';
import { resolvers } from './resolvers';
import { validateApiKey } from '@/src/lib/auth/api-key';

const yoga = createYoga({
  schema: createSchema({ typeDefs, resolvers }),
  graphqlEndpoint: '/api/graphql',
  fetchAPI: { Response },
  plugins: [
    {
      onRequest({ request, fetchAPI }) {
        // Allow GraphiQL GET requests without auth for exploration
        if (request.method === 'GET') return;

        // POST requests require API key
        const key = request.headers.get('X-API-Key');
        if (!key) {
          return new fetchAPI.Response(
            JSON.stringify({ error: { message: 'Chybí API klíč. Přidejte header X-API-Key.', status: 401 } }),
            { status: 401, headers: { 'Content-Type': 'application/json' } },
          ) as unknown as void;
        }
      },
      async onRequestParse({ request }) {
        if (request.method !== 'POST') return;
        const key = request.headers.get('X-API-Key');
        if (!key) return;

        const userId = await validateApiKey(key);
        if (!userId) {
          throw new Error('Neplatný nebo deaktivovaný API klíč.');
        }
      },
    },
  ],
  cors: {
    origin: '*',
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'X-API-Key'],
  },
});

export const GET = yoga;
export const POST = yoga;
export const OPTIONS = yoga;
