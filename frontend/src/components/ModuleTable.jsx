import { useEffect, useMemo, useState } from 'react';
import { useModuleAccess } from '../hooks/useModuleAccess';
import { api } from '../lib/api';

function toCsv(rows, columns) {
  const escape = (value) => `"${String(value ?? '').replaceAll('"', '""')}"`;
  return [columns.map((column) => escape(column.label)).join(','), ...rows.map((row) => columns.map((column) => escape(row[column.key])).join(','))].join('\n');
}

/** Renders the correct input widget based on column.inputType */
function FieldInput({ column, value, onChange }) {
  if (column.inputType === 'radio' && Array.isArray(column.options)) {
    return (
      <div className="mt-2 flex flex-wrap gap-3">
        {column.options.map((option) => {
          const isSelected = value === option;
          return (
            <label
              key={option}
              className={`flex cursor-pointer items-center gap-2 rounded-lg border-2 px-4 py-2 text-sm font-semibold transition-all select-none ${
                isSelected
                  ? 'border-orange-500 bg-orange-50 text-orange-700 shadow-sm'
                  : 'border-slate-200 bg-white text-slate-600 hover:border-orange-300 hover:bg-orange-50/40'
              }`}
            >
              <span
                className={`flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full border-2 transition-all ${
                  isSelected ? 'border-orange-500 bg-orange-500' : 'border-slate-300 bg-white'
                }`}
              >
                {isSelected && <span className="h-1.5 w-1.5 rounded-full bg-white" />}
              </span>
              <input
                type="radio"
                name={column.key}
                value={option}
                checked={isSelected}
                onChange={() => onChange(option)}
                className="sr-only"
                required={!value}
              />
              {option}
            </label>
          );
        })}
      </div>
    );
  }

  // Default: plain text input
  return (
    <input
      required
      value={value ?? ''}
      onChange={(e) => onChange(e.target.value)}
      className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-slate-800 outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
    />
  );
}

