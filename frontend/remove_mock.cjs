const fs = require('fs');
const path = require('path');
function processDir(dir) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
            processDir(fullPath);
        } else if (fullPath.endsWith('.tsx')) {
            let content = fs.readFileSync(fullPath, 'utf8');
            content = content.replace(/.*<div className="dynamic-island".*\n?/g, '');
            content = content.replace(/.*<div className="home-indicator".*\n?/g, '');
            content = content.replace(/.*<div className="status-bar[\s\S]*?<\/div>.*\n?/g, '');
            fs.writeFileSync(fullPath, content);
        }
    }
}
processDir(path.join(process.cwd(), 'src'));
console.log('Done');
