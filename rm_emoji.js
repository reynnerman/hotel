const fs = require('fs');
let text = fs.readFileSync('public/app.js', 'utf8');

text = text.replace(/📝/g, '');
text = text.replace(/📅/g, '');
text = text.replace(/🏨/g, '');
text = text.replace(/🚪/g, '');
text = text.replace(/❓/g, '');
text = text.replace(/👑/g, '');
text = text.replace(/🔑/g, '');
text = text.replace(/🗑️/g, '');
text = text.replace(/🗑/g, '');
text = text.replace(/✏️/g, '');
text = text.replace(/💰/g, '');

fs.writeFileSync('public/app.js', text);