export default function ModuleTable({ slug, module, title, description, columns, seedRows, table, addLabel = 'Add record' }) {
  const { can } = useModuleAccess();
  const [rows, setRows] = useState(seedRows);
  const [query, setQuery] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [draft, setDraft] = useState({});
  const [error, setError] = useState('');

  useEffect(() => {
    let mounted = true;
    api.module(module)
      .then((data) => { if (mounted) setRows(data); })
      .catch((loadError) => { if (mounted) setError(loadError.message); });
    return () => { mounted = false; };
  }, [module]);

  async function addRecord(event) {
    event.preventDefault();
    const payload = Object.fromEntries(
      columns.map((column) => [column.key, draft[column.key]?.trim?.() ?? draft[column.key] ?? '—'])
    );
    try {
      const row = await api.createModule(module, payload);
      setRows((current) => [row, ...current]);
      setDraft({});
      setIsAdding(false);
    } catch (saveError) {
      setError(saveError.message);
    }
  }

  async function deleteRecord(id) {
    try {
      await api.deleteModule(module, id);
      setRows((current) => current.filter((item) => item.id !== id));
    } catch (deleteError) {
      setError(deleteError.message);
    }
  }

  function exportCsv() {
    const file = new Blob([toCsv(rows, columns)], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(file);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${slug}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  const visibleRows = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return normalized
      ? rows.filter((row) => columns.some((column) => String(row[column.key] ?? '').toLowerCase().includes(normalized)))
      : rows;
  }, [columns, query, rows]);

  return (
    <section aria-labelledby={`${slug}-title`}>
      {/* Header */}
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="mb-1 text-sm font-semibold text-safety">Operations</p>
          <h1 id={`${slug}-title`} className="text-2xl font-bold tracking-tight text-slate-800">{title}</h1>
          <p className="mt-1 max-w-2xl text-sm text-slate-500">{description}</p>
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={exportCsv} className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50">
            Export CSV
          </button>
          {can(module, 'create') && (
            <button type="button" onClick={() => setIsAdding(true)} className="rounded-md bg-safety px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-safety-dark">
              {addLabel}
            </button>
          )}
        </div>
      </div>

      {/* Error banner */}
      {error && (
        <div role="alert" className="mb-4 rounded-md border border-orange-200 bg-orange-50 p-3 text-sm text-orange-800">
          {error}
        </div>
      )}

      {/* Add record form */}
      {isAdding && (
        <form
          onSubmit={(event) => void addRecord(event)}
          className="mb-6 rounded-xl border border-slate-200 bg-white p-6 shadow-sm"
        >
          <div className="mb-5 flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-800">{addLabel}</h2>
            <button
              type="button"
              onClick={() => { setIsAdding(false); setDraft({}); }}
              className="text-sm font-semibold text-slate-500 hover:text-slate-800"
            >
              ✕ Cancel
            </button>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            {columns.map((column) => (
              <div
                key={column.key}
                className={column.inputType === 'radio' ? 'md:col-span-2' : ''}
              >
                {column.inputType === 'radio' ? (
                  /* Radio group — label sits above the cards */
                  <div>
                    <p className="mb-2 text-sm font-semibold text-slate-700">{column.label}</p>
                    <FieldInput
                      column={column}
                      value={draft[column.key]}
                      onChange={(val) => setDraft((cur) => ({ ...cur, [column.key]: val }))}
                    />
                  </div>
                ) : (
                  /* Text / default input — label wraps the input */
                  <label className="block text-sm font-semibold text-slate-700">
                    {column.label}
                    <FieldInput
                      column={column}
                      value={draft[column.key]}
                      onChange={(val) => setDraft((cur) => ({ ...cur, [column.key]: val }))}
                    />
                  </label>
                )}
              </div>
            ))}
          </div>

          <div className="mt-6 flex justify-end gap-3">
            <button
              type="button"
              onClick={() => { setIsAdding(false); setDraft({}); }}
              className="rounded-md border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded-md bg-safety px-5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-safety-dark"
            >
              Save record
            </button>
          </div>
        </form>
      )}

      {/* Search */}
      <div className="mb-4">
        <label className="sr-only" htmlFor={`${slug}-search`}>Search {title}</label>
        <input
          id={`${slug}-search`}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={`Search ${title.toLowerCase()}...`}
          className="w-full max-w-sm rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-800 outline-none focus:border-safety focus:ring-2 focus:ring-orange-100"
        />
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[42rem] text-left text-sm">
            <thead className="bg-slate-900 text-xs uppercase tracking-wider text-slate-300">
              <tr>
                {columns.map((column) => (
                  <th key={column.key} className="px-5 py-3 font-semibold">{column.label}</th>
                ))}
                <th className="px-5 py-3 text-right font-semibold">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {visibleRows.length
                ? visibleRows.map((row) => (
                    <tr key={row.id} className="hover:bg-slate-50">
                      {columns.map((column) => (
                        <td key={column.key} className="px-5 py-4 text-slate-700">
                          {/* Badge for party_type */}
                          {column.inputType === 'radio' && row[column.key] ? (
                            <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                              row[column.key] === 'Customer'
                                ? 'bg-blue-100 text-blue-700'
                                : row[column.key] === 'Supplier'
                                ? 'bg-green-100 text-green-700'
                                : 'bg-purple-100 text-purple-700'
                            }`}>
                              {row[column.key]}
                            </span>
                          ) : (
                            row[column.key]
                          )}
                        </td>
                      ))}
                      <td className="px-5 py-4 text-right">
                        {can(module, 'delete') && (
                          <button
                            type="button"
                            onClick={() => void deleteRecord(row.id)}
                            className="font-semibold text-safety hover:text-safety-dark"
                          >
                            Delete
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                : (
                    <tr>
                      <td colSpan={columns.length + 1} className="px-5 py-10 text-center text-slate-500">
                        No matching records.
                      </td>
                    </tr>
                  )}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
