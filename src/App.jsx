import { useEffect, useMemo, useState } from 'react'
import { supabase } from './supabaseClient'
import MapView from './MapView'
import 'leaflet/dist/leaflet.css'

const STATUS_OPTIONS = [
  { value: 'working', label: 'Working', color: '#2f9e44' },
  { value: 'broken', label: 'Broken / Out of order', color: '#e03131' },
  { value: 'empty', label: 'Empty (needs restock)', color: '#f08c00' },
]

const STARTERS = [
  { name: 'Sprigatito', src: 'https://img.pokemondb.net/sprites/scarlet-violet/normal/sprigatito.png', href: 'https://pokemondb.net/pokedex/sprigatito' },
  { name: 'Chikorita', src: 'https://img.pokemondb.net/sprites/scarlet-violet/normal/chikorita.png', href: 'https://pokemondb.net/pokedex/chikorita' },
  { name: 'Snivy', src: 'https://img.pokemondb.net/sprites/scarlet-violet/normal/snivy.png', href: 'https://pokemondb.net/pokedex/snivy' },
  { name: 'Fennekin', src: 'https://img.pokemondb.net/sprites/scarlet-violet/normal/fennekin.png', href: 'https://pokemondb.net/pokedex/fennekin' },
  { name: 'Cyndaquil', src: 'https://img.pokemondb.net/sprites/scarlet-violet/normal/cyndaquil.png', href: 'https://pokemondb.net/pokedex/cyndaquil' },
  { name: 'Litten', src: 'https://img.pokemondb.net/sprites/scarlet-violet/normal/litten.png', href: 'https://pokemondb.net/pokedex/litten' },
  { name: 'Mudkip', src: 'https://img.pokemondb.net/sprites/scarlet-violet/normal/mudkip.png', href: 'https://pokemondb.net/pokedex/mudkip' },
  { name: 'Oshawott', src: 'https://img.pokemondb.net/sprites/scarlet-violet/normal/oshawott.png', href: 'https://pokemondb.net/pokedex/oshawott' },
  { name: 'Piplup', src: 'https://img.pokemondb.net/sprites/scarlet-violet/normal/piplup.png', href: 'https://pokemondb.net/pokedex/piplup' },
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

// Haversine distance in miles between two lat/lng points.
function distanceMiles(lat1, lng1, lat2, lng2) {
  const toRad = (d) => (d * Math.PI) / 180
  const R = 3958.8
  const dLat = toRad(lat2 - lat1)
  const dLng = toRad(lng2 - lng1)
  const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

// A generic pokéball-style icon, built from CSS shapes rather than
// any official artwork — just the red-top/white-bottom/black-band
// silhouette people associate with the games.
function PokeballIcon({ size = 28 }) {
  return (
      <div
          style={{
            width: size,
            height: size,
            borderRadius: '50%',
            background: 'linear-gradient(#ee1515 0 50%, #fff 50% 100%)',
            border: '2.5px solid #1a1a1a',
            position: 'relative',
            flexShrink: 0,
          }}
      >
        <div
            style={{
              position: 'absolute',
              left: 0,
              right: 0,
              top: '50%',
              height: 3,
              background: '#1a1a1a',
              transform: 'translateY(-1.5px)',
            }}
        />
        <div
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              width: size * 0.36,
              height: size * 0.36,
              borderRadius: '50%',
              background: '#fff',
              border: '2.5px solid #1a1a1a',
              transform: 'translate(-50%, -50%)',
            }}
        />
      </div>
  )
}

