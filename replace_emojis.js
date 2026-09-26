const fs = require('fs');
let text = fs.readFileSync('public/app.js', 'utf8');

// Use precise match replacements instead of global regex for emojis to be safe
text = text.replace(/<div class="room-hud-notes-indicator" title="\$\{habitacionVisual\.notas\}">.*?<\/div>/, '<div class="room-hud-notes-indicator" title=""></div>');

text = text.replace(/<div class="room-hud-date-indicator" title="Check-in: \$\{habitacionVisual\.fechaEntrada\} \| Check-out: \$\{habitacionVisual\.fechaSalida\}">.*? \$\{checkIn\} .*? \$\{checkOut\}<\/div>/, '<div class="room-hud-date-indicator" title="Check-in:  | Check-out: ">  - </div>');

fs.writeFileSync('public/app.js', text);
