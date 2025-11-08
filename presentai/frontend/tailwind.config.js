/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'brand-background': '#1f1c2e',
        'brand-surface': '#2b273a',
        'brand-surface-alt': '#3a3549',
        'brand-surface-glow': '#4a445d',
        'brand-border': '#564f6a',
        'brand-text': '#f6f2ff',
        'brand-muted': '#cbb7e7',
        'brand-muted-dark': '#9f8bc3',
        'brand-accent': '#c770ff',
        'brand-accent-soft': '#f4a9ff',
        'brand-accent-mid': '#d986ff',
        'brand-accent-strong': '#9c3de0',
        gestures: '#FF9A5A',
        inflection: '#FF8AD6',
        clarity: '#74D7FF',
        content: '#56C979',
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
    },
  },
  plugins: [require('@tailwindcss/forms')],
}
