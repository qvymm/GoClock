const fs = require('fs');
const path = require('path');

const screensWithNav = ['DashboardScreen', 'CalendarScreen', 'NutritionScreen', 'SleepScreen', 'ProfileScreen'];

function processDir(dir) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        if (!file.endsWith('.tsx')) continue;
        const fullPath = path.join(dir, file);
        let content = fs.readFileSync(fullPath, 'utf8');
        
        const regex = /(<div[^>]*className="[^"]*w-full h-full[^"]*)(")/;
        const match = content.match(regex);
        if (match) {
            let newClasses = ' safe-pt';
            const screenName = file.replace('.tsx', '');
            if (!screensWithNav.includes(screenName)) {
                newClasses += ' safe-pb';
            }
            
            if (!content.includes('safe-pt')) {
                content = content.replace(regex, `$1${newClasses}$2`);
                fs.writeFileSync(fullPath, content);
                console.log(`Updated ${file}`);
            }
        } else {
            console.log(`No match in ${file}`);
        }
    }
}
processDir(path.join(process.cwd(), 'src/screens'));
console.log('Done');
