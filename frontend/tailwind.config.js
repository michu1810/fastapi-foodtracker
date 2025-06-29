import { transform } from 'typescript';

export default {
  content: ['./src/**/*.{js,ts,jsx,tsx}', './index.html'],
  theme: {
    extend: {
        backgroundImage: {
         'login-bg': "url('/public/login-bg.jpg')",
        },
        transitionProperty: {
         scale: 'transform'
        },
        animation: {
         'fade-in': 'fadeIn 0.5s ease-out both',
         'fade-in-up': 'fadeInUp 0.4s ease-out both',
         'fade-in-smooth': 'fadeInSmooth 0.6s ease-out both',
         'breathe': 'breathe 4s ease-in-out infinite',
         'glow': 'glow 2.5s ease-in-out infinite',
        },
        keyframes: {
         fadeIn: {
           '0%': { opacity: 0, transform: 'translateY(10px)' },
           '100%': { opacity: 1, transform: 'translateY(0)' },
         },
         fadeInUp: {
           '0%': { opacity: 0, transform: 'translateY(6px)' },
           '100%': { opacity: 1, transform: 'translateY(0)' },
         },
         fadeInSmooth: {
           '0%': { opacity: 0, transform: 'scale(0.98)' },
           '100%': { opacity: 1, transform: 'scale(1)' },
         },
         breathe: {
           '0%': { transform: 'scale(1)' },
           '50%': { transform: 'scale(1.015)' },
           '100%': { transform: 'scale(1)' },
         },
         glow: {
            '0%, 100%': {
              boxShadow: '0 0 5px rgba(13, 148, 136, 0.2), 0 0 5px rgba(13, 148, 136, 0.1) inset'
            },
            '50%': {
              boxShadow: '0 0 15px rgba(13, 148, 136, 0.6), 0 0 10px rgba(13, 148, 136, 0.2) inset'
            },
         }
        },
        colors: {
         primary: '#1E3A8A',
         secondary: '#10B981',
        },
        typography: (theme) => ({
         DEFAULT: {
           css: {
             color: theme('colors.gray.700'),
             a: {
               color: theme('colors.primary'),
               '&:hover': {
                 color: theme('colors.secondary'),
               },
             },
           },
         },
        }),
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
    require('@tailwindcss/typography'),
    require('tailwindcss-animate'),
    require('tailwindcss-scrollbar'),
    require('@headlessui/tailwindcss'),
  ],
};
