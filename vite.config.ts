import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': '/src'
    }
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // Core vendor (always loaded)
          vendor:      ['react', 'react-dom', 'react-router'],
          supabase:    ['@supabase/supabase-js'],
          motion:      ['framer-motion'],

          // Public website pages (never needed by ERP-only users)
          'chunk-public': [
            './src/app/pages/HomePage',
            './src/app/pages/ProductsPage',
            './src/app/pages/ProductDetail',
            './src/app/pages/AboutPage',
            './src/app/pages/ContactPage',
            './src/app/pages/BlogPage',
            './src/app/pages/BlogPostPage',
          ],

          // ERP module chunks (only loaded when that module is visited)
          'chunk-production':   [
            './src/app/modules/production/Batches',
            './src/app/modules/production/PackagingHouse',
            './src/app/modules/production/RecipeEngine',
            './src/app/modules/production/FloorMonitor',
            './src/app/modules/production/Equipment',
            './src/app/modules/production/WorkCenters',
            './src/app/modules/production/DailyLogs',
          ],
          'chunk-rnd': [
            './src/app/modules/rnd/FormulationManager',
            './src/app/modules/rnd/FormulaBuilder',
            './src/app/modules/rnd/IngredientIntel',
            './src/app/modules/rnd/TrialManager',
            './src/app/modules/rnd/LabNotebook',
          ],
          'chunk-fsms': [
            './src/app/modules/fsms/HaccpLog',
            './src/app/modules/fsms/PrpLog',
            './src/app/modules/fsms/AllergenControl',
            './src/app/modules/fsms/RecallLog',
            './src/app/modules/fsms/SopRegister',
            './src/app/modules/fsms/TrainingMatrix',
          ],
          'chunk-dms': [
            './src/app/modules/dms/DmsCreate',
            './src/app/modules/dms/DmsRecords',
            './src/app/modules/dms/DmsTemplates',
          ],
          'chunk-accounts': [
            './src/app/modules/accounts/AccountsDashboard',
            './src/app/modules/accounts/Invoices',
            './src/app/modules/accounts/Expenses',
            './src/app/modules/accounts/CostingDashboard',
          ],
        },
      },
    },
  },
});
