import { MetadataRoute } from 'next';

export const dynamic = 'force-static';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: [
          '/',
          '/movies',
          '/shows',
          '/nataks',
          '/live',
          '/kids',
          '/kidz',
          '/terms-conditions',
          '/privacy-policy',
          '/subscription',
          '/search',
          '/*.css',
          '/*.js',
          '/*.jpg',
          '/*.jpeg',
          '/*.png',
          '/*.gif',
          '/*.svg',
          '/*.webp',
          '/*.ico'
        ],
        disallow: [
          '/login',
          '/register',
          '/auth/',
          '/watching',
          '/profile',
          '/account-settings',
          '/payment',
          '/payment-success',
          '/payment-failed',
          '/api/',
          '/_api/'
        ]
      },
      {
        userAgent: [
          'AhrefsBot',
          'SemrushBot',
          'MJ12bot',
          'DotBot',
          'BLEXBot',
          'DataForSeoBot'
        ],
        disallow: ['/']
      }
    ],
    sitemap: 'https://jojoapp.in/sitemap.xml'
  };
}
