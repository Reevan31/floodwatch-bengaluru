# FloodWatch Bengaluru — Frontend TODO

## 1. Responsive dashboard and synthetic map — complete
- Create a simple, responsive, mobile-first FloodWatch Bengaluru interface with a clear map-centric dashboard, accessible controls, readable status/severity labels, and a restrained civic-tech visual style using teal/blue, amber, and severity colors.
- Use a self-contained illustrative Bengaluru map with local synthetic incident markers; do not use external map tiles, geocoding, APIs, or network data.
- Show clearly labeled synthetic demonstration incidents in a searchable incident list. Provide client-side filtering of demo incidents by relevant attributes such as severity or status.
- Selecting a synthetic incident from the map or list opens a detail panel with synthetic incident information.
- Clearly label all incidents as synthetic demo content and explain that the app is frontend-only and is not an emergency dispatch service.

## 2. Local-only report form interface — complete
- Provide a report form UI that can be opened and filled in locally, but cannot submit, simulate successful submission, persist data, or upload files.
- Make the frontend-only limitation clear wherever a reporting action appears; do not present a fake success state.

## 3. Accessibility and responsive behavior — complete
- Support mobile and desktop layouts, keyboard-friendly interactions, visible focus states, readable severity cues that do not rely on color alone, and semantic/accessible controls.
- Do not implement account authentication, databases, server operations, remote uploads, notifications, or administrative workflows.
