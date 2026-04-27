import { useDarkMode } from '../contexts/DarkModeContext';

interface DarkModeToggleProps {
  size?: 'sm' | 'md';
  showLabel?: boolean;
}

export function DarkModeToggle({ size = 'md', showLabel = true }: DarkModeToggleProps) {
  const { isDark, toggle } = useDarkMode();

  return (
    <div className="flex items-center gap-3">
      {showLabel && (
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-900">{isDark ? '🌙 Mode sombre' : '☀️ Mode clair'}</p>
          <p className="text-xs text-gray-500">{isDark ? 'Interface sombre activée' : 'Interface claire activée'}</p>
        </div>
      )}
      <button
        onClick={toggle}
        aria-label="Basculer mode sombre"
        className={`dark-mode-toggle ${isDark ? 'on' : ''}`}
        style={{
          backgroundColor: isDark ? '#0098FF' : '#d1d5db',
        }}
      >
        <span className="dark-mode-toggle-thumb" style={{ fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {isDark ? '🌙' : '☀️'}
        </span>
      </button>
    </div>
  );
}
