import { useEffect, useMemo, useState } from 'react'
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet'
import L from 'leaflet'

// Leaflet's default marker icons reference image files that don't
// resolve correctly under Vite's bundling — build our own instead.
function pinIcon(color) {
    return L.divIcon({
        className: '',
        html: `<div style="
      width: 22px; height: 22px; border-radius: 50% 50% 50% 0;
      background: ${color}; transform: rotate(-45deg);
      border: 2px solid white; box-shadow: 0 1px 3px rgba(0,0,0,0.4);
    "></div>`,
        iconSize: [22, 22],
        iconAnchor: [11, 22],
        popupAnchor: [0, -22],
    })
}

const ICONS = {
    working: pinIcon('#2f9e44'),
    broken: pinIcon('#e03131'),
    empty: pinIcon('#f08c00'),
    unknown: pinIcon('#868e96'),
}

const STATUS_LABEL = {
    working: 'Working',
    broken: 'Broken / Out of order',
    empty: 'Empty (needs restock)',
    unknown: 'No reports yet',
}

// Recenters the map imperatively when userLocation changes, since
// MapContainer only reads its `center` prop on first render.
function RecenterOnLocate({ position }) {
    const map = useMap()
    useEffect(() => {
        if (position) map.setView(position, 13)
    }, [position, map])
    return null
}

export default function MapView({ machines, latestByMachine, onReport }) {
    const [userLocation, setUserLocation] = useState(null)
    const [locateError, setLocateError] = useState(null)

    const statusByMachine = useMemo(() => {
        const map = new Map()
        for (const r of latestByMachine) map.set(r.machine_id, r.status)
        return map
    }, [latestByMachine])

    function locateMe() {
        if (!navigator.geolocation) {
            setLocateError('Geolocation is not supported in this browser.')
            return
        }
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                setLocateError(null)
                setUserLocation([pos.coords.latitude, pos.coords.longitude])
            },
            () => setLocateError('Could not get your location — check permissions.')
        )
    }

    const defaultCenter = [47.8107, -122.3] // roughly Edmonds/Lynnwood area
    const hasMachines = machines.length > 0

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 8 }}>
                <button type="button" onClick={locateMe} style={styles.locateButton}>
                    Find machines near me
                </button>
            </div>
            {locateError && <p style={{ color: '#e03131', fontSize: 13 }}>{locateError}</p>}

            <div style={{ height: 360, borderRadius: 12, overflow: 'hidden' }}>
                <MapContainer
                    center={hasMachines ? [machines[0].lat, machines[0].lng] : defaultCenter}
                    zoom={12}
                    style={{ height: '100%', width: '100%' }}
                >
                    <TileLayer
                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    />
                    <RecenterOnLocate position={userLocation} />

                    {userLocation && (
                        <Marker position={userLocation} icon={pinIcon('#1971c2')}>
                            <Popup>You are here</Popup>
                        </Marker>
                    )}

                    {machines.map((m) => {
                        const status = statusByMachine.get(m.machine_id) ?? 'unknown'
                        return (
                            <Marker
                                key={m.machine_id}
                                position={[m.lat, m.lng]}
                                icon={ICONS[status]}
                            >
                                <Popup>
                                    <strong>{m.name}</strong>
                                    <br />
                                    {m.address}
                                    <br />
                                    Machine ID: {m.machine_id}
                                    <br />
                                    Status: {STATUS_LABEL[status]}
                                    <br />
                                    <button
                                        type="button"
                                        style={styles.popupButton}
                                        onClick={() => onReport(m.machine_id)}
                                    >
                                        Report this machine
                                    </button>
                                </Popup>
                            </Marker>
                        )
                    })}
                </MapContainer>
            </div>
        </div>
    )
}

const styles = {
    locateButton: {
        background: '#1971c2',
        color: '#fff',
        border: 'none',
        borderRadius: 8,
        padding: '8px 14px',
        fontSize: 13,
        fontWeight: 600,
        cursor: 'pointer',
    },
    popupButton: {
        marginTop: 6,
        background: '#e03131',
        color: '#fff',
        border: 'none',
        borderRadius: 6,
        padding: '4px 8px',
        fontSize: 12,
        cursor: 'pointer',
    },
}