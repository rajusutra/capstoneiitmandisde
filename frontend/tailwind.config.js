/** @type {import('tailwindcss').Config} */
// Single source of truth for the app's dark theme. Values are the validated
// dark-mode steps from the dataviz palette already used for the dashboard
// charts (see AdminDashboard.jsx) — reused here so every page (cards,
// buttons, badges, charts) draws from the same documented palette instead of
// each file picking its own grays.
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        surface: {
          DEFAULT: '#0d0d0d', // page background
          card: '#1a1a19', // elevated card / panel surface
        },
        ink: {
          DEFAULT: '#ffffff', // headings, primary values
          secondary: '#c3c2b7', // body text, table cells
          muted: '#898781', // meta text, placeholders, axis labels
        },
        accent: {
          DEFAULT: '#3987e5', // primary brand/button color (categorical slot 1, dark)
          hover: '#2a78d6',
        },
        status: {
          good: '#0ca30c',
          warning: '#fab219',
          critical: '#d03b3b',
        },
      },
    },
  },
  plugins: [],
};
