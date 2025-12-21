#!/usr/bin/env node

/**
 * Production Console.log Removal Script
 * Removes all console.log statements from production builds
 * Preserves console.error and console.warn in development
 */

const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, '../src');
const excludePatterns = [
  /console\.(error|warn)/,  // Keep error and warning logs
  /\/\/ KEEP:/,             // Keep lines marked with // KEEP:
  /\/\* KEEP:/              // Keep lines marked with /* KEEP:
];

function shouldKeepLog(line) {
  return excludePatterns.some(pattern => pattern.test(line));
}

function removeConsoleLogs(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');
  
  let modified = false;
  const cleanedLines = lines.map(line => {
    // Remove console.log, console.debug, console.info, console.trace
    if (line.includes('console.') && !shouldKeepLog(line)) {
      const consoleRegex = /\s*console\.(log|debug|info|trace)\([^;]*\);?\s*/g;
      const cleaned = line.replace(consoleRegex, '');
      
      if (cleaned !== line) {
        modified = true;
        // If line becomes empty or only whitespace, return empty string
        return cleaned.trim() === '' ? '' : cleaned;
      }
    }
    return line;
  });
  
  if (modified) {
    // Remove excessive empty lines (more than 2 consecutive)
    const finalContent = cleanedLines
      .join('\n')
      .replace(/\n\s*\n\s*\n/g, '\n\n');
      
    fs.writeFileSync(filePath, finalContent);
    return true;
  }
  
  return false;
}

function processDirectory(dirPath) {
  const files = fs.readdirSync(dirPath);
  let totalModified = 0;
  
  for (const file of files) {
    const filePath = path.join(dirPath, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory()) {
      totalModified += processDirectory(filePath);
    } else if (file.endsWith('.ts') || file.endsWith('.tsx')) {
      if (removeConsoleLogs(filePath)) {
        console.log(`✅ Cleaned: ${path.relative(srcDir, filePath)}`);
        totalModified++;
      }
    }
  }
  
  return totalModified;
}

console.log('🧹 Removing console.log statements for production build...');
console.log('📁 Scanning:', srcDir);

const modifiedCount = processDirectory(srcDir);

console.log(`✨ Production cleanup complete!`);
console.log(`📊 Modified ${modifiedCount} files`);
console.log(`🛡️  Preserved console.error and console.warn statements`);

if (modifiedCount > 0) {
  console.log(`\n💡 To restore console.logs for development:`);
  console.log(`   git checkout HEAD -- src/`);
}