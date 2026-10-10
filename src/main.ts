import './style.css';
import { demoIncidents, BENGALURU_CENTER } from './incidents';
import type { DemoIncident, Severity, Verification, IncidentStatus } from './incidents';
import { createFloodMap, type MapHandle } from './map';

type SeverityFilter = 'all' | Severity;
type StatusFilter = 'all' | IncidentStatus;
type VerificationFilter = 'all' | Verification;
type ViewMode = 'map' | 'list';


const severityLabel: Record<Severity, string> = {
  low: 'Low',
  moderate: 'Moderate',
  severe: 'Severe',
};

const verificationLabel: Record<Verification, string> = {
  unverified: 'Not community-confirmed',
  community: 'Community-corroborated · demo',
};

const statusLabel: Record<IncidentStatus, string> = {
  active: 'Active · demo',
  improving: 'Improving · demo',
  resolved: 'Resolved · demo',
  stale: 'Stale sample',
};

const state: {
  query: string;
  severity: SeverityFilter;
  status: StatusFilter;
  verification: VerificationFilter;
  view: ViewMode;
  selectedId: string;
  reportOpen: boolean;
} = {
  query: '',
  severity: 'all',
  status: 'all',
  verification: 'all',
  view: 'map',
  selectedId: 'demo-01',
  reportOpen: false,
};

const rootElement = document.querySelector<HTMLDivElement>('#app');
if (!rootElement) throw new Error('The application root element is missing.');
const root: HTMLDivElement = rootElement;

// The Leaflet map is created once and its live DOM node is preserved across
// the full re-renders below (we move the node back into the fresh container
// instead of recreating the map, which keeps pan/zoom state and avoids
// excessive map refreshes).
let mapHandle: MapHandle | null = null;

/**
 * Keep the interactive map in sync with the current filtered incidents.
 * `focus` pins/opens a specific incident's popup (used when the user picks one
 * from the list); otherwise markers are simply refreshed to match filters.
 */
function syncMap(filtered: DemoIncident[], focusId?: string): void {
  const mount = document.getElementById('flood-map');
  if (!mount) return; // list view — no map container present

  if (mapHandle && !mount.contains(mapHandle.getContainer())) {
    // Re-attach the existing live map into the freshly rendered container.
    mount.appendChild(mapHandle.getContainer());
    mapHandle.invalidateSize();
  } else if (!mapHandle) {
    mapHandle = createFloodMap(mount, BENGALURU_CENTER, (id) => {
      // Marker clicked on the map → reflect selection in the app state.
      state.selectedId = id;
      render(`incident-${id}`);
    });
  }

  mapHandle?.setIncidents(filtered, state.selectedId);
  if (focusId) mapHandle?.focusIncident(focusId);
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => {
    const entities: Record<string, string> = {
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
    };
    return entities[character] ?? character;
  });
}

function visibleIncidents(): DemoIncident[] {
  const query = state.query.trim().toLowerCase();
  return demoIncidents.filter((incident) => {
    const matchesQuery = !query || `${incident.locality} ${incident.title} ${incident.category}`.toLowerCase().includes(query);
    const matchesSeverity = state.severity === 'all' || incident.severity === state.severity;
    const matchesStatus = state.status === 'all' || incident.status === state.status;
    const matchesVerification = state.verification === 'all' || incident.verification === state.verification;
    return matchesQuery && matchesSeverity && matchesStatus && matchesVerification;
  });
}

function statusClass(status: IncidentStatus): string {
  return `status-${status}`;
}

