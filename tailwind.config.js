/*
 * Copyright (c) 2026 santiago-qoop. All rights reserved.
 */
/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: [
          'Inter',
          '-apple-system',
          'BlinkMacSystemFont',
          'SF Pro Display',
          'Segoe UI',
          'sans-serif',
        ],
      },
      boxShadow: {
        glass: '0 18px 60px rgba(15, 23, 42, 0.08)',
      },
    },
  },
  plugins: [],
};
