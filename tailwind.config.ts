import type { Config } from 'tailwindcss';

/**
 * Government portal palette — Ministry of Earth Sciences / IMD
 * ------------------------------------------------------------------
 * Primary:  Deep Navy #123B70 · Government Blue #1E5AA8 · Medium Blue #2D6DB5
 * Surfaces: White #FFFFFF · Light Gov Blue #EAF3FB · Very Light #F5F9FD
 * Text:     Ink #172033 · Secondary #5F6B7A · Border #D8E2EC
 * Status:   green=success amber=pending red=critical blue=information (used sparingly)
 *
 * The legacy token names (base-*, brand-*, violetx-*) are remapped to the
 * light institutional palette so the existing pages restyle without a
 * rewrite; `slate` is re-tuned for readable dark-on-light text.
 */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        navy: {
          DEFAULT: '#123B70',
          50: '#EAF3FB',
          100: '#D8E8F7',
          200: '#B7D0EA',
          300: '#8FB4DC',
          400: '#5C8FCF',
          500: '#2D6DB5',
          600: '#1E5AA8',
          700: '#123B70',
          800: '#0D2C55',
          900: '#091F3F',
        },
        // Semantic surfaces (legacy names preserved)
        base: {
          950: '#F5F9FD', // app background
          900: '#EAF3FB', // tinted section / hover wash
          800: '#FFFFFF', // card surface
          700: '#D8E2EC', // default border
          600: '#C4D3E2', // stronger border
        },
        brand: {
          50: '#F5F9FD',
          100: '#EAF3FB',
          200: '#D8E8F7',
          300: '#8FB4DC',
          400: '#5C8FCF',
          500: '#2D6DB5',
          600: '#1E5AA8',
          700: '#123B70',
          800: '#0D2C55',
          900: '#091F3F',
        },
        // Legacy accent name kept so old gradients resolve to institutional blues
        violetx: {
          400: '#5C8FCF',
          500: '#2D6DB5',
          600: '#1E5AA8',
        },
        ink: {
          DEFAULT: '#172033',
          soft: '#5F6B7A',
        },
        // Re-tune legacy gray utilities for dark-text-on-light readability
        slate: {
          100: '#172033',
          200: '#22314A',
          300: '#3D4F68',
          400: '#5F6B7A',
          500: '#64748B',
          600: '#7C8DA3',
        },
      },
      fontFamily: {
        sans: ['Inter', 'Noto Sans', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        display: ['Inter', 'Noto Sans', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        serif: ['Georgia', '"Times New Roman"', 'serif'],
      },
      boxShadow: {
        card: '0 1px 2px rgba(23, 32, 51, 0.06)',
        pop: '0 4px 16px rgba(18, 59, 112, 0.12)',
      },
      keyframes: {
        fadeUp: {
          '0%': { opacity: '0', transform: 'translateY(14px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        shimmer: {
          '100%': { transform: 'translateX(100%)' },
        },
      },
      animation: {
        fadeUp: 'fadeUp 0.4s ease-out both',
        shimmer: 'shimmer 1.6s infinite',
      },
    },
  },
  plugins: [],
} satisfies Config;
