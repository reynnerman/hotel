const fs = require('fs');
let text = fs.readFileSync('public/js/app.js', 'utf8');

text = text.replace('el.className = `room-draggable status-${h.estado}`;', 'el.className = `room-draggable settings-room-chip status-${h.estado}`;');
text = text.replace('el.className = `room-draggable status-${h.estado}`;', 'el.className = `room-draggable settings-room-chip status-${h.estado}`;'); // just in case

fs.writeFileSync('public/js/app.js', text);
