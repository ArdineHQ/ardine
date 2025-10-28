import { createYoga } from 'graphql-yoga';
import { schema } from '@/graphql/schema';
import { createContext } from '@/graphql/context';

/**
 * GraphQL Yoga server configuration
 */
const { handleRequest } = createYoga({
  schema,
  graphqlEndpoint: '/api/graphql',
  context: async ({ request }) => {
    return createContext(request);
  },
  // Enable GraphiQL in development
  graphiql: process.env.NODE_ENV === 'development',
  // Enable APQ (Automatic Persisted Queries)
  plugins: [],
  // CORS configuration
  cors: {
    origin: process.env.NODE_ENV === 'development' ? '*' : process.env.ALLOWED_ORIGINS?.split(',') || [],
    credentials: true,
  },
  // Logging
  logging: process.env.NODE_ENV === 'development' ? 'debug' : 'error',
  // Fetch API compatible
  fetchAPI: { Response },
});

/**
 * Next.js App Router handlers
 */
export async function GET(request: Request) {
  return handleRequest(request, {});
}

export async function POST(request: Request) {
  return handleRequest(request, {});
}

export async function OPTIONS(request: Request) {
  return handleRequest(request, {});
}
