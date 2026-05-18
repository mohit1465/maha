const fs = require('fs');
const path = require('path');

const dir = 'c:/Users/My/Desktop/maha';
const files = fs.readdirSync(dir).filter(f => f.endsWith('.html') && f !== 'index.html');

files.forEach(file => {
    const filePath = path.join(dir, file);
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Find the announcement bar block
    const barRegex = /(<div class="announcement-bar"[^>]*>[\s\S]*?<\/div>)/;
    const match = content.match(barRegex);
    
    if (match) {
        const barHtml = match[1];
        
        // Check if it's already before the body tag
        const currentPos = content.indexOf(barHtml);
        const bodyPos = content.indexOf('<body');
        
        if (currentPos > bodyPos) {
            // Remove the bar from its current position
            content = content.replace(barRegex, '');
            
            // Insert it just before the body tag
            const newBodyPos = content.indexOf('<body');
            content = content.substring(0, newBodyPos) + barHtml + '\n' + content.substring(newBodyPos);
            
            fs.writeFileSync(filePath, content, 'utf8');
            console.log(`Updated ${file}`);
        }
    }
});