function renderIncidentCard(incident: DemoIncident): string {
  const selected = incident.id === state.selectedId;
  return `
    <button class="incident-card${selected ? ' is-selected' : ''}" type="button" data-action="select-incident" data-id="${incident.id}" data-focus-key="incident-${incident.id}" aria-pressed="${selected}" aria-label="View synthetic ${severityLabel[incident.severity].toLowerCase()} example in ${escapeHtml(incident.locality)}">
      <span class="incident-card__topline">
        <span class="severity-badge severity-${incident.severity}"><span class="severity-symbol" aria-hidden="true">${incident.severity === 'severe' ? '!' : incident.severity === 'moderate' ? '◆' : '•'}</span>${severityLabel[incident.severity]}</span>
        <span class="synthetic-tag">DEMO</span>
      </span>
      <span class="incident-card__title">${escapeHtml(incident.title)}</span>
      <span class="incident-card__category">${escapeHtml(incident.category)}</span>
      <span class="incident-card__badges">
        <span class="verification-badge verification-${incident.verification}">${verificationLabel[incident.verification]}</span>
        <span class="status-badge ${statusClass(incident.status)}">${statusLabel[incident.status]}</span>
      </span>
      <span class="incident-card__footer"><span>${incident.observations} sample observation${incident.observations === 1 ? '' : 's'}</span><span>${escapeHtml(incident.observationTime)}</span></span>
    </button>`;
}

function renderSelectedDetail(incident: DemoIncident | undefined): string {
  if (!incident) {
    return `
      <section class="selected-detail selected-detail--empty" aria-live="polite">
        <span class="eyebrow">SAMPLE INCIDENT DETAILS</span>
        <h3>No example matches these filters</h3>
        <p>Change a filter or clear the search to explore the synthetic examples.</p>
      </section>`;
  }

  return `
    <section class="selected-detail" aria-labelledby="selected-title" aria-live="polite">
      <div class="selected-detail__heading">
        <div>
          <span class="eyebrow">SAMPLE INCIDENT · ${incident.id.toUpperCase()}</span>
          <h3 id="selected-title">${escapeHtml(incident.title)}</h3>
          <p>${escapeHtml(incident.category)} <span aria-hidden="true">·</span> ${escapeHtml(incident.locality)}</p>
        </div>
        <span class="selected-detail__demo-mark" aria-label="Synthetic demonstration data">SAMPLE</span>
      </div>
      <div class="selected-detail__badges">
        <span class="severity-badge severity-${incident.severity}"><span class="severity-symbol" aria-hidden="true">${incident.severity === 'severe' ? '!' : incident.severity === 'moderate' ? '◆' : '•'}</span>${severityLabel[incident.severity]} example</span>
        <span class="verification-badge verification-${incident.verification}">${verificationLabel[incident.verification]}</span>
        <span class="status-badge ${statusClass(incident.status)}">${statusLabel[incident.status]}</span>
      </div>
      <p class="selected-detail__description">${escapeHtml(incident.description)}</p>
      <div class="selected-detail__meta">
        <div><span>Sample observation</span><strong>${escapeHtml(incident.observationTime)}</strong></div>
        <div><span>Sample observations</span><strong>${incident.observations}</strong></div>
        <div><span>Community confirmations · demo</span><strong>${incident.confirmations}</strong></div>
      </div>
    </section>`;
}

function renderDialog(): string {
  if (!state.reportOpen) return '';
  return `
    <div class="dialog-scrim" data-action="close-report-backdrop">
      <section class="report-dialog" role="dialog" aria-modal="true" aria-labelledby="report-dialog-title" aria-describedby="report-dialog-note" tabindex="-1" data-dialog="report">
        <div class="report-dialog__header">
          <div><span class="eyebrow">FRONTEND DEMO</span><h2 id="report-dialog-title">Draft a sample report</h2></div>
          <button class="icon-button" type="button" data-action="close-report" data-focus-key="report-close" aria-label="Close report form">×</button>
        </div>
        <div class="demo-callout demo-callout--modal" id="report-dialog-note"><span class="callout-icon" aria-hidden="true">i</span><p>This form is a visual prototype only. Nothing will be submitted, saved, looked up, or sent anywhere.</p></div>
        <form class="report-form" autocomplete="off">
          <label class="field-label" for="report-location">Neighbourhood or landmark <span>Example text only</span></label>
          <input id="report-location" name="location" type="text" placeholder="e.g. Indiranagar, 100 Feet Road" data-focus-key="report-location" />
          <p class="field-hint">No GPS or location search is connected.</p>

          <label class="field-label" for="report-category">What did you notice?</label>
          <select id="report-category" name="category">
            <option value="road">Road waterlogging</option>
            <option value="street">Street flooding</option>
            <option value="underpass">Underpass flooding</option>
            <option value="drain">Drain overflow</option>
            <option value="other">Other water-related issue</option>
          </select>

          <label class="field-label" for="report-severity">Observed severity</label>
          <select id="report-severity" name="severity">
            <option value="low">Low — visible, localized waterlogging</option>
            <option value="moderate">Moderate — may affect movement</option>
            <option value="severe">Severe — appears dangerous or impassable</option>
          </select>
          <p class="field-hint">Choose only from a safe place. Never enter floodwater or take photos while driving.</p>

          <label class="field-label" for="report-description">Short note <span>Optional</span></label>
          <textarea id="report-description" name="description" rows="3" placeholder="Describe what you can see from a safe location."></textarea>
          <div class="upload-unavailable"><span aria-hidden="true">＋</span><div><strong>Photo attachment unavailable</strong><small>This prototype does not upload files.</small></div></div>
          <button class="button button--disabled-submit" type="button" disabled aria-disabled="true">Submission unavailable in this demo</button>
          <p class="report-disclaimer">The fields above stay in this open page only and are discarded when you close it.</p>
        </form>
      </section>
    </div>`;
}

