// ═══════════════════════════════════════════════════════════
// OASIS PMS — Button Component
// Boutons réutilisables avec variantes PMS
// ═══════════════════════════════════════════════════════════

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'ghost' | 'danger' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  icon?: string;
  loading?: boolean;
  children: React.ReactNode;
}

const VARIANTS = {
  primary: 'bg-gradient-to-r from-indigo-500 to-violet-500 text-white shadow-glow hover:from-indigo-600 hover:to-violet-600 hover:shadow-[0_0_40px_rgba(99,102,241,0.35)]',
  ghost: 'bg-transparent text-slate-600 hover:bg-slate-100 hover:text-slate-800 border border-slate-200',
  danger: 'bg-gradient-to-r from-rose-500 to-red-500 text-white shadow-[0_0_20px_rgba(244,63,94,0.3)] hover:from-rose-600 hover:to-red-600',
  outline: 'bg-transparent text-indigo-500 border border-indigo-300 hover:bg-indigo-50 hover:border-indigo-400',
};

const SIZES = {
  sm: 'px-3 py-1.5 text-xs rounded-lg',
  md: 'px-4 py-2.5 text-sm rounded-xl',
  lg: 'px-6 py-3.5 text-base rounded-xl',
};

export default function Button({
  variant = 'primary',
  size = 'md',
  icon,
  loading = false,
  children,
  className = '',
  disabled,
  ...props
}: ButtonProps) {
  return (
    <button
      className={`
        inline-flex items-center justify-center gap-2
        font-semibold
        transition-all duration-200
        disabled:opacity-50 disabled:cursor-not-allowed
        ${VARIANTS[variant]}
        ${SIZES[size]}
        ${className}
      `}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      ) : icon ? (
        <i className={`bi bi-${icon}`} />
      ) : null}
      {children}
    </button>
  );
}
