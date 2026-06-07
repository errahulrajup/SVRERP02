import { Outlet } from 'react-router';
import { AppShell, Icons } from '../components/shell/AppShell';
import { useUnreadCount, useSiteSettings } from '../hooks';

const CmsIcons = {
  products:     (<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg>),
  categories:   (<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>),
  blog:         (<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>),
  homepage:     (<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>),
  about:        (<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>),
  testimonials: (<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>),
  media:        (<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>),
  inquiries:    (<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>),
  seo:          (<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>),
  analytics:    (<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>),
  settings:     (<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>),
  dms:          (<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>),
};

export function CmsLayout() {
  const { settings } = useSiteSettings();
  const unread = useUnreadCount();
  const logoSrc = settings.site_logo;

  const NAV = [
    {
      path: '/cms', exact: true, label: 'Operations Dashboard',
      icon: Icons.dashboard,
    },
    // section items are flattened as single-level nav
    { path: '/cms/products',     label: 'Products',           icon: CmsIcons.products,     section: 'Content Management', minRole: 'EDITOR' },
    { path: '/cms/categories',   label: 'Categories',         icon: CmsIcons.categories,   minRole: 'EDITOR' },
    { path: '/cms/blog',         label: 'Blog',               icon: CmsIcons.blog,         minRole: 'EDITOR' },
    { path: '/cms/homepage',     label: 'Homepage',           icon: CmsIcons.homepage,     minRole: 'EDITOR' },
    { path: '/cms/about',        label: 'About Page',         icon: CmsIcons.about,        minRole: 'EDITOR' },
    { path: '/cms/testimonials', label: 'Testimonials',       icon: CmsIcons.testimonials, minRole: 'EDITOR' },
    { path: '/cms/media',        label: 'Media Library',      icon: CmsIcons.media,        minRole: 'EDITOR' },
    { path: '/cms/inquiries',    label: 'Inquiries',          icon: CmsIcons.inquiries,    badge: unread > 0 ? unread : null, minRole: 'MANAGER' },
    { path: '/cms/seo',          label: 'SEO Manager',        icon: CmsIcons.seo,          minRole: 'MANAGER' },
    { path: '/cms/analytics',    label: 'Analytics',          icon: CmsIcons.analytics,    minRole: 'MANAGER' },
    { path: '/cms/settings',     label: 'Site & Social',      icon: CmsIcons.settings,     minRole: 'MANAGER' },
    { path: '/dms',              label: 'Document Pro (DMS)', icon: CmsIcons.dms },
  ];

  return (
    <AppShell
      module={{
        icon: logoSrc
          ? <img src={logoSrc} width={16} height={16} style={{ objectFit: 'contain' }} alt="Logo" />
          : <img src="/favicon.svg" width={16} height={16} alt="Logo" />,
        label: 'SVR20',
        sublabel: 'CMS · Content Portal',
      }}
      nav={NAV}
      footerLinks={[
        { path: '/', label: 'View Live Site', icon: Icons.globe },
      ]}
    >
      <Outlet />
    </AppShell>
  );
}
