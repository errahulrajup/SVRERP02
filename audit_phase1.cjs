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

const inventory = {
    Pages: [],
    Components: [],
    Routes: [],
    Layouts: [],
    Services: [],
    Hooks: [],
    Stores: [],
    Utilities: [],
    APICalls: 0,
    SupabaseCalls: 0,
    SQLFiles: [],
    MigrationFiles: [],
    Triggers: 0,
    Functions: 0,
    Policies: 0,
    StorageBuckets: 0
};

allFiles.forEach(file => {
    const relativePath = path.relative(ROOT, file);
    if (relativePath.includes('pages\\')) inventory.Pages.push(relativePath);
    else if (relativePath.includes('components\\')) inventory.Components.push(relativePath);
    else if (relativePath.includes('layouts\\')) inventory.Layouts.push(relativePath);
    else if (relativePath.includes('services\\')) inventory.Services.push(relativePath);
    else if (relativePath.includes('hooks\\')) inventory.Hooks.push(relativePath);
    else if (relativePath.includes('store') || relativePath.includes('stores')) inventory.Stores.push(relativePath);
    else if (relativePath.includes('utils\\') || relativePath.includes('utilities\\')) inventory.Utilities.push(relativePath);
    
    if (relativePath.endsWith('.sql')) {
        inventory.SQLFiles.push(relativePath);
        if (relativePath.includes('migrations')) inventory.MigrationFiles.push(relativePath);
    }
});

let report = `# PROJECT STRUCTURE REPORT\n\n`;
report += `## Summary\n`;
report += `- Total Pages: ${inventory.Pages.length}\n`;
report += `- Total Components: ${inventory.Components.length}\n`;
report += `- Total Layouts: ${inventory.Layouts.length}\n`;
report += `- Total Services: ${inventory.Services.length}\n`;
report += `- Total Hooks: ${inventory.Hooks.length}\n`;
report += `- Total Stores: ${inventory.Stores.length}\n`;
report += `- Total Utilities: ${inventory.Utilities.length}\n`;
report += `- Total SQL Files: ${inventory.SQLFiles.length}\n`;
report += `- Total Migration Files: ${inventory.MigrationFiles.length}\n\n`;

report += `## Pages\n${inventory.Pages.map(p => '- ' + p).join('\n')}\n\n`;
report += `## Components\n${inventory.Components.map(p => '- ' + p).join('\n')}\n\n`;
report += `## SQL Files\n${inventory.SQLFiles.map(p => '- ' + p).join('\n')}\n\n`;

fs.writeFileSync(path.join(ROOT, 'PROJECT_STRUCTURE_REPORT.md'), report);
console.log('Generated PROJECT_STRUCTURE_REPORT.md');
