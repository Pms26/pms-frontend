// ═══════════════════════════════════════════════════════════
// OASIS PMS — Badge Component
// Badges colorés pour statuts, segments, etc.
// ═══════════════════════════════════════════════════════════

interface BadgeProps {
  children: React.ReactNode;
  color?: string;
  variant?: 'solid' | 'soft' | 'outline';
  size?: 'sm' | 'md';
  icon?: string;
  className?: string;
}

export default function Badge({
  children,
  color = '#6366f1',
  variant = 'soft',
  size = 'sm',
  icon,
  className = '',
}: BadgeProps) {
  const styles = {
    solid: {
      backgroundColor: color,
      color: '#ffffff',
    },
    soft: {
      backgroundColor: `${color}18`,
      color: color,
      border: `1px solid ${color}30`,
    },
    outline: {
      backgroundColor: 'transparent',
      color: color,
      border: `1px solid ${color}50`,
    },
  };

  const sizeClasses = {
    sm: 'px-2 py-0.5 text-[11px]',
    md: 'px-3 py-1 text-xs',
  };

  return (
    <span
      className={`
        inline-flex items-center gap-1 font-semibold rounded-full whitespace-nowrap
        ${sizeClasses[size]}
        ${className}
      `}
      style={styles[variant]}
    >
      {icon && <i className={`bi bi-${icon} text-[10px]`} />}
      {children}
    </span>
  );
}
