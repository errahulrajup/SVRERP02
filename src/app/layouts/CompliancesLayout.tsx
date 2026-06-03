import { Outlet } from 'react-router';
import { BosModuleLayout } from '../components/BosModuleLayout';

const NAV = [
  {
    path: '/compliances', exact: true, label: 'FSSAI Checklists',
    icon: (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
        <path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
      </svg>
    ),
  },
  {
    path: '/compliances/capa', label: 'CAPA Tracker',
    icon: (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
        <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
      </svg>
    ),
  },
  {
    path: '/compliances/audits', label: 'Audit Schedules',
    icon: (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
        <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/>
        <line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
        <path d="M8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01M16 18h.01"/>
      </svg>
    ),
  },
  {
    path: '/compliances/complaints', label: 'Customer Complaints',
    icon: (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
      </svg>
    ),
  },
];

export function CompliancesLayout() {
  return (
    <BosModuleLayout
      module={{
        icon: (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#D4A843" strokeWidth="1.8" strokeLinecap="round">
            <rect x="3" y="3" width="18" height="18" rx="3"/>
            <path d="M9 12l2 2 4-4"/>
          </svg>
        ),
        label: 'Compliances',
        sublabel: 'FSSAI · CAPA · Audits · Complaints',
      }}
      nav={NAV}
    >
      <Outlet />
    </BosModuleLayout>
  );
}
