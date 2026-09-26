const fs = require('fs');
let text = fs.readFileSync('public/app.js', 'utf8');

const rep2 = `let isDraggingRoom = false;

function setupDraggableRoom(el, habitacion) {
  let isDragging = false;
  let startX, startY, initialX, initialY;

  el.addEventListener('mousedown', (e) => {
    if (e.target.tagName.toLowerCase() === 'button') return;
    
    isDragging = true;
    isDraggingRoom = true;
    startX = e.clientX;
    startY = e.clientY;
    initialX = parseInt(el.style.left || 0, 10) || 0;
    initialY = parseInt(el.style.top || 0, 10) || 0;
    el.style.zIndex = '1000';
  });

  document.addEventListener('mousemove', (e) => {
    if (!isDragging) return;
    const dx = e.clientX - startX;
    const dy = e.clientY - startY;
    el.style.left = (initialX + dx) + 'px';
    el.style.top = (initialY + dy) + 'px';
  });

  document.addEventListener('mouseup', async (e) => {
    if (!isDragging) return;
    isDragging = false;
    setTimeout(() => { isDraggingRoom = false; }, 100);
    el.style.zIndex = '5';
    
    const newX = parseInt(el.style.left, 10) || 0;
    const newY = parseInt(el.style.top, 10) || 0;
    
    try {
      await fetch(\`/api/habitaciones/\${habitacion.id}/posicion\`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': \`Bearer \${token}\`
        },
        body: JSON.stringify({ pos_x: newX, pos_y: newY })
      });
      const habIndex = datosHabitaciones.findIndex(h => h.id === habitacion.id);
      if (habIndex > -1) {
        datosHabitaciones[habIndex].pos_x = newX;
        datosHabitaciones[habIndex].pos_y = newY;
      }
    } catch (err) {
      console.error('Error guardando posición', err);
    }
  });
}

async function cargarHabitacionesPiso(piso) {
  pisoSeleccionadoAjustes = piso;
  document.querySelectorAll('.settings-floor-card').forEach(c => {
    c.classList.toggle('active', parseInt(c.dataset.piso) === piso);
  });

  const title = document.getElementById('ajustes-hab-panel-title');
  const count = document.getElementById('ajustes-hab-count');
  const canvas = document.getElementById('ajustes-rooms-canvas');
  const addRoomPanel = document.getElementById('settings-create-room-panel');

  if (title) title.textContent = \`PISO \${piso} — HABITACIONES\`;
  if (canvas) canvas.innerHTML = \`<div class="settings-loading">Cargando...</div>\`;

  try {
    const res = await fetch(\`/api/pisos/\${piso}/habitaciones\`, {
      headers: { 'Authorization': \`Bearer \${token}\` }
    });
    if (!res.ok) throw new Error();
    const habitaciones = await res.json();

    if (count) count.textContent = \`\${habitaciones.length} habitaci\${habitaciones.length !== 1 ? 'ones' : 'ón'}\`;

    const puedeEliminar = usuarioLogueado.permisos && usuarioLogueado.permisos.includes('GESTIONAR_HABITACIONES');

    if (habitaciones.length === 0) {
      if (canvas) canvas.innerHTML = \`<div class="settings-empty-state"><span class="settings-empty-icon">??</span><p>Este piso no tiene habitaciones.</p></div>\`;
    } else {
      if (canvas) canvas.innerHTML = '';
      habitaciones.forEach(h => {
        const el = document.createElement('div');
        el.className = \`room-draggable status-\${h.estado}\`;
        el.style.left = (h.pos_x || 0) + 'px';
        el.style.top = (h.pos_y || 0) + 'px';
        
        el.innerHTML = \`
          \${h.numero}
          \${puedeEliminar ? \`
            <button onclick="eliminarHabitacion('\${h.id}', \${piso})" title="Eliminar" style="position:absolute; top:-8px; right:-8px; background:var(--color-danger); color:white; border-radius:50%; width:20px; height:20px; display:flex; align-items:center; justify-content:center; border:none; cursor:pointer;">×</button>
          \` : ''}
        \`;
        if (canvas) canvas.appendChild(el);
        if (puedeEliminar) {
          setupDraggableRoom(el, h);
        }
      });
    }

    if (addRoomPanel && puedeEliminar) addRoomPanel.style.display = 'block';

  } catch (error) {
    if (canvas) canvas.innerHTML = \`<div class="settings-empty-state"><p>Error al cargar habitaciones.</p></div>\`;
  }
}

async function eliminarHabitacion`;

const i3 = text.indexOf('async function cargarHabitacionesPiso(piso)');
const i4 = text.indexOf('async function eliminarHabitacion');
if (i3 !== -1 && i4 !== -1) {
    text = text.substring(0, i3) + rep2 + text.substring(i4 + 33);
    console.log('REPLACED 2');
} else {
    console.log(i3, i4);
}

fs.writeFileSync('public/app.js', text);

