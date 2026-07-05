// Light/dark switch — a sun/moon icon button, styled like Navbar's other
// small buttons (bg-line/10 hover:bg-line/20) so it fits either theme.
import { useTheme } from '../context/ThemeContext';

export default function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <button
      onClick={toggleTheme}
      title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      aria-label="Toggle color theme"
      className="bg-line/10 hover:bg-line/20 text-ink w-8 h-8 rounded-lg flex items-center justify-center transition"
    >
      {isDark ? (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
          <path d="M12 3a1 1 0 0 1 1 1v1a1 1 0 1 1-2 0V4a1 1 0 0 1 1-1Zm0 15a5 5 0 1 0 0-10 5 5 0 0 0 0 10Zm9-6a1 1 0 0 1-1 1h-1a1 1 0 1 1 0-2h1a1 1 0 0 1 1 1ZM5 12a1 1 0 0 1-1 1H3a1 1 0 1 1 0-2h1a1 1 0 0 1 1 1Zm12.66-6.66a1 1 0 0 1 0 1.42l-.71.7a1 1 0 1 1-1.41-1.41l.7-.71a1 1 0 0 1 1.42 0ZM8.46 17.46a1 1 0 0 1 0 1.42l-.7.7a1 1 0 0 1-1.42-1.41l.71-.71a1 1 0 0 1 1.41 0Zm9.9 1.42a1 1 0 0 1-1.42 0l-.7-.71a1 1 0 1 1 1.41-1.41l.71.7a1 1 0 0 1 0 1.42ZM7.75 6.16a1 1 0 0 1-1.41 0l-.71-.7a1 1 0 0 1 1.42-1.42l.7.71a1 1 0 0 1 0 1.41ZM12 23a1 1 0 0 1-1-1v-1a1 1 0 1 1 2 0v1a1 1 0 0 1-1 1Z" />
        </svg>
      ) : (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
          <path d="M20.742 13.045a8.088 8.088 0 0 1-2.077.267c-4.476 0-8.106-3.63-8.106-8.106 0-1.03.2-2.01.564-2.912a.75.75 0 0 0-.941-.998A10.108 10.108 0 0 0 3.5 11.25c0 5.66 4.59 10.25 10.25 10.25 3.978 0 7.428-2.27 9.117-5.58a.75.75 0 0 0-.933-1.05 8.05 8.05 0 0 1-1.192.175Z" />
        </svg>
      )}
    </button>
  );
}
