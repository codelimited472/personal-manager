import { createBrowserClient } from '@supabase/ssr';

export function createClient() {
  let url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  if (url) url = url.replace(/\/rest\/v1\/?$/, '');
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    // Return a mock Supabase client that behaves safely for offline/local mode
    return {
      auth: {
        getUser: async () => ({ data: { user: { id: 'local-user', email: 'local@domain.com', user_metadata: { name: 'Offline User' } } }, error: null }),
        onAuthStateChange: (callback: any) => {
          setTimeout(() => {
            callback('SIGNED_IN', { user: { id: 'local-user', email: 'local@domain.com', user_metadata: { name: 'Offline User' } } });
          }, 0);
          return { data: { subscription: { unsubscribe: () => {} } } };
        },
        signInWithOAuth: async () => {},
        signOut: async () => {},
      },
      from: () => ({
        select: () => ({
          eq: () => ({
            order: () => ({
              limit: () => Promise.resolve({ data: [], error: null }),
            }),
            gt: () => ({
              order: () => ({
                limit: () => Promise.resolve({ data: [], error: null }),
              }),
            }),
          }),
        }),
        upsert: async () => ({ error: null }),
        delete: () => ({
          eq: () => Promise.resolve({ error: null }),
        }),
      }),
    } as any;
  }

  return createBrowserClient(url, anonKey);
}


