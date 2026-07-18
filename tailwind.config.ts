import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './lib/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        // OASIS PMS Design System
        accent: {
          DEFAULT: '#6366f1',
          glow: 'rgba(99,102,241,0.35)',
          light: '#818cf8',
          dark: '#4f46e5',
        },
        violet: {
          DEFAULT: '#8b5cf6',
          light: '#a78bfa',
        },
        cyan: {
          DEFAULT: '#06b6d4',
          light: '#22d3ee',
        },
        emerald: {
          DEFAULT: '#10b981',
          light: '#34d399',
        },
        amber: {
          DEFAULT: '#f59e0b',
          light: '#fbbf24',
        },
        rose: {
          DEFAULT: '#f43f5e',
          light: '#fb7185',
        },
        surface: {
          dark: '#0f172a',
          DEFAULT: '#1e293b',
          light: '#334155',
          card: '#1e293b',
          hover: '#334155',
        },
        border: {
          DEFAULT: 'rgba(148,163,184,0.15)',
          light: 'rgba(148,163,184,0.25)',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['Space Grotesk', 'system-ui', 'sans-serif'],
      },
      fontSize: {
        '2xs': ['0.65rem', { lineHeight: '1rem' }],
      },
      borderRadius: {
        xl: '14px',
        '2xl': '18px',
      },
      boxShadow: {
        glow: '0 0 30px rgba(99,102,241,0.2)',
        card: '0 4px 24px rgba(0,0,0,0.12)',
        'card-hover': '0 8px 32px rgba(0,0,0,0.18)',
      },
      backdropBlur: {
        glass: '20px',
      },
      animation: {
        'float': 'float 6s ease-in-out infinite',
        'float-delayed': 'float 6s ease-in-out 2s infinite',
        'pulse-glow': 'pulseGlow 2s ease-in-out infinite',
        'slide-in': 'slideIn 0.3s cubic-bezier(0.4,0,0.2,1)',
        'fade-in': 'fadeIn 0.5s ease-out',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0) rotate(0deg)' },
          '50%': { transform: 'translateY(-20px) rotate(5deg)' },
        },
        pulseGlow: {
          '0%, 100%': { boxShadow: '0 0 20px rgba(99,102,241,0.3)' },
          '50%': { boxShadow: '0 0 40px rgba(99,102,241,0.6)' },
        },
        slideIn: {
          from: { transform: 'translateX(-10px)', opacity: '0' },
          to: { transform: 'translateX(0)', opacity: '1' },
        },
        fadeIn: {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
      },
      spacing: {
        sidebar: '260px',
        'sidebar-collapsed': '72px',
        topbar: '64px',
      },
    },
  },
  plugins: [],
};

export default config;