function render(focusKey?: string): void {
  const active = document.activeElement;
  const priorFocusKey = focusKey ?? (active instanceof HTMLElement ? active.dataset.focusKey : undefined);
  const priorSelection = active instanceof HTMLInputElement || active instanceof HTMLTextAreaElement
    ? { start: active.selectionStart, end: active.selectionEnd }
    : undefined;
  const filtered = visibleIncidents();
  const selected = filtered.find((incident) => incident.id === state.selectedId) ?? filtered[0];
  if (selected) state.selectedId = selected.id;

  const severeCount = demoIncidents.filter((incident) => incident.severity === 'severe').length;
  root.innerHTML = `
    <a class="skip-link" href="#main-content">Skip to content</a>
    <header class="site-header">
      <a class="brand" href="#top" aria-label="FloodWatch Bengaluru demo home">
        <span class="brand-mark" aria-hidden="true"><svg viewBox="0 0 36 36" focusable="false"><path d="M18 3.5 29.5 8v8.3c0 7.6-4.8 13.1-11.5 16.2C11.3 29.4 6.5 23.9 6.5 16.3V8L18 3.5Z"/><path d="M10.7 18.5c2.2-2.1 4.3-2.1 6.5 0s4.3 2.1 6.5 0 3.9-2.1 5.8-.5M12.7 23.1c1.5-1.3 3-.9 4.5.2 1.8 1.3 3.5 1.3 5.2 0 1.4-1.1 2.9-1.5 4.4-.2"/></svg></span>
        <span class="brand-copy"><strong>FloodWatch</strong><span>BENGALURU</span></span>
      </a>
      <nav class="site-nav" aria-label="Primary navigation">
        <a href="#map-section">Map</a>
        <a href="#safety">Safety</a>
      </nav>
      <div class="site-header__actions"><span class="header-demo-tag"><span aria-hidden="true">●</span> Demo only</span><button class="button button--primary button--small" type="button" data-action="open-report" data-focus-key="open-report"><span aria-hidden="true">＋</span> Report flooding</button></div>
    </header>

    <main id="main-content">
      <div class="demo-ribbon" role="status"><span class="demo-ribbon__icon" aria-hidden="true">i</span><span><strong>DEMONSTRATION MODE</strong> — All incidents and counts below are synthetic examples. No live data is connected.</span><a href="#safety">About this demo <span aria-hidden="true">↗</span></a></div>

      <section class="hero" id="top" aria-labelledby="hero-title">
        <div class="hero__copy"><span class="eyebrow hero__eyebrow"><span class="eyebrow-dot" aria-hidden="true"></span> A community information prototype</span><h1 id="hero-title">See flooding. Share what you notice. <em>Help Bengaluru stay informed.</em></h1><p>A simple way to explore neighbourhood observations and understand how reports can be described. This preview contains sample content only—not current flood conditions.</p><div class="hero__actions"><a class="button button--primary" href="#map-section">Explore the demo map <span aria-hidden="true">↓</span></a><button class="button button--quiet" type="button" data-action="open-report" data-focus-key="open-report"><span aria-hidden="true">＋</span> Start a sample report</button></div></div>
        <div class="hero__stamp" aria-label="Synthetic sample data"><div class="stamp-ring"><span>BUILT FOR</span><strong>LOCAL<br />AWARENESS</strong><span>BENGALURU · DEMO</span></div><svg class="stamp-lines" viewBox="0 0 180 180" aria-hidden="true"><path d="M13 150c29-13 43 10 70-1s36-43 83-34M13 130c32-14 46 8 72-3s39-43 81-33M12 110c31-14 48 6 73-4s38-44 81-34"/></svg></div>
      </section>

      <section class="demo-stats" aria-label="Synthetic demonstration summary">
        <div class="demo-stat"><span class="demo-stat__icon demo-stat__icon--teal" aria-hidden="true">◎</span><div><strong>${demoIncidents.length}</strong><span>synthetic examples</span></div></div>
        <div class="demo-stat"><span class="demo-stat__icon demo-stat__icon--amber" aria-hidden="true">!</span><div><strong>${severeCount}</strong><span>severe examples</span></div></div>
        <div class="demo-stat"><span class="demo-stat__icon demo-stat__icon--slate" aria-hidden="true">—</span><div><strong>0</strong><span>live connections</span></div></div>
        <span class="demo-stats__note">Illustrative data · not real-time</span>
      </section>

      <section class="map-explorer" id="map-section" aria-labelledby="explorer-title">
        <div class="section-heading"><div><span class="eyebrow">EXPLORE EXAMPLES</span><h2 id="explorer-title">Neighbourhood snapshots</h2></div><div class="view-toggle" role="group" aria-label="Choose an example view"><button type="button" class="view-toggle__button${state.view === 'map' ? ' is-active' : ''}" data-action="set-view" data-view="map" data-focus-key="view-map" aria-pressed="${state.view === 'map'}"><span aria-hidden="true">⌖</span> Map</button><button type="button" class="view-toggle__button${state.view === 'list' ? ' is-active' : ''}" data-action="set-view" data-view="list" data-focus-key="view-list" aria-pressed="${state.view === 'list'}"><span aria-hidden="true">☷</span> List</button></div></div>

        <div class="dashboard-grid${state.view === 'list' ? ' dashboard-grid--list' : ''}">
          <aside class="incident-panel" aria-labelledby="incidents-heading">
            <div class="incident-panel__heading"><div><span class="eyebrow">SYNTHETIC DATASET</span><h3 id="incidents-heading">Sample reports</h3></div><span class="result-count" id="result-count">${filtered.length} of ${demoIncidents.length}</span></div>
            <label class="search-field" for="incident-search"><span aria-hidden="true">⌕</span><span class="sr-only">Search neighbourhood or report type</span><input id="incident-search" type="search" placeholder="Search a neighbourhood or issue" value="${escapeHtml(state.query)}" autocomplete="off" data-focus-key="incident-search" /><kbd>⌘ K</kbd></label>
            <div class="filters"><div class="filters__heading"><span>Refine examples</span><button type="button" class="text-button" data-action="clear-filters" data-focus-key="clear-filters">Clear</button></div><div class="filter-row"><label for="severity-filter">Severity</label><select id="severity-filter" data-filter="severity" data-focus-key="severity-filter"><option value="all"${state.severity === 'all' ? ' selected' : ''}>All levels</option><option value="low"${state.severity === 'low' ? ' selected' : ''}>Low</option><option value="moderate"${state.severity === 'moderate' ? ' selected' : ''}>Moderate</option><option value="severe"${state.severity === 'severe' ? ' selected' : ''}>Severe</option></select></div><div class="filter-row"><label for="status-filter">Status</label><select id="status-filter" data-filter="status" data-focus-key="status-filter"><option value="all"${state.status === 'all' ? ' selected' : ''}>All statuses</option><option value="active"${state.status === 'active' ? ' selected' : ''}>Active example</option><option value="improving"${state.status === 'improving' ? ' selected' : ''}>Improving example</option><option value="resolved"${state.status === 'resolved' ? ' selected' : ''}>Resolved example</option><option value="stale"${state.status === 'stale' ? ' selected' : ''}>Stale sample</option></select></div><div class="filter-row"><label for="verification-filter">Verification</label><select id="verification-filter" data-filter="verification" data-focus-key="verification-filter"><option value="all"${state.verification === 'all' ? ' selected' : ''}>All labels</option><option value="unverified"${state.verification === 'unverified' ? ' selected' : ''}>Not community-confirmed</option><option value="community"${state.verification === 'community' ? ' selected' : ''}>Community-corroborated</option></select></div></div>
            <div class="incident-list" id="incident-list" aria-label="Synthetic example reports" aria-live="polite">${filtered.length ? filtered.map(renderIncidentCard).join('') : '<div class="empty-state"><span aria-hidden="true">⌕</span><strong>No matching examples</strong><p>Try another search or clear one of the filters.</p><button class="button button--outline button--small" type="button" data-action="clear-filters" data-focus-key="empty-clear">Clear filters</button></div>'}</div>
            <p class="panel-footnote"><span aria-hidden="true">i</span> Every item is synthetic and shown only to demonstrate the interface.</p>
          </aside>

          <section class="map-panel" aria-labelledby="map-heading">
            <div class="map-panel__heading"><div><span class="eyebrow">LIVE BASEMAP · DEMO DATA</span><h3 id="map-heading">Bengaluru, Karnataka</h3></div><button type="button" class="map-fit" data-action="fit-map" data-focus-key="fit-map" title="Zoom to fit all visible markers"><span aria-hidden="true">⤢</span> Fit markers</button></div>
            <div class="map-canvas" id="flood-map" role="application" aria-label="Interactive map of Bengaluru with synthetic demonstration flood markers. Basemap tiles from OpenStreetMap."></div>
            <p class="map-attribution"><span aria-hidden="true">◇</span> Markers are synthetic demo incidents placed at approximate real coordinates — not live reports. Basemap © OpenStreetMap contributors.</p>
            <div class="map-legend" aria-label="Map marker legend"><span class="map-legend__title">Reported severity · sample</span><span><i class="legend-dot legend-dot--low" aria-hidden="true">•</i> Low</span><span><i class="legend-dot legend-dot--moderate" aria-hidden="true">◆</i> Moderate</span><span><i class="legend-dot legend-dot--severe" aria-hidden="true">!</i> Severe</span><span><i class="legend-dot legend-dot--resolved" aria-hidden="true">✓</i> Resolved</span><span class="map-legend__separate">Verification and status are separate labels</span></div>
            ${renderSelectedDetail(selected)}
          </section>
        </div>
      </section>

      <section class="safety-section" id="safety" aria-labelledby="safety-title"><div class="safety-section__mark" aria-hidden="true">!</div><div class="safety-section__copy"><span class="eyebrow">SAFETY FIRST</span><h2 id="safety-title">A report is not an emergency response.</h2><p>FloodWatch is a community information concept, not an emergency dispatch service. This preview has no live reports and does not contact authorities. Never enter floodwater, approach unsafe roads, or take photographs while driving.</p></div><div class="safety-section__aside"><strong>Frontend-only prototype</strong><span>No accounts · no uploads · no live data</span><button type="button" class="text-button text-button--dark" data-action="open-report" data-focus-key="open-report">Explore the sample form <span aria-hidden="true">↗</span></button></div></section>
    </main>

    <footer class="site-footer"><a class="brand brand--footer" href="#top"><span class="brand-mark" aria-hidden="true"><svg viewBox="0 0 36 36" focusable="false"><path d="M18 3.5 29.5 8v8.3c0 7.6-4.8 13.1-11.5 16.2C11.3 29.4 6.5 23.9 6.5 16.3V8L18 3.5Z"/><path d="M10.7 18.5c2.2-2.1 4.3-2.1 6.5 0s4.3 2.1 6.5 0 3.9-2.1 5.8-.5M12.7 23.1c1.5-1.3 3-.9 4.5.2 1.8 1.3 3.5 1.3 5.2 0 1.4-1.1 2.9-1.5 4.4-.2"/></svg></span><span class="brand-copy"><strong>FloodWatch</strong><span>BENGALURU</span></span></a><p>Community information prototype · synthetic data only</p><a href="#safety">Safety and limitations ↑</a></footer>
    ${renderDialog()}`;

  // Mount/refresh the interactive map (map view only).
  const shouldFocusMap = typeof focusKey === 'string' && focusKey.startsWith('incident-');
  syncMap(filtered, shouldFocusMap ? state.selectedId : undefined);

  if (priorFocusKey) {
    const escapedKey = CSS.escape(priorFocusKey);
    const nextFocus = root.querySelector<HTMLElement>(`[data-focus-key="${escapedKey}"]`);
    if (nextFocus) {
      nextFocus.focus({ preventScroll: true });
      if (nextFocus instanceof HTMLInputElement && priorSelection && priorSelection.start !== null && priorSelection.end !== null) {
        nextFocus.setSelectionRange(priorSelection.start, priorSelection.end);
      }
    }
  }
}

