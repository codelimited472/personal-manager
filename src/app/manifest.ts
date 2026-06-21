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
  };
}
