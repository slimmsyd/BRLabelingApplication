import * as fs from 'fs';

const csvFilePath = '/Users/sydneysanders/Desktop/Code_Projects/LabelingApp/Events_1_12_1_16 - events-this-week-jan-12-17-2026-01-17T13-49-13-581Z.csv.csv';

try {
  const fileContent = fs.readFileSync(csvFilePath, 'utf-8');
  // Handle potentially different line endings
  const lines = fileContent.split(/\r?\n/);
  
  if (lines.length === 0) {
      console.log('File is empty');
      process.exit(0);
  }

  // Parse header to find column indices
  // Assuming simple CSV (no commas in headers for now, or just basic split)
  const headerLine = lines[0];
  const headers = headerLine.split(',');
  
  const originalEmailIndex = headers.indexOf('originalLabelerEmail');
  const labeledByEmailIndex = headers.indexOf('labeledByEmail');
  
  if (originalEmailIndex === -1) {
      console.error('Could not find originalLabelerEmail column');
      process.exit(1);
  }

  let missingOriginalLabelerCount = 0;
  let missingButHasLabeledByCount = 0;
  let missingButHasDanCount = 0;
  let totalDataRows = 0;

  // Start from index 1 to skip header
  for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      
      // Simple CSV parser that respects quotes
      const row: string[] = [];
      let inQuote = false;
      let currentField = '';
      
      for (let j = 0; j < line.length; j++) {
          const char = line[j];
          if (char === '"') {
              inQuote = !inQuote;
          } else if (char === ',' && !inQuote) {
              row.push(currentField);
              currentField = '';
          } else {
              currentField += char;
          }
      }
      row.push(currentField); // Push the last field

      totalDataRows++;

      // Check if row has enough columns (it might be short if trailing empty cols are omitted? usually not in valid CSV)
      // Actually if last col is empty, row.length should still match header length if properly formatted
      
      let originalEmail = '';
      if (row.length > originalEmailIndex) {
          originalEmail = row[originalEmailIndex];
      }
      
      // Remove quotes if present
      originalEmail = originalEmail.replace(/^"|"$/g, '').trim();

      if (!originalEmail) {
          missingOriginalLabelerCount++;
          
          let labeledByEmail = '';
          if (labeledByEmailIndex !== -1 && row.length > labeledByEmailIndex) {
              labeledByEmail = row[labeledByEmailIndex];
          }
           labeledByEmail = labeledByEmail.replace(/^"|"$/g, '').trim();

          if (labeledByEmail) {
              missingButHasLabeledByCount++;
              if (labeledByEmail.toLowerCase().includes('dan')) {
                  missingButHasDanCount++;
              }
          }
      }
  }

  console.log(`Total data rows: ${totalDataRows}`);
  console.log(` Rows missing originalLabelerEmail: ${missingOriginalLabelerCount}`);
  console.log(` Rows missing originalLabelerEmail but have labeledByEmail: ${missingButHasLabeledByCount}`);
  console.log(` Rows missing originalLabelerEmail where labeledByEmail is 'dan': ${missingButHasDanCount}`);

} catch (error) {
  console.error('Error reading or parsing CSV:', error);
}
