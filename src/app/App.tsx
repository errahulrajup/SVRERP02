import { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router';
import { useAuth } from './hooks';
import { assertRuntimeConfig, warnOptionalConfig } from './config/runtime';
import { Layout }      from './components/Layout';
import { AdminLayout } from './layouts/AdminLayout';
import { DmsLayout }   from './layouts/DmsLayout';
import { ProductionLayout } from './layouts/ProductionLayout';

// ── DMS pages (lazy) ──────────────────────────────────────────────────────────
const DmsDashboard = lazy(() => import('./modules/dms/DmsDashboard').then(m => ({ default: m.DmsDashboard })));
const DmsCreate    = lazy(() => import('./modules/dms/DmsCreate').then(m    => ({ default: m.DmsCreate })));
const DmsRecords   = lazy(() => import('./modules/dms/DmsRecords').then(m   => ({ default: m.DmsRecords })));
const DmsTemplates = lazy(() => import('./modules/dms/DmsTemplates').then(m => ({ default: m.DmsTemplates })));
const DmsVerify    = lazy(() => import('./modules/dms/DmsVerify').then(m    => ({ default: m.DmsVerify })));
const DmsSettings  = lazy(() => import('./modules/dms/DmsSettings').then(m  => ({ default: m.DmsSettings })));

// ── Production pages (lazy) ──────────────────────────────────────────────────
const Batches      = lazy(() => import('./modules/production/Batches').then(m => ({ default: m.Batches })));
const PackagingHouse = lazy(() => import('./modules/production/PackagingHouse').then(m => ({ default: m.PackagingHouse })));
const RecipeEngine = lazy(() => import('./modules/production/RecipeEngine').then(m => ({ default: m.RecipeEngine })));
const WorkCenters  = lazy(() => import('./modules/production/WorkCenters').then(m => ({ default: m.WorkCenters })));
const Equipment    = lazy(() => import('./modules/production/Equipment').then(m => ({ default: m.Equipment })));
const DailyLogs    = lazy(() => import('./modules/production/DailyLogs').then(m => ({ default: m.DailyLogs })));
const FloorMonitor = lazy(() => import('./modules/production/FloorMonitor').then(m => ({ default: m.FloorMonitor })));

// ── QC pages (lazy) ──────────────────────────────────────────────────────────
import { QcLayout } from './layouts/QcLayout';
const BatchQc = lazy(() => import('./modules/qc/BatchQc').then(m => ({ default: m.BatchQc })));
const GrnQc   = lazy(() => import('./modules/qc/GrnQc').then(m => ({ default: m.GrnQc })));

// ── Accounts pages (lazy) ──────────────────────────────────────────────────
import { AccountsLayout } from './layouts/AccountsLayout';
const AccountsDashboard = lazy(() => import('./modules/accounts/AccountsDashboard').then(m => ({ default: m.AccountsDashboard })));
const DispatchLog       = lazy(() => import('./modules/accounts/DispatchLog').then(m => ({ default: m.DispatchLog })));
const Invoices          = lazy(() => import('./modules/accounts/Invoices').then(m => ({ default: m.Invoices })));
const Expenses          = lazy(() => import('./modules/accounts/Expenses').then(m => ({ default: m.Expenses })));
const CostingDashboard  = lazy(() => import('./modules/accounts/CostingDashboard').then(m => ({ default: m.CostingDashboard })));

// ── Logistics pages (lazy) ──────────────────────────────────────────────────
import { LogisticsLayout } from './layouts/LogisticsLayout';
const SalesReturns     = lazy(() => import('./modules/logistics/SalesReturns').then(m => ({ default: m.SalesReturns })));
const DispatchOrders   = lazy(() => import('./modules/logistics/DispatchOrders').then(m => ({ default: m.DispatchOrders })));
const StorageLocations = lazy(() => import('./modules/logistics/StorageLocations').then(m => ({ default: m.StorageLocations })));
const FgStore          = lazy(() => import('./modules/logistics/FgStore').then(m => ({ default: m.FgStore })));
const RmStore          = lazy(() => import('./modules/logistics/RmStore').then(m => ({ default: m.RmStore })));
const GeneralStore     = lazy(() => import('./modules/logistics/GeneralStore').then(m => ({ default: m.GeneralStore })));

// ── FSMS pages (lazy) ────────────────────────────────────────────────────────
import { FsmsLayout } from './layouts/FsmsLayout';
const HaccpLog        = lazy(() => import('./modules/fsms/HaccpLog').then(m => ({ default: m.HaccpLog })));
const PrpLog          = lazy(() => import('./modules/fsms/PrpLog').then(m => ({ default: m.PrpLog })));
const AllergenControl = lazy(() => import('./modules/fsms/AllergenControl').then(m => ({ default: m.AllergenControl })));
const RecallLog       = lazy(() => import('./modules/fsms/RecallLog').then(m => ({ default: m.RecallLog })));
const SopRegister     = lazy(() => import('./modules/fsms/SopRegister').then(m => ({ default: m.SopRegister })));
const TrainingMatrix  = lazy(() => import('./modules/fsms/TrainingMatrix').then(m => ({ default: m.TrainingMatrix })));

// ── Compliances pages (lazy) ──────────────────────────────────────────────
import { CompliancesLayout } from './layouts/CompliancesLayout';
const FssaiLog       = lazy(() => import('./modules/compliances/FssaiLog').then(m => ({ default: m.FssaiLog })));
const Capa           = lazy(() => import('./modules/compliances/Capa').then(m => ({ default: m.Capa })));
const AuditSchedules = lazy(() => import('./modules/compliances/AuditSchedules').then(m => ({ default: m.AuditSchedules })));
const Complaints     = lazy(() => import('./modules/compliances/Complaints').then(m => ({ default: m.Complaints })));

// ── RND pages (lazy) ──────────────────────────────────────────────────────────
import { RndLayout } from './layouts/RndLayout';
const RndDashboard       = lazy(() => import('./modules/rnd/RndDashboard').then(m => ({ default: m.RndDashboard })));
const FormulationManager = lazy(() => import('./modules/rnd/FormulationManager').then(m => ({ default: m.FormulationManager })));
const FormulaBuilder     = lazy(() => import('./modules/rnd/FormulaBuilder').then(m => ({ default: m.FormulaBuilder })));
const IngredientIntel    = lazy(() => import('./modules/rnd/IngredientIntel').then(m => ({ default: m.IngredientIntel })));
const TrialManager       = lazy(() => import('./modules/rnd/TrialManager').then(m => ({ default: m.TrialManager })));
const ProductValidation  = lazy(() => import('./modules/rnd/ProductValidation').then(m => ({ default: m.ProductValidation })));
const RndSettings        = lazy(() => import('./modules/rnd/RndSettings').then(m => ({ default: m.RndSettings })));
const ProcessBuilder     = lazy(() => import('./modules/rnd/ProcessBuilder').then(m => ({ default: m.ProcessBuilder })));
const LabNotebook        = lazy(() => import('./modules/rnd/LabNotebook').then(m => ({ default: m.LabNotebook })));

// ── Inventory pages (lazy) ──────────────────────────────────────────────────────────
import { InventoryLayout } from './layouts/InventoryLayout';
const InwardGrn    = lazy(() => import('./modules/inventory/InwardGrn').then(m => ({ default: m.InwardGrn })));
const Store        = lazy(() => import('./modules/inventory/Store').then(m => ({ default: m.Store })));
const Traceability = lazy(() => import('./modules/inventory/Traceability').then(m => ({ default: m.Traceability })));
const MasterData   = lazy(() => import('./modules/inventory/MasterData').then(m => ({ default: m.MasterData })));

// ── Admin Dashboards ─────────────────────────────────────────────────────────
const BossDashboard    = lazy(() => import('./modules/admin/BossDashboard').then(m => ({ default: m.BossDashboard })));
const ManagerDashboard = lazy(() => import('./modules/admin/ManagerDashboard').then(m => ({ default: m.ManagerDashboard })));

// ── Operator Quick Entry (lazy) ───────────────────────────────────────────────
const BarcodeScanner = lazy(() => import('./pages/operator/BarcodeScanner').then(m => ({ default: m.BarcodeScanner })));
const OperatorTask   = lazy(() => import('./pages/operator/OperatorTask').then(m => ({ default: m.OperatorTask })));

// ── Public pages (lazy — not bundled with ERP user sessions) ───
const HomePage      = lazy(() => import('./pages/HomePage').then(m => ({ default: m.HomePage })));
const ProductsPage  = lazy(() => import('./pages/ProductsPage').then(m => ({ default: m.ProductsPage })));
const ProductDetail = lazy(() => import('./pages/ProductDetail').then(m => ({ default: m.ProductDetail })));
const AboutPage     = lazy(() => import('./pages/AboutPage').then(m => ({ default: m.AboutPage })));
const ContactPage   = lazy(() => import('./pages/ContactPage').then(m => ({ default: m.ContactPage })));
const BlogPage      = lazy(() => import('./pages/BlogPage').then(m => ({ default: m.BlogPage })));
const BlogPostPage  = lazy(() => import('./pages/BlogPostPage').then(m => ({ default: m.BlogPostPage })));
const NotFoundPage  = lazy(() => import('./pages/NotFoundPage').then(m => ({ default: m.NotFoundPage })));

// ── Auth ────────────────────────────────────────────────────────
import { LoginPage } from './modules/auth/LoginPage';
import { UnauthorizedPage } from './modules/auth/UnauthorizedPage';
import { RequireAuth } from './components/RequireAuth';

// ── Admin pages (lazy — never bundled with public site) ───────
// Content
import { CmsLayout }       from './layouts/CmsLayout';
import { CmsDashboard }    from './modules/cms/CmsDashboard';
import { AdminDashboard }  from './modules/admin/AdminDashboard';
import { AdminUsers, AdminRoles, AdminPermissions, AdminSettings, AdminAudit, AdminHealth, AdminBackups } from './modules/admin/AdminSystem';
const CmsProducts     = lazy(() => import('./modules/cms/CmsProducts').then(m => ({ default: m.CmsProducts })));
const CmsProductForm  = lazy(() => import('./modules/cms/CmsProductForm').then(m => ({ default: m.CmsProductForm })));
const CmsCategories   = lazy(() => import('./modules/cms/CmsPages').then(m => ({ default: m.CmsCategories })));
const CmsBlog         = lazy(() => import('./modules/cms/CmsPages').then(m => ({ default: m.CmsBlog })));
const CmsBlogForm     = lazy(() => import('./modules/cms/CmsPages').then(m => ({ default: m.CmsBlogForm })));
const CmsHomepage     = lazy(() => import('./modules/cms/CmsPages').then(m => ({ default: m.CmsHomepage })));
const CmsAbout        = lazy(() => import('./modules/cms/CmsPages').then(m => ({ default: m.CmsAbout })));
const CmsTestimonials = lazy(() => import('./modules/cms/CmsPages').then(m => ({ default: m.CmsTestimonials })));
const CmsMediaLibrary = lazy(() => import('./modules/cms/CmsPages').then(m => ({ default: m.CmsMediaLibrary })));
// Operations
const CmsInquiries    = lazy(() => import('./modules/cms/CmsPages').then(m => ({ default: m.CmsInquiries })));
const CmsSEO          = lazy(() => import('./modules/cms/CmsPages').then(m => ({ default: m.CmsSEO })));
const CmsAnalytics    = lazy(() => import('./modules/cms/CmsPages').then(m => ({ default: m.CmsAnalytics })));
const CmsSettings     = lazy(() => import('./modules/cms/CmsPages').then(m => ({ default: m.AdminSettings })));

// ── Loading fallback ──────────────────────────────────────────
function AdminLoader() {
  return (
    <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{
          width: 32, height: 32,
          border: '2px solid rgba(234,179,8,0.15)',
          borderTopColor: '#EAB308',
          borderRadius: '50%',
          animation: 'spin 0.75s linear infinite',
          margin: '0 auto 10px',
        }} />
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 11, color: 'rgba(255,255,255,0.2)' }}>Loading…</p>
      </div>
    </div>
  );
}

