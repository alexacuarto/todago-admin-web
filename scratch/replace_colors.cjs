const fs = require('fs');
const path = require('path');

function walkDir(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    let dirPath = path.join(dir, f);
    let isDirectory = fs.statSync(dirPath).isDirectory();
    if (isDirectory) {
      walkDir(dirPath, callback);
    } else {
      callback(dirPath);
    }
  });
}

const srcDir = path.join(__dirname, '..', 'src');

walkDir(srcDir, (filePath) => {
  const ext = path.extname(filePath);
  if (['.ts', '.tsx', '.css', '.html'].includes(ext)) {
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Replace hex codes
    let replaced = content
      .replace(/091b6f/gi, '000C7D')
      .replace(/0b1b6e/gi, '000C7D');
      
    if (replaced !== content) {
      fs.writeFileSync(filePath, replaced, 'utf8');
      console.log(`Updated colors in: ${filePath}`);
    }
  }
});
