import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function analyze() {
  const sqlPath = path.join(__dirname, '..', 'supabase', 'MASTER_DB_RESET.sql');
  const sql = fs.readFileSync(sqlPath, 'utf8');

  // Map of table_name -> { column_name -> type }
  // We'll normalize table names as schema.table or just table (defaulting to public)
  const schema = {};

  // Track foreign key checks: array of { fromTable, fromCol, toTable, toCol, line }
  const fkeys = [];

  // Very simple SQL parser
  const lines = sql.split('\n');
  let currentTable = null;
  let inCreateTable = false;

  for (let i = 0; i < lines.length; i++) {
    let line = lines[i].trim();
    
    // Skip comments and empty lines
    if (line.startsWith('--') || !line) continue;

    // Detect CREATE TABLE
    const createTableMatch = line.match(/create\s+table\s+(?:if\s+not\s+exists\s+)?([\w\.]+)\s*\(/i);
    if (createTableMatch) {
      let tName = createTableMatch[1].toLowerCase();
      if (!tName.includes('.')) tName = 'public.' + tName;
      currentTable = tName;
      schema[currentTable] = {};
      inCreateTable = true;
      continue;
    }

    // Detect end of CREATE TABLE
    if (inCreateTable && line.startsWith(');')) {
      inCreateTable = false;
      currentTable = null;
      continue;
    }

    // Parse columns in CREATE TABLE
    if (inCreateTable && currentTable) {
      // Clean up constraints and trailing comma
      let cleanLine = line.replace(/,$/, '').trim();
      
      // Look for references
      const refMatch = cleanLine.match(/(\w+)\s+([\w\(\),]+)(?:\s+.*)?\s+references\s+([\w\.]+)\((\w+)\)/i);
      if (refMatch) {
        const colName = refMatch[1].toLowerCase();
        const type = refMatch[2].toLowerCase();
        let refTable = refMatch[3].toLowerCase();
        if (!refTable.includes('.')) refTable = 'public.' + refTable;
        const refCol = refMatch[4].toLowerCase();

        schema[currentTable][colName] = type;
        fkeys.push({
          fromTable: currentTable,
          fromCol: colName,
          toTable: refTable,
          toCol: refCol,
          line: i + 1,
          raw: line
        });
        continue;
      }

      // Plain column match (name and type)
      const colMatch = cleanLine.match(/^(\w+)\s+([\w\(\),]+)/i);
      if (colMatch) {
        const colName = colMatch[1].toLowerCase();
        const type = colMatch[2].toLowerCase();
        // Avoid matching SQL keywords like PRIMARY, CONSTRAINT, check, unique
        if (!['primary', 'constraint', 'unique', 'check', 'foreign', 'key', 'references'].includes(colName)) {
          schema[currentTable][colName] = type;
        }
      }
    }

    // Detect ALTER TABLE ADD COLUMN
    const alterAddMatch = line.match(/alter\s+table\s+(?:if\s+exists\s+)?([\w\.]+)\s+add\s+column\s+(?:if\s+not\s+exists\s+)?(\w+)\s+([\w\(\),]+)(?:\s+.*)?\s+references\s+([\w\.]+)\((\w+)\)/i);
    if (alterAddMatch) {
      let tName = alterAddMatch[1].toLowerCase();
      if (!tName.includes('.')) tName = 'public.' + tName;
      const colName = alterAddMatch[2].toLowerCase();
      const type = alterAddMatch[3].toLowerCase();
      let refTable = alterAddMatch[4].toLowerCase();
      if (!refTable.includes('.')) refTable = 'public.' + refTable;
      const refCol = alterAddMatch[5].toLowerCase();

      if (!schema[tName]) schema[tName] = {};
      schema[tName][colName] = type;

      fkeys.push({
        fromTable: tName,
        fromCol: colName,
        toTable: refTable,
        toCol: refCol,
        line: i + 1,
        raw: line
      });
      continue;
    }

    // Plain ALTER TABLE ADD COLUMN (without references)
    const alterPlainMatch = line.match(/alter\s+table\s+(?:if\s+exists\s+)?([\w\.]+)\s+add\s+column\s+(?:if\s+not\s+exists\s+)?(\w+)\s+([\w\(\),]+)/i);
    if (alterPlainMatch) {
      let tName = alterPlainMatch[1].toLowerCase();
      if (!tName.includes('.')) tName = 'public.' + tName;
      const colName = alterPlainMatch[2].toLowerCase();
      const type = alterPlainMatch[3].toLowerCase();

      if (!schema[tName]) schema[tName] = {};
      schema[tName][colName] = type;
    }

    // Detect inline foreign key declarations in ALTER TABLE
    const alterConstraintMatch = line.match(/alter\s+table\s+(?:if\s+exists\s+)?([\w\.]+)\s+add\s+constraint\s+\w+\s+foreign\s+key\s*\(([^)]+)\)\s+references\s+([\w\.]+)\s*\(([^)]+)\)/i);
    if (alterConstraintMatch) {
      let tName = alterConstraintMatch[1].toLowerCase();
      if (!tName.includes('.')) tName = 'public.' + tName;
      const colName = alterConstraintMatch[2].trim().toLowerCase();
      let refTable = alterConstraintMatch[3].toLowerCase();
      if (!refTable.includes('.')) refTable = 'public.' + refTable;
      const refCol = alterConstraintMatch[4].trim().toLowerCase();

      fkeys.push({
        fromTable: tName,
        fromCol: colName,
        toTable: refTable,
        toCol: refCol,
        line: i + 1,
        raw: line
      });
    }
  }

  // Perform checks
  console.log(`Analyzing ${fkeys.length} foreign key constraints...`);
  let errors = 0;

  for (const fk of fkeys) {
    const fromType = (schema[fk.fromTable] && schema[fk.fromTable][fk.fromCol]) || null;
    const toType = (schema[fk.toTable] && schema[fk.toTable][fk.toCol]) || null;

    if (!fromType) {
      console.warn(`[WARN] Line ${fk.line}: Referencing column ${fk.fromTable}.${fk.fromCol} type is unknown in parsed schema.`);
      continue;
    }
    if (!toType) {
      // Special check: auth.users(id) is always uuid in Supabase
      if (fk.toTable === 'auth.users' && fk.toCol === 'id') {
        if (fromType !== 'uuid') {
          console.error(`[ERROR] Line ${fk.line}: Type mismatch! ${fk.fromTable}.${fk.fromCol} is '${fromType}' but references auth.users.id (uuid).`);
          errors++;
        }
        continue;
      }
      console.warn(`[WARN] Line ${fk.line}: Referenced column ${fk.toTable}.${fk.toCol} type is unknown in parsed schema.`);
      continue;
    }

    // Normalize types to detect mismatches
    const normFrom = fromType.replace(/\(\d+\)/g, '').replace(/default.*/g, '').trim();
    const normTo = toType.replace(/\(\d+\)/g, '').replace(/default.*/g, '').trim();

    if (normFrom !== normTo) {
      // Special compatibility check: e.g. text/varchar are compatible, serial/integer etc.
      const textTypes = ['text', 'character', 'varchar', 'char'];
      const isBothText = textTypes.some(t => normFrom.includes(t)) && textTypes.some(t => normTo.includes(t));
      
      const intTypes = ['integer', 'int', 'serial', 'bigint', 'bigserial'];
      const isBothInt = intTypes.some(t => normFrom.includes(t)) && intTypes.some(t => normTo.includes(t));

      if (!isBothText && !isBothInt) {
        console.error(`[ERROR] Line ${fk.line}: Type mismatch! ${fk.fromTable}.${fk.fromCol} is '${fromType}' but references ${fk.toTable}.${fk.toCol} which is '${toType}'.`);
        errors++;
      }
    }
  }

  if (errors === 0) {
    console.log('✅ SUCCESS: All parsed foreign keys are 100% type-compatible!');
  } else {
    console.error(`❌ FAILED: Found ${errors} type mismatch errors.`);
    process.exit(1);
  }
}

analyze();
