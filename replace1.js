const fs = require('fs');
const content = fs.readFileSync('public/app.js', 'utf8');

const regex = /\/\/ Renderizar las habitaciones en el plano de planta \(Norte y Sur wings\)[\s\S]*?\}\n/g;

const newContent = content.replace(regex, function() {
    return // Renderizar las habitaciones en el plano de planta (Libre)
function renderizarMapaHabitaciones() {
  const mapCanvas = document.getElementById('reception-map-canvas');
  if (!mapCanvas) return;
  mapCanvas.innerHTML = '';

  const habitacionesPiso = datosHabitaciones.filter(h => h.piso === pisoActual);

  habitacionesPiso.forEach(habitacion => {
    let habVisual = { ...habitacion };

    if (filtroFechas) {
      if (habitacion.estado === 'OCUPADA' && habitacion.fechaEntrada && habitacion.fechaSalida) {
        const fIn = new Date(filtroFechas.in);
        const fOut = new Date(filtroFechas.out);
        const hIn = new Date(habitacion.fechaEntrada);
        const hOut = new Date(habitacion.fechaSalida);
        
        if (hIn < fOut && hOut > fIn) {
          habVisual.estado = 'OCUPADA';
        } else {
          habVisual.estado = 'DISPONIBLE';
          habVisual.fechaEntrada = null;
          habVisual.fechaSalida = null;
        }
      }
    }

    const card = crearTarjetaHabitacion(habVisual, habitacion);
    card.classList.add('room-absolute');
    
    card.style.left = (habVisual.pos_x || 0) + 'px';
    card.style.top = (habVisual.pos_y || 0) + 'px';
    
    mapCanvas.appendChild(card);
  });
}
;
});

fs.writeFileSync('public/app.js', newContent);
