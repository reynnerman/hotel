const fs = require('fs');
const text = fs.readFileSync('public/app.js', 'utf8');

const target1Start = text.indexOf('// Renderizar las habitaciones en el plano de planta');
const target1End = text.indexOf('function abrirModalHabitacion');

const target2Start = text.indexOf('async function cargarHabitacionesPiso(piso)');
const target2End = text.indexOf('async function eliminarPiso(piso)');

console.log(target1Start, target1End, target2Start, target2End);
