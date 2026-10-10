// Shared synthetic demonstration data model for FloodWatch Bengaluru.
//
// IMPORTANT: every value here is clearly-labelled synthetic content used to
// exercise the interface. It does not represent real or current flooding in
// Bengaluru. When the backend (see db/) is wired up, this module is replaced by
// API-backed data behind the same `DemoIncident` shape (see COORDINATION/CONTRACTS.md).

export type Severity = 'low' | 'moderate' | 'severe';
export type Verification = 'unverified' | 'community';
export type IncidentStatus = 'active' | 'improving' | 'resolved' | 'stale';

export interface DemoIncident {
  id: string;
  locality: string;
  title: string;
  category: string;
  severity: Severity;
  verification: Verification;
  status: IncidentStatus;
  observationTime: string;
  observations: number;
  confirmations: number;
  description: string;
  lat: number;
  lng: number;
}

// Bengaluru city centre used to frame the map.
export const BENGALURU_CENTER = { lat: 12.9716, lng: 77.5946 };

// Synthetic demonstration incidents placed at approximate real Bengaluru
// coordinates so the interactive map is geographically meaningful. All content
// is labelled demo data and does not represent current or real conditions.
export const demoIncidents: DemoIncident[] = [
  {
    id: 'demo-01', locality: 'Hebbal', title: 'Hebbal flyover underpass', category: 'Underpass flooding',
    severity: 'severe', verification: 'unverified', status: 'active', observationTime: '12 Aug 2025 · 9:40 AM',
    observations: 1, confirmations: 0, description: 'Example report describing water accumulation at an underpass. This is synthetic content and does not describe current conditions.', lat: 13.0358, lng: 77.5970,
  },
  {
    id: 'demo-02', locality: 'Koramangala', title: '80 Feet Road, Koramangala', category: 'Road waterlogging',
    severity: 'moderate', verification: 'community', status: 'active', observationTime: '12 Aug 2025 · 9:18 AM',
    observations: 2, confirmations: 2, description: 'Synthetic example of a community-corroborated waterlogging observation. No real people or live reports are represented.', lat: 12.9345, lng: 77.6266,
  },
  {
    id: 'demo-03', locality: 'Indiranagar', title: '100 Feet Road, Indiranagar', category: 'Street flooding',
    severity: 'low', verification: 'unverified', status: 'active', observationTime: '12 Aug 2025 · 8:55 AM',
    observations: 1, confirmations: 0, description: 'A low-severity sample observation for illustrating the map and status badges.', lat: 12.9784, lng: 77.6408,
  },
  {
    id: 'demo-04', locality: 'Bellandur', title: 'Outer Ring Road service lane', category: 'Road waterlogging',
    severity: 'severe', verification: 'community', status: 'active', observationTime: '12 Aug 2025 · 8:42 AM',
    observations: 3, confirmations: 2, description: 'Synthetic severe example used only to demonstrate independent severity and verification labels.', lat: 12.9254, lng: 77.6764,
  },
  {
    id: 'demo-05', locality: 'Malleshwaram', title: '8th Cross, Malleshwaram', category: 'Drain overflow',
    severity: 'moderate', verification: 'community', status: 'improving', observationTime: '12 Aug 2025 · 8:15 AM',
    observations: 2, confirmations: 1, description: 'Example incident marked as improving to show that a status can change independently of severity.', lat: 13.0033, lng: 77.5703,
  },
  {
    id: 'demo-06', locality: 'BTM Layout', title: '2nd Stage, BTM Layout', category: 'Street flooding',
    severity: 'low', verification: 'unverified', status: 'stale', observationTime: '11 Aug 2025 · 6:20 PM',
    observations: 1, confirmations: 0, description: 'A deliberately stale sample report. It is not a current observation or a real incident.', lat: 12.9166, lng: 77.6101,
  },
  {
    id: 'demo-07', locality: 'Vijayanagar', title: 'Service Road, Vijayanagar', category: 'Road waterlogging',
    severity: 'moderate', verification: 'community', status: 'resolved', observationTime: '11 Aug 2025 · 4:05 PM',
    observations: 2, confirmations: 1, description: 'Resolved sample incident included to demonstrate the status filter and history labels.', lat: 12.9719, lng: 77.5367,
  },
];