root.addEventListener('click', (event: MouseEvent) => {
  const target = event.target;
  if (!(target instanceof Element)) return;
  const actionTarget = target.closest<HTMLElement>('[data-action]');
  if (!actionTarget) return;

  switch (actionTarget.dataset.action) {
    case 'open-report':
      state.reportOpen = true;
      render('report-location');
      break;
    case 'close-report':
      state.reportOpen = false;
      render('open-report');
      break;
    case 'close-report-backdrop':
      if (target === actionTarget) {
        state.reportOpen = false;
        render('open-report');
      }
      break;
    case 'select-incident': {
      const id = actionTarget.dataset.id;
      if (id && demoIncidents.some((incident) => incident.id === id)) {
        state.selectedId = id;
        // Ensure we're looking at the map so the focused marker is visible.
        if (state.view !== 'map') state.view = 'map';
        render(`incident-${id}`);
      }
      break;
    }
    case 'fit-map':
      mapHandle?.fitToIncidents();
      break;
    case 'set-view': {
      const view = actionTarget.dataset.view;
      if (view === 'map' || view === 'list') {
        state.view = view;
        render(view === 'map' ? 'view-map' : 'view-list');
      }
      break;
    }
    case 'clear-filters':
      state.query = '';
      state.severity = 'all';
      state.status = 'all';
      state.verification = 'all';
      render(actionTarget.dataset.focusKey ?? 'incident-search');
      break;
  }
});