// ── Route guard ───────────────────────────────────────────────
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { loading, isAuthed } = useAuth();

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#071526' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ width: 40, height: 40, border: '2px solid rgba(234,179,8,0.2)', borderTopColor: '#EAB308', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 12px' }} />
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 13, color: 'rgba(255,255,255,0.28)' }}>Verifying session…</p>
      </div>
    </div>
  );

  if (!isAuthed) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

type CmsRole = 'EDITOR' | 'OPERATOR' | 'QC' | 'MANAGER' | 'ADMIN';

function RoleRoute({ minRole, children }: { minRole: CmsRole; children: React.ReactNode }) {
  const { loading, isAuthed, canAccess } = useAuth();
  if (loading) return <AdminLoader />;
  if (!isAuthed) return <Navigate to="/login" replace />;
  if (!canAccess(minRole)) return <Navigate to="/unauthorized" replace />;
  return <>{children}</>;
}

function S({ children }: { children: React.ReactNode }) {
  return <Suspense fallback={<AdminLoader />}>{children}</Suspense>;
}

// ── App ───────────────────────────────────────────────────────
export function App() {
  assertRuntimeConfig();
  warnOptionalConfig();

  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/"               element={<HomePage />} />
        <Route path="/products"       element={<ProductsPage />} />
        <Route path="/products/:slug" element={<ProductDetail />} />
        <Route path="/about"          element={<AboutPage />} />
        <Route path="/contact"        element={<ContactPage />} />
        <Route path="/blog"           element={<BlogPage />} />
        <Route path="/blog/:slug"     element={<BlogPostPage />} />
        <Route path="*"               element={<NotFoundPage />} />
      </Route>

      <Route path="/login"         element={<LoginPage />} />
      <Route path="/unauthorized"  element={<UnauthorizedPage />} />

      {/* ── Legacy redirects ── */}
      <Route path="/admin/login"          element={<Navigate to="/login" replace />} />
      <Route path="/bos/*"                element={<Navigate to="/admin/manager" replace />} />
      <Route path="/inventry"             element={<Navigate to="/inventory" replace />} />
      <Route path="/compliences"          element={<Navigate to="/compliances" replace />} />
      <Route path="/Production"           element={<Navigate to="/production" replace />} />
      <Route path="/QC"                   element={<Navigate to="/qc" replace />} />
      <Route path="/admin/content/products" element={<Navigate to="/cms/products" replace />} />
      <Route path="/admin/content/*"      element={<Navigate to="/cms" replace />} />

      <Route path="/admin" element={<ProtectedRoute><AdminLayout /></ProtectedRoute>}>
        <Route index element={<S><AdminDashboard /></S>} />
        <Route path="boss"        element={<RoleRoute minRole="ADMIN"><S><BossDashboard /></S></RoleRoute>} />
        <Route path="manager"     element={<RoleRoute minRole="MANAGER"><S><ManagerDashboard /></S></RoleRoute>} />
        <Route path="users"       element={<RoleRoute minRole="ADMIN"><S><AdminUsers /></S></RoleRoute>} />
        <Route path="roles"       element={<RoleRoute minRole="ADMIN"><S><AdminRoles /></S></RoleRoute>} />
        <Route path="permissions" element={<RoleRoute minRole="ADMIN"><S><AdminRoles /></S></RoleRoute>} />
        <Route path="audit"       element={<RoleRoute minRole="ADMIN"><S><AdminAudit /></S></RoleRoute>} />
        <Route path="settings"    element={<RoleRoute minRole="ADMIN"><S><AdminSettings /></S></RoleRoute>} />
        <Route path="health"      element={<RoleRoute minRole="ADMIN"><S><AdminHealth /></S></RoleRoute>} />
        <Route path="backups"     element={<RoleRoute minRole="ADMIN"><S><AdminBackups /></S></RoleRoute>} />
        <Route path="system/activity" element={<RoleRoute minRole="ADMIN"><S><AdminAudit /></S></RoleRoute>} />
        <Route path="system/users"    element={<RoleRoute minRole="ADMIN"><S><AdminUsers /></S></RoleRoute>} />
        <Route path="activity"        element={<Navigate to="/admin/audit" replace />} />
      </Route>

      <Route path="/cms" element={<ProtectedRoute><RoleRoute minRole="EDITOR"><CmsLayout /></RoleRoute></ProtectedRoute>}>
        <Route index element={<S><CmsDashboard /></S>} />
        <Route path="products"         element={<S><CmsProducts /></S>} />
        <Route path="products/new"     element={<S><CmsProductForm /></S>} />
        <Route path="products/:id"     element={<S><CmsProductForm /></S>} />
        <Route path="categories"       element={<S><CmsCategories /></S>} />
        <Route path="blog"             element={<S><CmsBlog /></S>} />
        <Route path="blog/new"         element={<S><CmsBlogForm /></S>} />
        <Route path="blog/:id"         element={<S><CmsBlogForm /></S>} />
        <Route path="homepage"         element={<S><CmsHomepage /></S>} />
        <Route path="about"            element={<S><CmsAbout /></S>} />
        <Route path="testimonials"     element={<S><CmsTestimonials /></S>} />
        <Route path="media"            element={<S><CmsMediaLibrary /></S>} />
        <Route path="inquiries"        element={<RoleRoute minRole="MANAGER"><S><CmsInquiries /></S></RoleRoute>} />
        <Route path="seo"              element={<RoleRoute minRole="MANAGER"><S><CmsSEO /></S></RoleRoute>} />
        <Route path="analytics"        element={<RoleRoute minRole="MANAGER"><S><CmsAnalytics /></S></RoleRoute>} />
        <Route path="settings"         element={<RoleRoute minRole="MANAGER"><S><CmsSettings /></S></RoleRoute>} />
        <Route path="users"        element={<RoleRoute minRole="ADMIN"><S><AdminUsers /></S></RoleRoute>} />
      </Route>

      <Route path="/inventory" element={
        <RoleRoute minRole="OPERATOR">
          <InventoryLayout />
        </RoleRoute>
      }>
        <Route index               element={<Navigate to="store" replace />} />
        <Route path="store"        element={<S><Store /></S>} />
        <Route path="inward"       element={<S><InwardGrn /></S>} />
        <Route path="traceability" element={<S><Traceability /></S>} />
        <Route path="master-data"  element={<S><MasterData /></S>} />
      </Route>

      <Route path="/production" element={
        <RoleRoute minRole="OPERATOR">
          <ProductionLayout />
        </RoleRoute>
      }>
        <Route index             element={<S><Batches /></S>} />
        <Route path="packaging"    element={<S><PackagingHouse /></S>} />
        <Route path="monitor"      element={<S><FloorMonitor /></S>} />
        <Route path="recipes"      element={<S><RecipeEngine /></S>} />
        <Route path="work-centers" element={<S><WorkCenters /></S>} />
        <Route path="equipment"    element={<S><Equipment /></S>} />
        <Route path="daily-logs"   element={<S><DailyLogs /></S>} />
      </Route>

      <Route path="/qc" element={
        <RoleRoute minRole="QC">
          <QcLayout />
        </RoleRoute>
      }>
        <Route index            element={<S><BatchQc /></S>} />
        <Route path="inward"    element={<S><GrnQc /></S>} />
      </Route>

      <Route path="/dms" element={
        <RoleRoute minRole="MANAGER">
          <DmsLayout />
        </RoleRoute>
      }>
        <Route index           element={<S><DmsDashboard /></S>} />
        <Route path="records"  element={<S><DmsRecords /></S>} />
        <Route path="create"   element={<S><DmsCreate /></S>} />
        <Route path="new"      element={<S><DmsCreate /></S>} />
        <Route path="templates" element={<S><DmsTemplates /></S>} />
        <Route path="verify"   element={<S><DmsVerify /></S>} />
        <Route path="settings" element={<S><DmsSettings /></S>} />
      </Route>

      <Route path="/accounts" element={
        <RoleRoute minRole="MANAGER">
          <AccountsLayout />
        </RoleRoute>
      }>
        <Route index            element={<S><AccountsDashboard /></S>} />
        <Route path="dispatch"  element={<S><DispatchLog /></S>} />
        <Route path="invoices"  element={<S><Invoices /></S>} />
        <Route path="expenses"  element={<S><Expenses /></S>} />
        <Route path="costing"   element={<S><CostingDashboard /></S>} />
      </Route>

      <Route path="/logistics" element={
        <RoleRoute minRole="OPERATOR">
          <LogisticsLayout />
        </RoleRoute>
      }>
        <Route index             element={<S><SalesReturns /></S>} />
        <Route path="dispatch"    element={<S><DispatchOrders /></S>} />
        <Route path="fg-store"    element={<S><FgStore /></S>} />
        <Route path="rm-store"    element={<S><RmStore /></S>} />
        <Route path="general-store" element={<S><GeneralStore /></S>} />
        <Route path="storage"    element={<S><StorageLocations /></S>} />
      </Route>

      <Route path="/fsms" element={
        <RoleRoute minRole="QC">
          <FsmsLayout />
        </RoleRoute>
      }>
        <Route index            element={<S><HaccpLog /></S>} />
        <Route path="prp"       element={<S><PrpLog /></S>} />
        <Route path="allergen"  element={<S><AllergenControl /></S>} />
        <Route path="recall"    element={<S><RecallLog /></S>} />
        <Route path="sop"       element={<S><SopRegister /></S>} />
        <Route path="training"  element={<S><TrainingMatrix /></S>} />
      </Route>

      <Route path="/compliances" element={
        <RoleRoute minRole="QC">
          <CompliancesLayout />
        </RoleRoute>
      }>
        <Route index            element={<S><FssaiLog /></S>} />
        <Route path="capa"      element={<S><Capa /></S>} />
        <Route path="audits"    element={<S><AuditSchedules /></S>} />
        <Route path="complaints" element={<S><Complaints /></S>} />
      </Route>

      <Route path="/rnd" element={
        <RoleRoute minRole="MANAGER">
          <RndLayout />
        </RoleRoute>
      }>
        <Route index            element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard" element={<S><RndDashboard /></S>} />
        <Route path="formulations"     element={<S><FormulationManager /></S>} />
        <Route path="formulations/:id" element={<S><FormulaBuilder /></S>} />
        <Route path="ingredients"      element={<S><IngredientIntel /></S>} />
        <Route path="trials"           element={<S><TrialManager /></S>} />
        <Route path="validation"       element={<S><ProductValidation /></S>} />
        <Route path="processes"        element={<S><ProcessBuilder /></S>} />
        <Route path="settings"         element={<S><RndSettings /></S>} />
        <Route path="notebook"         element={<S><LabNotebook /></S>} />
      </Route>

      <Route path="/operator">
        <Route index            element={<Navigate to="scanner" replace />} />
        <Route path="scanner"   element={<RoleRoute minRole="OPERATOR"><S><BarcodeScanner /></S></RoleRoute>} />
        <Route path="task"      element={<RoleRoute minRole="OPERATOR"><S><OperatorTask /></S></RoleRoute>} />
      </Route>

    </Routes>
  );
}
