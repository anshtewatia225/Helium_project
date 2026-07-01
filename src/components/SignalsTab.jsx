import { signalRows } from '../lib/features.js'

// The deterministic features the rules read against.
export default function SignalsTab({ features }) {
  const rows = signalRows(features)
  return (
    <div>
      <p className="mb-3 text-sm text-slate-400">
        Deterministic signals extracted from the event stream. Rules score off these — no model
        involved.
      </p>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
        {rows.map((row) => (
          <div key={row.label} className="rounded-lg border border-slate-700 bg-slate-900/50 p-3">
            <p className="text-[11px] uppercase tracking-wide text-slate-500">{row.label}</p>
            <p className="mt-1 font-mono text-lg text-slate-100">{String(row.value)}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
