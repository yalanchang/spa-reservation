/** @type {import('tailwindcss').Config} */
export default {
    content: [
      "./index.html",
      "./src/**/*.{vue,js,ts,jsx,tsx}",
    ],
    theme: {
      extend: {
        colors: {
          // 韓系粉嫩主色
          primary: {
            50: '#fff5f7',
            100: '#ffe4ea',
            200: '#ffccd8',
            300: '#ffa8bd',
            400: '#fb7f9d',
            500: '#f0608a',
            600: '#d63d6a',
            700: '#b8305a',
            800: '#96294b',
            900: '#7a2440',
          },
          lavender: { 100: '#efe7ff', 200: '#e0d3ff', 400: '#b9a2f5' },
          mint: { 100: '#e3f6ee', 200: '#cdeedf', 400: '#7ccfa6' },
          butter: { 100: '#fff3d6', 200: '#ffe6ad', 400: '#f5c451' },
          cream: '#fffaf7',
          cocoa: '#5b4a4f',
        },
        borderRadius: {
          '4xl': '2rem',
        },
        boxShadow: {
          soft: '0 8px 24px -8px rgba(214, 61, 106, 0.18)',
          'soft-lg': '0 18px 40px -12px rgba(214, 61, 106, 0.28)',
        },
        keyframes: {
          float: {
            '0%, 100%': { transform: 'translateY(0)' },
            '50%': { transform: 'translateY(-12px)' },
          },
          wiggle: {
            '0%, 100%': { transform: 'rotate(0deg)' },
            '25%': { transform: 'rotate(-8deg)' },
            '75%': { transform: 'rotate(8deg)' },
          },
          pop: {
            '0%': { transform: 'scale(1)' },
            '40%': { transform: 'scale(1.35)' },
            '100%': { transform: 'scale(1)' },
          },
        },
        animation: {
          float: 'float 4s ease-in-out infinite',
          'float-slow': 'float 6s ease-in-out infinite',
          wiggle: 'wiggle 0.5s ease-in-out',
          pop: 'pop 0.35s ease-out',
        },
      },
    },
    plugins: [],
  }
