import { Outlet } from 'react-router';
import { AppShell } from '../components/shell/AppShell';

const NAV = [
  {
    path: '/qc', exact: true, label: 'Batch QC (CoA)',
    icon: (<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M8 3H2v13l6.29 6.29c.94.94 2.48.94 3.42 0l4.29-4.29c.94-.94.94-2.48 0-3.42L8 3z"/><path d="M6 18L4 6"/><circle cx="4.5" cy="9.5" r="0.5" fill="currentColor"/></svg>),
  },
  {
    path: '/qc/inward', label: 'Inward QC (GRN)',
    icon: (<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>),
  },
];

export function QcLayout() {
  return (
    <AppShell
      module={{
        icon: (<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--color-accent)" strokeWidth="1.8" strokeLinecap="round"><path d="M8 3H2v13l6.29 6.29c.94.94 2.48.94 3.42 0l4.29-4.29c.94-.94.94-2.48 0-3.42L8 3z"/><path d="M6 18L4 6"/></svg>),
        label: 'Quality Control',
        sublabel: 'Batch QC · GRN QC · CoA',
      }}
      nav={NAV}
    >
      <Outlet />
    </AppShell>
  );
}
