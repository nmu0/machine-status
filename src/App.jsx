import { useEffect, useMemo, useState } from 'react'
import { supabase } from './supabaseClient'

const STATUS_OPTIONS = [
  { value: 'working', label: 'Working', color: '#2f9e44' },
  { value: 'broken', label: 'Broken / Out of order', color: '#e03131' },
  { value: 'empty', label: 'Empty (needs restock)', color: '#f08c00' },
]

function statusMeta(status) {
  return STATUS_OPTIONS.find((s) => s.value === status) ?? {
    label: status,
    color: '#868e96',
  }
}

function timeAgo(isoString) {
  const diffMs = Date.now() - new Date(isoString).getTime()
  const mins = Math.floor(diffMs / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  return `${days}d ago`
}

export default function App() {
  const [reports, setReports] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const [machineId, setMachineId] = useState('')
  const [status, setStatus] = useState('broken')
  const [note, setNote] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [search, setSearch] = useState('')

  async function fetchReports() {
    setLoading(true)
    const { data, error } = await supabase
      .from('machine_reports')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(500)

    if (error) {
      setError(error.message)
    } else {
      setError(null)
      setReports(data)
    }
    setLoading(false)
  }

  useEffect(() => {
    fetchReports()
  }, [])

  async function handleSubmit(e) {
    e.preventDefault()
    if (!machineId.trim()) return

    setSubmitting(true)
    const { error } = await supabase.from('machine_reports').insert({
      machine_id: machineId.trim().toUpperCase(),
      status,
      note: note.trim() || null,
    })
    setSubmitting(false)

    if (error) {
      setError(error.message)
      return
    }

    setMachineId('')
    setNote('')
    setStatus('broken')
    fetchReports()
  }

  // Collapse reports down to the latest status per machine
  const latestByMachine = useMemo(() => {
    const map = new Map()
    for (const r of reports) {
      if (!map.has(r.machine_id)) map.set(r.machine_id, r)
    }
    return Array.from(map.values()).sort(
      (a, b) => new Date(b.created_at) - new Date(a.created_at)
    )
  }, [reports])

  const filtered = latestByMachine.filter((r) =>
    r.machine_id.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div style={styles.page}>
      <header style={styles.header}>
        <h1 style={styles.h1}>Machine Status</h1>
        <p style={styles.subtitle}>
          Crowdsourced status reports for Pokémon card vending machines.
          Report a broken or empty machine below — everyone benefits.
        </p>
      </header>

      <form onSubmit={handleSubmit} style={styles.card}>
        <h2 style={styles.h2}>Report a machine</h2>
        <div style={styles.formRow}>
          <label style={styles.label}>
            Machine ID
            <input
              style={styles.input}
              value={machineId}
              onChange={(e) => setMachineId(e.target.value)}
              placeholder="e.g. Q00173"
              required
            />
          </label>
          <label style={styles.label}>
            Status
            <select
              style={styles.input}
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            >
              {STATUS_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </label>
        </div>
        <label style={styles.label}>
          Note (optional)
          <textarea
            style={{ ...styles.input, minHeight: 60 }}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Any details — e.g. 'screen is dark', 'card slot jammed'"
          />
        </label>
        <button style={styles.button} type="submit" disabled={submitting}>
          {submitting ? 'Submitting…' : 'Submit report'}
        </button>
      </form>

      <section style={styles.card}>
        <div style={styles.listHeader}>
          <h2 style={styles.h2}>Latest reported status</h2>
          <input
            style={{ ...styles.input, maxWidth: 220 }}
            placeholder="Search machine ID…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {error && <p style={styles.error}>Error: {error}</p>}
        {loading && <p>Loading…</p>}
        {!loading && filtered.length === 0 && (
          <p style={styles.subtitle}>No reports yet — be the first.</p>
        )}

        <ul style={styles.list}>
          {filtered.map((r) => {
            const meta = statusMeta(r.status)
            return (
              <li key={r.id} style={styles.listItem}>
                <span style={{ ...styles.dot, background: meta.color }} />
                <div style={{ flex: 1 }}>
                  <div style={styles.machineRow}>
                    <strong>{r.machine_id}</strong>
                    <span style={{ color: meta.color, fontWeight: 600 }}>
                      {meta.label}
                    </span>
                  </div>
                  {r.note && <div style={styles.note}>{r.note}</div>}
                  <div style={styles.timestamp}>{timeAgo(r.created_at)}</div>
                </div>
              </li>
            )
          })}
        </ul>
      </section>
    </div>
  )
}

const styles = {
  page: {
    maxWidth: 640,
    margin: '0 auto',
    padding: '32px 20px 80px',
    fontFamily:
      "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    color: '#1a1a1a',
  },
  header: { marginBottom: 24 },
  h1: { fontSize: 28, margin: 0 },
  subtitle: { color: '#666', marginTop: 6, lineHeight: 1.4 },
  card: {
    background: '#fff',
    border: '1px solid #e5e5e5',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
  },
  h2: { fontSize: 18, margin: '0 0 12px' },
  formRow: { display: 'flex', gap: 12, marginBottom: 12 },
  label: {
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
    fontSize: 13,
    color: '#444',
    flex: 1,
    marginBottom: 12,
  },
  input: {
    padding: '8px 10px',
    borderRadius: 8,
    border: '1px solid #d0d0d0',
    fontSize: 14,
    fontFamily: 'inherit',
  },
  button: {
    background: '#e03131',
    color: '#fff',
    border: 'none',
    borderRadius: 8,
    padding: '10px 16px',
    fontSize: 14,
    fontWeight: 600,
    cursor: 'pointer',
  },
  listHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  list: { listStyle: 'none', margin: 0, padding: 0 },
  listItem: {
    display: 'flex',
    gap: 10,
    padding: '12px 0',
    borderBottom: '1px solid #f0f0f0',
    alignItems: 'flex-start',
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: '50%',
    marginTop: 5,
    flexShrink: 0,
  },
  machineRow: { display: 'flex', justifyContent: 'space-between', gap: 8 },
  note: { color: '#555', fontSize: 13, marginTop: 2 },
  timestamp: { color: '#999', fontSize: 12, marginTop: 2 },
  error: { color: '#e03131' },
}
