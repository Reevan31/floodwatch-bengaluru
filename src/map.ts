import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet.markercluster';
import 'leaflet.markercluster/dist/MarkerCluster.css';
import 'leaflet.markercluster/dist/MarkerCluster.Default.css';
import type { DemoIncident } from './incidents';

export interface MapHandle {
  /** The live Leaflet container element (stable across re-renders). */
  getContainer(): HTMLElement;
  /** Recalculate map size after being re-attached to the DOM. */
  invalidateSize(): void;
  /** Replace the visible markers with the given incidents (highlighting `selectedId`). */
  setIncidents(incidents: DemoIncident[], selectedId?: string): void;
  /** Pan/zoom to a marker and open its popup (explicit user selection). */
  focusIncident(id: string): void;
  /** Pan/zoom the map to the user's current location (requests permission). */
  centerOnMe(): void;
  /** Fit the map bounds to the currently visible markers. */
  fitToIncidents(): void;
  destroy(): void;
}

type Severity = DemoIncident['severity'];

// Severity is encoded by BOTH colour and a distinct glyph so status is never
// conveyed by colour alone (accessibility requirement).
const SEVERITY_STYLE: Record<Severity, { color: string; glyph: string; label: string }> = {
  low: { color: '#b46d20', glyph: '•', label: 'Low' },
  moderate: { color: '#d98014', glyph: '◆', label: 'Moderate' },
  severe: { color: '#c0392b', glyph: '!', label: 'Severe' },
};

const STATUS_LABEL: Record<DemoIncident['status'], string> = {
  active: 'Active · demo',
  improving: 'Improving · demo',
  resolved: 'Resolved · demo',
  stale: 'Stale sample',
};

const VERIFICATION_LABEL: Record<DemoIncident['verification'], string> = {
  unverified: 'Not community-confirmed',
  community: 'Community-corroborated · demo',
};

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (c) => {
    const map: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
    return map[c] ?? c;
  });
}

function makeIcon(incident: DemoIncident, selected: boolean): L.DivIcon {
  const style = SEVERITY_STYLE[incident.severity];
  const resolved = incident.status === 'resolved';
  return L.divIcon({
    className: 'fw-marker-wrap',
    html:
      `<span class="fw-marker fw-marker--${incident.severity}${selected ? ' is-selected' : ''}" ` +
      `style="--marker-color:${resolved ? '#5b7c67' : style.color}" ` +
      `role="img" aria-label="${style.label} severity, ${escapeHtml(incident.locality)}">` +
      `<span class="fw-marker__glyph" aria-hidden="true">${resolved ? '✓' : style.glyph}</span>` +
      `</span>`,
    iconSize: [30, 30],
    iconAnchor: [15, 15],
    popupAnchor: [0, -14],
  });
}

function popupHtml(incident: DemoIncident): string {
  const style = SEVERITY_STYLE[incident.severity];
  const resolved = incident.status === 'resolved';
  return `
    <div class="fw-popup">
      <span class="fw-popup__tag">DEMO · ${escapeHtml(incident.id.toUpperCase())}</span>
      <strong class="fw-popup__title">${escapeHtml(incident.title)}</strong>
      <span class="fw-popup__meta">${escapeHtml(incident.category)} · ${escapeHtml(incident.locality)}</span>
      <span class="fw-popup__badges">
        <span class="fw-chip fw-chip--${incident.severity}">
          <span aria-hidden="true">${resolved ? '✓' : style.glyph}</span>${style.label}
        </span>
        <span class="fw-chip fw-chip--${incident.verification}">${VERIFICATION_LABEL[incident.verification]}</span>
        <span class="fw-chip fw-chip--${incident.status}">${STATUS_LABEL[incident.status]}</span>
      </span>
      <span class="fw-popup__time"><span aria-hidden="true">🕒</span> ${escapeHtml(incident.observationTime)} · ${incident.observations} observation${incident.observations === 1 ? '' : 's'}</span>
    </div>`;
}

export function createFloodMap(
  container: HTMLElement,
  center: { lat: number; lng: number },
  onSelect: (id: string) => void,
): MapHandle {
  const map = L.map(container, {
    center: [center.lat, center.lng],
    zoom: 12,
    zoomControl: true,
    attributionControl: true,
  });

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
  }).addTo(map);

  const cluster = L.markerClusterGroup({
    showCoverageOnHover: false,
    maxClusterRadius: 50,
    iconCreateFunction: (c) => {
      const count = c.getChildCount();
      return L.divIcon({
        html: `<span class="fw-cluster"><span>${count}</span></span>`,
        className: 'fw-cluster-wrap',
        iconSize: [40, 40],
      });
    },
  });
  map.addLayer(cluster);

  let current: DemoIncident[] = [];
  const markerById = new Map<string, L.Marker>();
  let selectedId: string | undefined;

  function rebuild(incidents: DemoIncident[]): void {
    current = incidents;
    cluster.clearLayers();
    markerById.clear();
    for (const incident of incidents) {
      const marker = L.marker([incident.lat, incident.lng], {
        icon: makeIcon(incident, incident.id === selectedId),
        title: incident.title,
        alt: `${incident.title} — synthetic demo`,
      });
      marker.bindPopup(popupHtml(incident), { closeButton: true, autoPan: true });
      marker.on('click', () => {
        selectedId = incident.id;
        onSelect(incident.id);
      });
      markerById.set(incident.id, marker);
      cluster.addLayer(marker);
    }
  }

  // "Center on me" floating control.
  const LocateControl = L.Control.extend({
    options: { position: 'topleft' as L.ControlPosition },
    onAdd(): HTMLElement {
      const btn = L.DomUtil.create('button', 'fw-locate');
      btn.type = 'button';
      btn.title = 'Center on my location';
      btn.setAttribute('aria-label', 'Center map on my current location');
      btn.innerHTML = '<span aria-hidden="true">⌖</span>';
      L.DomEvent.disableClickPropagation(btn);
      btn.addEventListener('click', () => handle.centerOnMe());
      return btn;
    },
  });
  map.addControl(new LocateControl());

  const handle: MapHandle = {
    getContainer() {
      return map.getContainer();
    },
    invalidateSize() {
      map.invalidateSize();
    },
    setIncidents(incidents, selected) {
      selectedId = selected;
      rebuild(incidents);
    },
    focusIncident(id) {
      selectedId = id;
      rebuild(current); // refresh highlight state on markers
      const marker = markerById.get(id);
      if (marker) {
        cluster.zoomToShowLayer(marker, () => marker.openPopup());
      }
    },
    centerOnMe() {
      if (!('geolocation' in navigator)) {
        window.alert('Location is not available in this browser. You can still explore the map by panning.');
        return;
      }
      navigator.geolocation.getCurrentPosition(
        (pos) => map.setView([pos.coords.latitude, pos.coords.longitude], 15, { animate: true }),
        () => window.alert('Could not get your location. Check browser permissions, or explore the map manually.'),
        { enableHighAccuracy: true, timeout: 8000, maximumAge: 30000 },
      );
    },
    fitToIncidents() {
      if (current.length === 0) return;
      const bounds = L.latLngBounds(current.map((i) => [i.lat, i.lng] as [number, number]));
      map.fitBounds(bounds.pad(0.25));
    },
    destroy() {
      map.remove();
    },
  };

  requestAnimationFrame(() => map.invalidateSize());
  return handle;
}