root.addEventListener('input', (event: Event) => {
  const target = event.target;
  if (target instanceof HTMLInputElement && target.id === 'incident-search') {
    state.query = target.value;
    render('incident-search');
  }
});

root.addEventListener('change', (event: Event) => {
  const target = event.target;
  if (!(target instanceof HTMLSelectElement)) return;
  if (target.dataset.filter === 'severity' && ['all', 'low', 'moderate', 'severe'].includes(target.value)) {
    state.severity = target.value as SeverityFilter;
  } else if (target.dataset.filter === 'status' && ['all', 'active', 'improving', 'resolved', 'stale'].includes(target.value)) {
    state.status = target.value as StatusFilter;
  } else if (target.dataset.filter === 'verification' && ['all', 'unverified', 'community'].includes(target.value)) {
    state.verification = target.value as VerificationFilter;
  } else {
    return;
  }
  render(target.dataset.focusKey);
});

document.addEventListener('keydown', (event: KeyboardEvent) => {
  if (event.key === 'Escape' && state.reportOpen) {
    state.reportOpen = false;
    render('open-report');
    return;
  }
  if (!state.reportOpen || event.key !== 'Tab') return;
  const dialog = root.querySelector<HTMLElement>('[data-dialog="report"]');
  if (!dialog) return;
  const focusable = [...dialog.querySelectorAll<HTMLElement>('button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), a[href]')];
  const first = focusable[0];
  const last = focusable.at(-1);
  if (!first || !last) return;
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first.focus();
  }
});

// Search shortcut improves keyboard access without calling any browser or network service.
document.addEventListener('keydown', (event: KeyboardEvent) => {
  if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
    event.preventDefault();
    root.querySelector<HTMLInputElement>('#incident-search')?.focus();
  }
});

render();
