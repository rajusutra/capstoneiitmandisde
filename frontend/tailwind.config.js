/** @type {import('tailwindcss').Config} */
// Colors are CSS variables (defined in src/index.css as "R G B" triplets) so
// every token here supports Tailwind's opacity modifiers (e.g. bg-accent/10)
// AND swaps between the dark and light dataviz palette steps via the
// [data-theme] attribute on <html> — one definition, both themes, no
// per-component light/dark branching needed for plain UI classes.
function withOpacity(variable) {
  return `rgb(var(${variable}) / <alpha-value>)`;
}

export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        surface: {
          DEFAULT: withOpacity('--color-surface'), // page background
          card: withOpacity('--color-surface-card'), // elevated card / panel surface
        },
        ink: {
          DEFAULT: withOpacity('--color-ink'), // headings, primary values
          secondary: withOpacity('--color-ink-secondary'), // body text, table cells
          muted: withOpacity('--color-ink-muted'), // meta text, placeholders, axis labels
        },
        accent: {
          DEFAULT: withOpacity('--color-accent'), // primary brand/button color (categorical slot 1)
          hover: withOpacity('--color-accent-hover'),
        },
        status: {
          // Fixed status palette — never themed (see dataviz skill palette.md):
          // same hex in light and dark, so no CSS variable indirection needed.
          good: '#0ca30c',
          warning: '#fab219',
          critical: '#d03b3b',
        },
        // Replaces raw `white/NN` opacity utilities (borders, hairline fills,
        // hover washes) that were hardcoded to dark-mode white — this token
        // flips to a dark ink tint in light mode so the same `/10`, `/20`
        // etc. suffixes keep working in both themes.
        line: withOpacity('--color-line'),
      },
    },
  },
  plugins: [],
};