export default function App() {
  const [reports, setReports] = useState([])
  const [machines, setMachines] = useState([])
  const [reportsLoading, setReportsLoading] = useState(true)
  const [machinesLoading, setMachinesLoading] = useState(true)
  const [error, setError] = useState(null)
  const [view, setView] = useState('map') // 'map' | 'list'

  const [machineId, setMachineId] = useState('')
  const [status, setStatus] = useState('broken')
  const [note, setNote] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [search, setSearch] = useState('')

  const [locatingNearest, setLocatingNearest] = useState(false)
  const [nearestMatch, setNearestMatch] = useState(null)
  const [nearestError, setNearestError] = useState(null)

  async function fetchReports() {
    setReportsLoading(true)
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
    setReportsLoading(false)
  }

  async function fetchMachines() {
    setMachinesLoading(true)
    const { data, error } = await supabase.from('machines').select('*')
    if (error) {
      setError(error.message)
    } else {
      setMachines(data)
    }
    setMachinesLoading(false)
  }

  useEffect(() => {
    fetchReports()
    fetchMachines()
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
    setNearestMatch(null)
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

  function handleReportFromMap(id) {
    setMachineId(id)
    setNearestMatch(null)
    document
        .getElementById('report-form')
        ?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  function findNearestMachine() {
    if (!navigator.geolocation) {
      setNearestError('Geolocation is not supported in this browser.')
      return
    }
    if (machines.length === 0) {
      setNearestError('No machine locations loaded yet — try again in a moment.')
      return
    }

    setLocatingNearest(true)
    setNearestError(null)

    navigator.geolocation.getCurrentPosition(
        (pos) => {
          const { latitude, longitude } = pos.coords
          let closest = null
          let closestDist = Infinity

          for (const m of machines) {
            const d = distanceMiles(latitude, longitude, m.lat, m.lng)
            if (d < closestDist) {
              closestDist = d
              closest = m
            }
          }

          setLocatingNearest(false)
          if (closest) {
            setMachineId(closest.machine_id)
            setNearestMatch({ ...closest, distance: closestDist })
          }
        },
        () => {
          setLocatingNearest(false)
          setNearestError('Could not get your location — check permissions.')
        }
    )
  }

  return (
      <div>
        <div style={styles.topBar} />
        <div style={styles.page}>

          <header style={styles.header}>
            <div style={styles.titleRow}>
              <PokeballIcon size={34} />
              <h1 style={styles.h1}>Machine Status</h1>
            </div>
            <p style={styles.subtitle}>
              Is the vending machine actually working? Report it below and let us know!
            </p>
          </header>

          <form id="report-form" onSubmit={handleSubmit} style={styles.card}>
            <h2 style={styles.h2}>Report a machine</h2>

            <div style={{ marginBottom: 12 }}>
              <button
                  type="button"
                  onClick={findNearestMachine}
                  style={styles.locateNearestBtn}
                  disabled={locatingNearest}
              >
                {locatingNearest ? 'Locating…' : '📍 Find nearest machine'}
              </button>
              {nearestMatch && (
                  <p style={styles.nearestText}>
                    Matched: <strong>{nearestMatch.name}</strong> — {nearestMatch.address}
                    {' '}(~{nearestMatch.distance.toFixed(1)} mi away)
                  </p>
              )}
              {nearestError && <p style={{ ...styles.nearestText, color: '#e03131' }}>{nearestError}</p>}
            </div>

            <div style={styles.formRow}>
              <label style={styles.label}>
                Machine ID
                <input
                    style={styles.input}
                    value={machineId}
                    onChange={(e) => {
                      setMachineId(e.target.value)
                      setNearestMatch(null)
                    }}
                    placeholder="e.g. Q00173, or use Find nearest machine above"
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
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                    type="button"
                    onClick={() => setView('map')}
                    style={view === 'map' ? styles.toggleActive : styles.toggle}
                >
                  Map
                </button>
                <button
                    type="button"
                    onClick={() => setView('list')}
                    style={view === 'list' ? styles.toggleActive : styles.toggle}
                >
                  List
                </button>
              </div>
            </div>

            {error && <p style={styles.error}>Error: {error}</p>}

            {view === 'map' ? (
                machinesLoading ? (
                    <p style={styles.subtitle}>Loading machines…</p>
                ) : machines.length === 0 ? (
                    <p style={styles.subtitle}>
                      No machine locations yet — add rows to the{' '}
                      <code>machines</code> table to plot them here.
                    </p>
                ) : (
                    <MapView
                        machines={machines}
                        latestByMachine={latestByMachine}
                        onReport={handleReportFromMap}
                    />
                )
            ) : (
                <>
                  <input
                      style={{ ...styles.input, maxWidth: 220, marginBottom: 12 }}
                      placeholder="Search machine ID…"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                  />
                  {reportsLoading ? (
                      <p style={styles.subtitle}>Loading reports…</p>
                  ) : filtered.length === 0 ? (
                      <p style={styles.subtitle}>No reports yet — be the first.</p>
                  ) : (
                      <ul style={styles.list}>
                        {filtered.map((r) => {
                          const meta = statusMeta(r.status)
                          return (
                              <li key={r.id} style={styles.listItem}>
                                <span style={{ ...styles.dot, background: meta.color }} />
                                <div style={{ flex: 1 }}>
                                  <div style={styles.machineRow}>
                                    <strong>{r.machine_id}</strong>
                                    <span style={{ color: meta.color, fontWeight: 700 }}>
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
                  )}
                </>
            )}
          </section>

          <section style={styles.bioCard}>
            <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
              <PokeballIcon size={22} />
              <div>
                <h2 style={{ ...styles.h2, marginBottom: 6 }}>Why this exists</h2>
                <p style={styles.bioText}>
                  The card machine at the Mountlake Terrace Safeway (Q00173) has
                  been broken for over a month, and the only way to know is to venture out there yourself
                  and check. So, I built this instead. Report a broken or empty machine here! Happy pokemon hunting &lt;3
                </p>
              </div>
            </div>
          </section>

          <div style={styles.starterRow}>
            {STARTERS.map((p) => (

                key={p.name}
              href={p.href}
              target="_blank"
              rel="noreferrer"
              style={styles.starterLink}
              >
              <img src={p.src} alt={p.name} style={styles.starterImg} />
              </a>
              ))}
          </div>

        </div>
      </div>
  )
}

const styles = {
  page: {
    maxWidth: 640,
    margin: '0 auto',
    padding: '28px 20px 80px',
    fontFamily: "'Nunito', -apple-system, BlinkMacSystemFont, sans-serif",
    color: '#1a1a1a',
  },
  topBar: {
    height: 10,
    width: '100%',
    background:
        'linear-gradient(90deg, #ee1515 0%, #ee1515 33%, #3b4cca 33%, #3b4cca 66%, #ffde00 66%)',
  },
  header: { marginBottom: 24 },
  titleRow: { display: 'flex', alignItems: 'center', gap: 12 },
  h1: {
    fontFamily: "'Fredoka', 'Nunito', sans-serif",
    fontSize: 30,
    margin: 0,
    color: '#1a1a1a',
    letterSpacing: 0.2,
  },
  subtitle: { color: '#5b5b5b', marginTop: 8, lineHeight: 1.5, fontSize: 15 },
  card: {
    background: '#fff',
    border: '3px solid #1a1a1a',
    borderRadius: 18,
    padding: 20,
    marginBottom: 20,
    boxShadow: '0 3px 0 #1a1a1a',
  },
  bioCard: {
    background: '#fff8dc',
    border: '2px dashed #ee1515',
    borderRadius: 18,
    padding: 18,
    marginTop: 8,
  },
  bioText: {
    color: '#444',
    lineHeight: 1.6,
    fontSize: 14,
    margin: 0,
    fontStyle: 'italic',
  },
  starterRow: {
    display: 'flex',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 14,
    marginTop: 24,
  },
  starterLink: {
    display: 'inline-flex',
    transition: 'transform 0.15s ease',
  },
  starterImg: {
    width: 48,
    height: 48,
    imageRendering: 'pixelated',
  },
  h2: {
    fontFamily: "'Fredoka', 'Nunito', sans-serif",
    fontSize: 19,
    margin: '0 0 12px',
  },
  formRow: { display: 'flex', gap: 12, marginBottom: 12 },
  label: {
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
    fontSize: 13,
    fontWeight: 700,
    color: '#444',
    flex: 1,
    marginBottom: 12,
  },
  input: {
    padding: '9px 11px',
    borderRadius: 10,
    border: '2px solid #d8d8d8',
    fontSize: 14,
    fontFamily: 'inherit',
  },
  button: {
    background: '#ee1515',
    color: '#fff',
    border: '2px solid #1a1a1a',
    borderRadius: 10,
    padding: '10px 18px',
    fontSize: 14,
    fontWeight: 700,
    cursor: 'pointer',
    boxShadow: '0 2px 0 #1a1a1a',
  },
  locateNearestBtn: {
    background: '#3b4cca',
    color: '#fff',
    border: '2px solid #1a1a1a',
    borderRadius: 10,
    padding: '8px 14px',
    fontSize: 13,
    fontWeight: 700,
    cursor: 'pointer',
  },
  nearestText: {
    fontSize: 13,
    color: '#333',
    marginTop: 8,
    marginBottom: 0,
  },
  listHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    flexWrap: 'wrap',
    gap: 8,
  },
  toggle: {
    background: '#f1f3f5',
    color: '#495057',
    border: '2px solid #dee2e6',
    borderRadius: 10,
    padding: '6px 14px',
    fontSize: 13,
    fontWeight: 700,
    cursor: 'pointer',
  },
  toggleActive: {
    background: '#3b4cca',
    color: '#fff',
    border: '2px solid #1a1a1a',
    borderRadius: 10,
    padding: '6px 14px',
    fontSize: 13,
    fontWeight: 700,
    cursor: 'pointer',
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
  error: { color: '#e03131', fontWeight: 700 },
}