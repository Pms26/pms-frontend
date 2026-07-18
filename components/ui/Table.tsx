// ═══════════════════════════════════════════════════════════
// OASIS PMS — Table Component
// Table PMS avec style cohérent
// ═══════════════════════════════════════════════════════════

interface Column<T> {
  key: string;
  header: string;
  render?: (item: T) => React.ReactNode;
  className?: string;
}

interface TableProps<T> {
  columns: Column<T>[];
  data: T[];
  emptyMessage?: string;
  onRowClick?: (item: T) => void;
}

export default function Table<T extends Record<string, unknown>>({
  columns,
  data,
  emptyMessage = 'Aucune donnée',
  onRowClick,
}: TableProps<T>) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-200/60">
            {columns.map((col) => (
              <th
                key={col.key}
                className={`text-left px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500 bg-slate-50/50 ${col.className || ''}`}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="text-center py-8 text-slate-400">
                <i className="bi bi-inbox text-3xl block mb-2 opacity-40" />
                {emptyMessage}
              </td>
            </tr>
          ) : (
            data.map((item, idx) => (
              <tr
                key={idx}
                className={`
                  border-b border-slate-100 last:border-b-0
                  transition-colors duration-150
                  ${onRowClick ? 'cursor-pointer hover:bg-indigo-50/50' : 'hover:bg-slate-50/50'}
                `}
                onClick={() => onRowClick?.(item)}
              >
                {columns.map((col) => (
                  <td key={col.key} className={`px-4 py-3 text-slate-700 ${col.className || ''}`}>
                    {col.render ? col.render(item) : String(item[col.key] ?? '')}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
