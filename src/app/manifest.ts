import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Personal Manager',
    short_name: 'PM',
    description: 'Your complete personal operating system — manage tasks, habits, expenses, vehicles, documents, and more.',
    start_url: '/',
    display: 'standalone',
    background_color: '#07070d',
    theme_color: '#7c6cf0',
    orientation: 'portrait',
    categories: ['productivity', 'lifestyle', 'finance'],
    icons: [
      {
        src: '/icons/icon-192.png',
        sizes: '192x192',
        type: 'image/png',
      },
      {
        src: '/icons/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
      },
      {
        src: '/icons/icon-maskable-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
  };
}
