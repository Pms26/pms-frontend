// ═══════════════════════════════════════════════════════════
// OASIS PMS — Glass Card Component
// Carte avec effet glassmorphism, utilisée partout dans l'app
// ═══════════════════════════════════════════════════════════

interface CardProps {
  children: React.ReactNode;
  className?: string;
  padding?: boolean;
  hover?: boolean;
}

export default function Card({ children, className = '', padding = true, hover = false }: CardProps) {
  return (
    <div
      className={`
        bg-white rounded-xl border border-slate-200/60
        shadow-card
        ${hover ? 'hover:shadow-card-hover hover:-translate-y-0.5 transition-all duration-300' : ''}
        ${padding ? 'p-5' : ''}
        ${className}
      `}
    >
      {children}
    </div>
  );
}
