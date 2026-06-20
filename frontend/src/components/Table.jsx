export default function Table({ columns, data, keyField = 'id' }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-slate-800/60 custom-scrollbar">
      <table className="w-full text-left text-sm text-slate-300 min-w-[600px]">
        <thead className="bg-slate-800/40 text-slate-200">
          <tr>
            {columns.map((col, index) => (
              <th key={index} className="px-6 py-4 font-semibold tracking-wide border-b border-slate-800/60 whitespace-nowrap">
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="bg-slate-900/10 divide-y divide-slate-800/40">
          {data.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="px-6 py-12 text-center text-slate-500 italic">
                No data available
              </td>
            </tr>
          ) : (
            data.map((row) => (
              <tr key={row[keyField]} className="hover:bg-slate-800/40 transition-colors duration-200 group">
                {columns.map((col, index) => (
                  <td key={index} className="px-6 py-4 group-hover:text-slate-100 transition-colors duration-200 whitespace-nowrap">
                    {col.render ? col.render(row) : row[col.accessor]}
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
