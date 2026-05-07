import type { Config } from 'tailwindcss'

export default {
  content: ['./src/ui/**/*.{vue,ts,html}'],
  theme: {
    extend: {
      colors: {
        primary: '#10b981',
      },
    },
  },
} satisfies Config
