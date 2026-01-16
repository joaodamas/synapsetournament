import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        brand: ['\"Archivo Black\"', 'Inter', 'ui-sans-serif', 'system-ui'],
        display: ['\"Archivo Black\"', 'Inter', 'ui-sans-serif', 'system-ui'],
        body: ['Inter', 'ui-sans-serif', 'system-ui'],
        mono: ['JetBrains Mono', 'ui-monospace', 'SFMono-Regular'],
      },
      boxShadow: {
        soft: '0 16px 40px rgba(15, 23, 42, 0.12)',
      },
    },
  },
  plugins: [],
} satisfies Config;
