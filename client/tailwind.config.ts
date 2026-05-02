import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Geist Variable', 'sans-serif'],
        mono: ['Geist Mono Variable', 'monospace'],
      },
      colors: {
        bg: {
          primary: 'var(--bg-primary)',
          secondary: 'var(--bg-secondary)',
          tertiary: 'var(--bg-tertiary)',
          glow: 'var(--bg-glow)',
        },
        border: {
          DEFAULT: 'var(--border)',
          active: 'var(--border-active)',
        },
        text: {
          primary: 'var(--text-primary)',
          secondary: 'var(--text-secondary)',
          muted: 'var(--text-muted)',
          placeholder: 'var(--text-placeholder)',
          disabled: 'var(--text-disabled)',
        },
        placeholder: 'var(--text-placeholder)',
        disabled: 'var(--text-disabled)',
        accent: {
          DEFAULT: 'var(--accent)',
          glow: 'var(--accent-glow)',
        },
        success: 'var(--success)',
        warning: 'var(--warning)',
        danger: {
          DEFAULT: 'var(--danger)',
          muted: 'var(--danger-muted)',
        },
        info: 'var(--info)',
      },
      animation: {
        'pulse-blocked': 'pulseBlocked 2s ease-in-out infinite',
        'glow-idle': 'glowIdle 2s ease-in-out infinite',
      },
      keyframes: {
        pulseBlocked: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.7' },
        },
        glowIdle: {
          '0%, 100%': { boxShadow: '0 0 4px rgba(245,158,11,0.3)' },
          '50%': { boxShadow: '0 0 12px rgba(245,158,11,0.6)' },
        },
      },
    },
  },
  plugins: [],
};

export default config;
