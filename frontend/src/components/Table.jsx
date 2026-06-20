export default function Table({ columns, data, keyField = 'id' }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-slate-800">
      <table className="w-full text-left text-sm text-slate-300">
        <thead className="bg-slate-800/50 text-slate-200">
          <tr>
            {columns.map((col, index) => (
              <th key={index} className="px-6 py-4 font-medium border-b border-slate-800">
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="bg-slate-900/20 divide-y divide-slate-800/50">
          {data.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="px-6 py-8 text-center text-slate-500">
                No data available
              </td>
            </tr>
          ) : (
            data.map((row) => (
              <tr key={row[keyField]} className="hover:bg-slate-800/30 transition-colors">
                {columns.map((col, index) => (
                  <td key={index} className="px-6 py-4">
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
