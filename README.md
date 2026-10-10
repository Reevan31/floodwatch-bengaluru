# FloodWatch Bengaluru — Frontend Prototype

A responsive, map-centric frontend concept for exploring community flood-reporting interfaces. **Every report and count is synthetic demonstration content.** The map is an illustrative diagram, not a geographic map and not to scale.

## Run locally

Requirements: Node.js 22 and pnpm 11.

```bash
pnpm install
pnpm dev
```

The development server uses port `3000`. Create a production build with `pnpm build`.

## Included in this prototype

- Search and client-side filters for synthetic incident examples.
- An illustrative Bengaluru diagram with selectable synthetic markers.
- A detail panel that separates sample severity, verification and status labels.
- A report-form interface whose fields exist only in the open page.
- Responsive layouts, keyboard interactions, focus states and reduced-motion styling.

## Intentionally not connected

This is a frontend-only prototype. It makes no application API or backend calls and has no database, authentication, live map tiles, geocoding, file uploads, report submission, persistence, notifications, or authority integrations. The report action is disabled and cannot show a fake success state. No user-entered content is saved or sent anywhere. There are no live flood reports.

FloodWatch is not an emergency dispatch service. Do not enter floodwater, approach unsafe roads, or take photographs while driving.
