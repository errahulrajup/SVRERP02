import { Outlet } from 'react-router';
import { AppShell, Icons } from '../components/shell/AppShell';
import { useSiteSettings } from '../hooks';

const NAV = [
  {
    section: 'System Control',
    minRole: 'ADMIN',
    items: [
      {
        path: '/admin/settings', label: 'Global Settings',
        icon: (<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><circle cx="12" cy="12" r="3"/><path d="M19.07 4.93l-1.41 1.41M4.93 4.93l1.41 1.41M12 2v2M12 20v2M20 12h2M2 12h2M19.07 19.07l-1.41-1.41M4.93 19.07l1.41-1.41"/></svg>),
      },
      {
        path: '/admin/users', label: 'Users',
        icon: (<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>),
      },
      {
        path: '/admin/roles', label: 'Roles & Perms',
        icon: (<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>),
      },
      {
        path: '/admin/audit', label: 'Audit Log',
        icon: (<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>),
      },
      {
        path: '/admin/health', label: 'System Health',
        icon: (<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>),
      },
      {
        path: '/admin/backups', label: 'Backups',
        icon: (<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>),
      },
    ],
  },
];

const DASHBOARD_NAV = [
  {
    path: '/admin', exact: true, label: 'ERP Dashboard',
    icon: Icons.dashboard,
  },
];



export function AdminLayout() {
  const { settings } = useSiteSettings();
  const logoSrc = settings.site_logo;

  return (
    <AppShell
      module={{
        icon: logoSrc
          ? <img src={logoSrc} width={16} height={16} style={{ objectFit: 'contain' }} alt="Logo" />
          : <img src="/favicon.svg" width={16} height={16} alt="Logo" />,
        label: 'ERP Control',
        sublabel: 'Admin Panel',
      }}
      nav={[...DASHBOARD_NAV, ...NAV] as any}
      footerLinks={[
        {
          path: '/', label: 'View Live Site',
          icon: Icons.globe,
        },
      ]}
    >
      <Outlet />
    </AppShell>
  );
}
