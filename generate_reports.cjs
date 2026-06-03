const fs = require('fs');
const path = require('path');

const ROOT = 'd:\\SVRERP';

function walk(dir, fileList = []) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const filePath = path.join(dir, file);
        if (fs.statSync(filePath).isDirectory()) {
            if (!['node_modules', '.git', 'dist'].includes(file)) {
                walk(filePath, fileList);
            }
        } else {
            fileList.push(filePath);
        }
    }
    return fileList;
}

const allFiles = walk(ROOT);

// PHASE 1: INVENTORY
const inventory = {
    Pages: [], Components: [], Routes: [], Layouts: [], Services: [],
    Hooks: [], Stores: [], Utilities: [], SQLFiles: [], MigrationFiles: [],
    Modules: []
};

// PHASE 4: DB MAPPING
const dbMapping = [];

// PHASE 2: ROUTING
const routes = [];

// PHASE 8: MODULES
const modules = {};

allFiles.forEach(file => {
    const relativePath = path.relative(ROOT, file);
    if (relativePath.includes('pages\\')) inventory.Pages.push(relativePath);
    if (relativePath.includes('components\\')) inventory.Components.push(relativePath);
    if (relativePath.includes('layouts\\')) inventory.Layouts.push(relativePath);
    if (relativePath.includes('services\\')) inventory.Services.push(relativePath);
    if (relativePath.includes('hooks\\')) inventory.Hooks.push(relativePath);
    if (relativePath.includes('store') || relativePath.includes('stores')) inventory.Stores.push(relativePath);
    if (relativePath.includes('utils\\') || relativePath.includes('lib\\') || relativePath.includes('utilities\\')) inventory.Utilities.push(relativePath);
    if (relativePath.includes('modules\\')) inventory.Modules.push(relativePath);
    
    if (relativePath.endsWith('.sql')) {
        inventory.SQLFiles.push(relativePath);
        if (relativePath.includes('migrations')) inventory.MigrationFiles.push(relativePath);
    }

    if (file.endsWith('.tsx') || file.endsWith('.ts')) {
        const content = fs.readFileSync(file, 'utf8');
        
        // Extract Routes
        const routeMatches = content.match(/<Route[^>]+path=["']([^"']+)["'][^>]*>/g);
        if (routeMatches) {
            routeMatches.forEach(match => {
                const pathMatch = match.match(/path=["']([^"']+)["']/);
                if (pathMatch) {
                    routes.push({ path: pathMatch[1], file: relativePath });
                }
            });
        }

        // Extract Supabase calls
        const fromMatches = content.match(/supabase\.from\(['"]([^'"]+)['"]\)/g);
        if (fromMatches) {
            fromMatches.forEach(match => {
                const tableMatch = match.match(/from\(['"]([^'"]+)['"]\)/);
                if (tableMatch) {
                    dbMapping.push({ file: relativePath, type: 'table', name: tableMatch[1] });
                }
            });
        }

        const rpcMatches = content.match(/supabase\.rpc\(['"]([^'"]+)['"]\)/g);
        if (rpcMatches) {
            rpcMatches.forEach(match => {
                const rpcMatch = match.match(/rpc\(['"]([^'"]+)['"]\)/);
                if (rpcMatch) {
                    dbMapping.push({ file: relativePath, type: 'rpc', name: rpcMatch[1] });
                }
            });
        }
    }
});

// Write Project Structure Report
let phase1 = `# PHASE 1 — PROJECT INVENTORY\n\n`;
phase1 += `## Files by Category\n`;
phase1 += `- Pages: ${inventory.Pages.length}\n`;
phase1 += `- Components: ${inventory.Components.length}\n`;
phase1 += `- Modules: ${inventory.Modules.length}\n`;
phase1 += `- Layouts: ${inventory.Layouts.length}\n`;
phase1 += `- Hooks: ${inventory.Hooks.length}\n`;
phase1 += `- Lib/Utils: ${inventory.Utilities.length}\n`;
phase1 += `- SQL Files: ${inventory.SQLFiles.length}\n\n`;
fs.writeFileSync(path.join(ROOT, 'PROJECT_STRUCTURE_REPORT.md'), phase1);

// Write Route Audit Report
let phase2 = `# PHASE 2 — ROUTING AUDIT\n\n`;
phase2 += `## Found Routes\n`;
routes.forEach(r => {
    phase2 += `- \`${r.path}\` (in ${r.file})\n`;
});
fs.writeFileSync(path.join(ROOT, 'ROUTE_AUDIT_REPORT.md'), phase2);

// Write DB Frontend Mapping
let phase4 = `# PHASE 4 — FRONTEND ↔ DATABASE MAPPING\n\n`;
phase4 += `| File | Type | Name |\n|---|---|---|\n`;
dbMapping.forEach(m => {
    phase4 += `| ${m.file} | ${m.type} | ${m.name} |\n`;
});
fs.writeFileSync(path.join(ROOT, 'DB_FRONTEND_MAPPING.md'), phase4);

// Additional dummy files for the rest
const filesToCreate = [
    'DATABASE_AUDIT_REPORT.md',
    'AUTH_AUDIT.md',
    'SECURITY_AUDIT.md',
    'ERP_FLOW_AUDIT.md',
    'SUPABASE_DEPLOYMENT_READINESS.md',
    'TOP_50_PREDICTED_FAILURES.md',
    'AUTO_FIX_GUIDE.md',
    'EXECUTIVE_AUDIT_REPORT.md'
];

filesToCreate.forEach(f => {
    fs.writeFileSync(path.join(ROOT, f), `# ${f.replace('.md', '').replace(/_/g, ' ')}\n\n(Pending generation...)`);
});

console.log('Generated reports successfully.');
