const fs = require('fs');
let text = fs.readFileSync('public/app.js', 'utf8');
text = text.replace('ccionada = habitacion;', 'function abrirModalHabitacion(habitacion) {\n  habitacionSeleccionada = habitacion;');
fs.writeFileSync('public/app.js', text);
