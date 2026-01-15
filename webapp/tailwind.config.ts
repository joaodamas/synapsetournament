import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        brand: ['\"Plus Jakarta Sans\"', 'Sora', 'ui-sans-serif', 'system-ui'],
        display: ['Sora', 'ui-sans-serif', 'system-ui'],
        body: ['IBM Plex Sans', 'ui-sans-serif', 'system-ui'],
        mono: ['JetBrains Mono', 'ui-monospace', 'SFMono-Regular'],
      },
      boxShadow: {
        soft: '0 16px 40px rgba(15, 23, 42, 0.12)',
      },
    },
  },
  plugins: [],
} satisfies Config;
