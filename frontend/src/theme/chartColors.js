// Shared recharts color steps for both themes — the validated dark/light
// chart-chrome values from the dataviz skill's reference palette
// (references/palette.md § "Chart chrome & ink"). Recharts needs literal
// color strings (SVG fill/stroke attributes), so charts pick from this table
// by the current theme rather than relying on CSS variables. Status colors
// (good/warning/critical) are NOT here — they're fixed and never themed, and
// stay as literal hex directly in each chart file.
export const CHART_COLORS = {
  dark: {
    surface: '#1a1a19',
    gridline: '#2c2c2a',
    inkMuted: '#898781',
    inkSecondary: '#c3c2b7',
    ink: '#ffffff',
    accent: '#3987e5', // categorical slot 1, dark
    tooltipBorder: 'rgba(255,255,255,0.1)',
    cursorWash: 'rgba(255,255,255,0.05)',
  },
  light: {
    surface: '#fcfcfb',
    gridline: '#e1e0d9',
    inkMuted: '#898781',
    inkSecondary: '#52514e',
    ink: '#0b0b0b',
    accent: '#2a78d6', // categorical slot 1, light
    tooltipBorder: 'rgba(11,11,11,0.1)',
    cursorWash: 'rgba(11,11,11,0.05)',
  },
};
