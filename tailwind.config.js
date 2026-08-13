/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./src/renderer/index.html', './src/renderer/src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        app: {
          bg: 'var(--app-bg)',
          surface: 'var(--app-surface)',
          'surface-2': 'var(--app-surface-2)',
          border: 'var(--app-border)',
          text: 'var(--app-text)',
          'text-muted': 'var(--app-text-muted)',
          accent: 'var(--app-accent)',
          'accent-soft': 'var(--app-accent-soft)',
          danger: 'var(--app-danger)',
          success: 'var(--app-success)',
          warning: 'var(--app-warning)'
        }
      },
      fontFamily: {
        sans: ['Inter', 'Segoe UI', 'system-ui', '-apple-system', 'sans-serif'],
        serif: ['Georgia', 'Cambria', 'serif'],
        mono: ['JetBrains Mono', 'Consolas', 'Menlo', 'monospace']
      },
      borderRadius: {
        xl2: '1.25rem'
      },
      boxShadow: {
        card: '0 4px 20px rgba(0,0,0,0.25)',
        glow: '0 0 24px var(--app-accent-soft)',
        soft: '0 2px 12px rgba(0,0,0,0.18)'
      },
      animation: {
        'fade-in': 'fadeIn 0.25s ease-out',
        'scale-in': 'scaleIn 0.18s ease-out',
        'slide-up': 'slideUp 0.3s ease-out'
      },
      keyframes: {
        fadeIn: { from: { opacity: '0' }, to: { opacity: '1' } },
        scaleIn: { from: { opacity: '0', transform: 'scale(0.96)' }, to: { opacity: '1', transform: 'scale(1)' } },
        slideUp: { from: { opacity: '0', transform: 'translateY(16px)' }, to: { opacity: '1', transform: 'translateY(0)' } }
      }
    }
  },
  plugins: []
}
