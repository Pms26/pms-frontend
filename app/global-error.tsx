'use client';

// ═══════════════════════════════════════════════════════════
// OASIS PMS — Error Boundary (requis par Next.js App Router)
// ═══════════════════════════════════════════════════════════

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="fr">
      <body className="min-h-screen flex items-center justify-center bg-[#0f172a]">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-rose-500 to-red-500 flex items-center justify-center text-white text-3xl">
            <span>!</span>
          </div>
          <h2 className="text-xl font-bold text-white mb-2">Erreur inattendue</h2>
          <p className="text-sm text-slate-400 mb-6 max-w-md">
            {error.message || 'Une erreur est survenue. Veuillez réessayer.'}
          </p>
          <button
            onClick={reset}
            className="px-6 py-3 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-500 text-white font-semibold text-sm hover:from-indigo-600 hover:to-violet-600 transition-all"
          >
            Réessayer
          </button>
        </div>
      </body>
    </html>
  );
}
