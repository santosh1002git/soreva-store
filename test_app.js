const fs = require('fs');
const js = fs.readFileSync('app.js', 'utf-8');
try {
    new Function(js);
    console.log("Syntax is fully valid.");
} catch(e) {
    console.log("SYNTAX ERROR:", e);
}
