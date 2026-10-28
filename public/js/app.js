// =============================================
// VERIFICAR AUTENTICACIÓN — PRIMERO QUE TODO
// =============================================
if (!localStorage.getItem('hotel_token')) {
  window.location.replace('/login.html');
  throw new Error('Sin sesión activa. Redirigiendo al login.');
}
const token = localStorage.getItem('hotel_token');
const usuarioLogueado = JSON.parse(localStorage.getItem('hotel_user') || '{}');

// ===== GESTIÓN DEL TEMA (OSCURO / CLARO) =====
const themeToggleBtn = document.getElementById('theme-toggle-btn');
const themeIcon = document.getElementById('theme-icon');
const themeLabel = document.getElementById('theme-label');

// Cargar tema guardado (localStorage) o usar CLARO por defecto
let currentTheme = localStorage.getItem('hotelTheme') || 'light';
document.body.setAttribute('data-theme', currentTheme);

function updateThemeButton(theme) {
  if (theme === 'dark') {
    if (themeIcon) themeIcon.textContent = '☀';
    if (themeLabel) themeLabel.textContent = 'MODO CLARO';
  } else {
    if (themeIcon) themeIcon.textContent = '☽';
    if (themeLabel) themeLabel.textContent = 'MODO OSCURO';
  }
}

updateThemeButton(currentTheme);

if (themeToggleBtn) {
  themeToggleBtn.addEventListener('click', () => {
    currentTheme = currentTheme === 'dark' ? 'light' : 'dark';
    document.body.setAttribute('data-theme', currentTheme);
    localStorage.setItem('hotelTheme', currentTheme);
    updateThemeButton(currentTheme);
  });
}
// =============================================

// Configurar botón de logout si existiera, o atado a la Info-Bar
function logout() {
  localStorage.removeItem('hotel_token');
  localStorage.removeItem('hotel_user');
  window.location.href = '/login.html';
}

// Estado local del cliente

let datosHabitaciones = [];
let pisoActual = 1;
let habitacionSeleccionada = null;

// Mapeos de estados para visualización
const traduccionesEstado = {
  "DISPONIBLE": "Disponible",
  "OCUPADA": "Ocupada",
  "LIMPIEZA": "En Limpieza",
  "MANTENIMIENTO": "Mantenimiento",
  "FUERA_DE_SERVICIO": "Fuera de Servicio"
};

const traduccionesEstadoCorto = {
  "DISPONIBLE": "DISP",
  "OCUPADA": "OCUP",
  "LIMPIEZA": "LIMP",
  "MANTENIMIENTO": "MANT",
  "FUERA_DE_SERVICIO": "F.S."
};

// Nombres elegantes de los pisos
const nombresPisos = {
  1: "Planta Baja",
  2: "Primer Piso",
  3: "Segundo Piso",
  4: "Tercer Piso",
  5: "Cuarto Piso"
};

// Elementos del DOM
const floorHeaderTitle = document.getElementById('floor-header-title');
const corridorLabel = document.querySelector('.corridor-label');
const northWing = document.getElementById('north-wing');
const southWing = document.getElementById('south-wing');
const floorSelectorList = document.getElementById('floor-selector-list');

// Stats DOM
const statAvailable = document.getElementById('hud-stat-available');
const statOccupied = document.getElementById('hud-stat-occupied');
const statDirty = document.getElementById('hud-stat-dirty');
const statMaintenance = document.getElementById('hud-stat-maintenance');
const statOutOfService = document.getElementById('hud-stat-out-of-service');

// Modal DOM
const roomModal = document.getElementById('room-modal');
const modalRoomTitle = document.getElementById('modal-room-title');
const modalRoomType = document.getElementById('modal-room-type');
const modalCurrentStatusText = document.getElementById('modal-current-status-text');
const modalCurrentStatusBanner = document.getElementById('modal-current-status-banner');
const statusForm = document.getElementById('status-form');
const roomNotes = document.getElementById('room-notes');
const closeModalBtn = document.getElementById('close-modal-btn');

// Modos Vista/Edición DOM
const modalViewMode = document.getElementById('modal-view-mode');
const modalEditMode = document.getElementById('modal-edit-mode');
const modalViewDetails = document.getElementById('modal-view-details');
const btnEditMode = document.getElementById('btn-edit-mode');
const btnCancelEdit = document.getElementById('btn-cancel-edit');

// Fecha y Huésped DOM
const dateRangeBlock = document.getElementById('date-range-block');
const roomCheckIn = document.getElementById('room-checkin');
const roomCheckOut = document.getElementById('room-checkout');
const dateDurationDisplay = document.getElementById('date-duration-display');
const roomClient = document.getElementById('room-client');
const roomPersons = document.getElementById('room-persons');
const roomCompanions = document.getElementById('room-companions');

// Usuarios DOM
const usersManageBtn = document.getElementById('users-manage-btn');
const usersModal = document.getElementById('users-modal');
const closeUsersModalBtn = document.getElementById('close-users-modal-btn');
const newUserForm = document.getElementById('new-user-form');
const usersTableBody = document.getElementById('users-table-body');

// Módulos DOM
const navItems = document.querySelectorAll('.nav-item');
const moduleRecepcion = document.getElementById('module-recepcion');
const moduleInventario = document.getElementById('module-inventario');
const moduleAjustes = document.getElementById('module-ajustes');
const modulePlaceholder = document.getElementById('module-placeholder');
const placeholderTitle = document.getElementById('placeholder-title');
const settingsActions = document.getElementById('settings-actions');

// Iniciar aplicación
document.addEventListener('DOMContentLoaded', () => {
  // Inicializar el título con el piso por defecto (Planta Baja)
  const initialName = nombresPisos[pisoActual] || `Piso ${pisoActual}`;
  floorHeaderTitle.textContent = initialName.toUpperCase();
  if (corridorLabel) corridorLabel.textContent = initialName;

  configurarNavegacionPrincipal();
  obtenerHabitaciones();
  obtenerClientesDirectorio();
  configurarListeners();
  configurarListenersInventario();
  configurarListenersNiveles();
});

// =============================================
// NAVEGACIÓN Y ROLES
// =============================================
function configurarNavegacionPrincipal() {
  const rol = usuarioLogueado.rol || '';
  
  // Definir accesos a módulos por rol (incluyendo Inventario para operaciones y gestión)
  const accesosPorRol = {
    'SUPERADMIN': ['recepcion', 'inventario', 'limpieza', 'mantenimiento', 'seguridad', 'administracion', 'contabilidad', 'marketing', 'gerencia', 'ajustes'],
    'GERENCIA': ['recepcion', 'inventario', 'limpieza', 'mantenimiento', 'seguridad', 'administracion', 'contabilidad', 'marketing', 'gerencia', 'ajustes'],
    'ADMINISTRADOR': ['recepcion', 'inventario', 'administracion', 'ajustes'],
    'CONTADOR': ['recepcion', 'inventario', 'contabilidad'],
    'RECEPCION': ['recepcion', 'inventario'],
    'MANTENIMIENTO': ['recepcion', 'inventario', 'mantenimiento'],
    'LIMPIEZA': ['recepcion', 'inventario', 'limpieza'],
    'SEGURIDAD': ['recepcion', 'inventario', 'seguridad'],
    'MARKETING': ['recepcion', 'marketing']
  };

  const modulosPermitidos = accesosPorRol[rol] || ['recepcion', 'inventario'];

  // Filtrar y mostrar solo los botones permitidos
  navItems.forEach(item => {
    const targetModule = item.dataset.module;
    if (modulosPermitidos.includes(targetModule)) {
      item.style.display = 'block';
    } else {
      item.style.display = 'none';
    }

    // Agregar evento click para cambiar de módulo
    item.addEventListener('click', () => cambiarModulo(item, targetModule));
  });
}

function cambiarModulo(btnElement, moduleName) {
  // Actualizar clases de los botones
  navItems.forEach(btn => btn.classList.remove('active'));
  btnElement.classList.add('active');

  // Ocultar todos los módulos
  moduleRecepcion.style.display = 'none';
  moduleRecepcion.classList.remove('active-module');
  if (moduleInventario) moduleInventario.style.display = 'none';
  if (moduleAjustes) moduleAjustes.style.display = 'none';
  modulePlaceholder.style.display = 'none';

  if (moduleName === 'recepcion') {
    moduleRecepcion.style.display = '';
    moduleRecepcion.classList.add('active-module');
  } else if (moduleName === 'inventario') {
    if (moduleInventario) {
      moduleInventario.style.display = 'flex';
      cargarModuloInventario();
    }
  } else if (moduleName === 'ajustes') {
    if (moduleAjustes) {
      moduleAjustes.style.display = 'flex';
      if (typeof closeSettingsDetail === 'function') closeSettingsDetail();
      cargarModuloAjustes();
    } else {
      modulePlaceholder.style.display = 'flex';
      placeholderTitle.textContent = 'MÓDULO: ' + btnElement.textContent;
    }
  } else {
    modulePlaceholder.style.display = 'flex';
    placeholderTitle.textContent = 'MÓDULO: ' + btnElement.textContent;
  }
}

// Obtener todas las habitaciones desde el backend Node.js
async function obtenerHabitaciones() {
  try {
    const response = await fetch('/api/habitaciones', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (response.status === 401 || response.status === 403) return logout();
    if (!response.ok) throw new Error('Error al obtener habitaciones.');
    datosHabitaciones = await response.json();
    construirSelectorPisos();
    actualizarPanel();
  } catch (error) {
    console.error('Error:', error);
    alert('No se pudo conectar con el servidor del hotel.');
  }
}

// Construye el selector lateral de pisos a partir de los pisos existentes en la BD
function construirSelectorPisos() {
  const pisos = [...new Set(datosHabitaciones.map(h => h.piso))].sort((a, b) => b - a);

  if (pisos.length === 0) {
    floorSelectorList.innerHTML = '';
    return;
  }
  if (!pisos.includes(pisoActual)) pisoActual = pisos[pisos.length - 1];

  floorSelectorList.innerHTML = pisos.map(p => {
    const etiqueta = p === 1 ? 'PB' : `${p - 1}°P`;
    return `<button class="floor-hud-btn ${p === pisoActual ? 'active' : ''}" data-floor="${p}">${etiqueta}</button>`;
  }).join('');

  const nombre = nombresPisos[pisoActual] || `Piso ${pisoActual}`;
  floorHeaderTitle.textContent = nombre.toUpperCase();
  if (corridorLabel) corridorLabel.textContent = nombre;
}

// Configurar// Configurar eventos
function configurarListeners() {
  iniciarPanZoomMapa();
  // Toggle Theme
  // themeToggleBtn.addEventListener('click', toggleTheme);

  // Selector de pisos
  floorSelectorList.addEventListener('click', (e) => {
    const btn = e.target.closest('.floor-hud-btn');
    if (!btn) return;
    
    document.querySelectorAll('.floor-hud-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    
    pisoActual = parseInt(btn.dataset.floor, 10);
    
    const floorName = nombresPisos[pisoActual] || `Piso ${pisoActual}`;
    floorHeaderTitle.textContent = floorName.toUpperCase();
    if (corridorLabel) corridorLabel.textContent = floorName;

    renderizarMapaHabitaciones();
  });

  // Modal Cerrar
  closeModalBtn.addEventListener('click', cerrarModal);

  // Formulario de edición
  statusForm.addEventListener('submit', manejarEnvioEstado);

  // Botón Modificar
  btnEditMode.addEventListener('click', () => {
    modalViewMode.style.display = 'none';
    modalEditMode.style.display = 'block';
  });

  // Botón Cancelar Modificación
  btnCancelEdit.addEventListener('click', () => {
    modalEditMode.style.display = 'none';
    modalViewMode.style.display = 'block';
    
    // Restaurar valores originales si canceló
    if (habitacionSeleccionada) {
      const radio = statusForm.querySelector(`input[name="roomStatus"][value="${habitacionSeleccionada.estado}"]`);
      if (radio) radio.checked = true;
      roomNotes.value = habitacionSeleccionada.notas || '';
      
      if (habitacionSeleccionada.estado === 'OCUPADA') {
        roomCheckIn.value = habitacionSeleccionada.fechaEntrada || '';
        roomCheckOut.value = habitacionSeleccionada.fechaSalida || '';
        roomClient.value = habitacionSeleccionada.clientePrincipal || '';
        roomPersons.value = habitacionSeleccionada.cantidadPersonas || 1;
        roomCompanions.value = habitacionSeleccionada.acompanantes || '';
        toggleDateBlock(true);
        updateDurationDisplay();
      } else {
        toggleDateBlock(false);
      }
    }
  });

  // Radio buttons cambio (para mostrar bloque de fechas si seleccionan ocupada)
  const radios = statusForm.querySelectorAll('input[name="roomStatus"]');
  radios.forEach(radio => {
    radio.addEventListener('change', (e) => {
      toggleDateBlock(e.target.value === 'OCUPADA');
    });
  });

  // Duración y tarifa dinámica en fechas y cliente
  roomCheckIn.addEventListener('change', updateDurationDisplay);
  roomCheckOut.addEventListener('change', updateDurationDisplay);
  if (roomClient) roomClient.addEventListener('input', updateDurationDisplay);

  // Gestión de Usuarios Modal (legacy - keep for backward compat)
  if (usersManageBtn) usersManageBtn.addEventListener('click', abrirModalUsuarios);
  if (closeUsersModalBtn) closeUsersModalBtn.addEventListener('click', () => { if(usersModal) usersModal.classList.remove('active'); });
  if (newUserForm) newUserForm.addEventListener('submit', manejarCreacionUsuario);

  // Módulo Ajustes - Tabs
  const settingsTabs = document.querySelectorAll('.settings-tab');
  settingsTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      settingsTabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      document.querySelectorAll('.settings-tab-content').forEach(c => c.classList.remove('active'));
      const tabContent = document.getElementById(`tab-${tab.dataset.tab}`);
      if (tabContent) tabContent.classList.add('active');
      if (tab.dataset.tab === 'usuarios') cargarUsuariosAjustes();
      if (tab.dataset.tab === 'permisos') cargarRolesYPermisos();
    });
  });

  // Módulo Ajustes - Crear Piso
  const formNuevoPiso = document.getElementById('form-nuevo-piso');
  if (formNuevoPiso) formNuevoPiso.addEventListener('submit', manejarCrearPiso);

  // Módulo Ajustes - Agregar Habitación
  const formNuevaHab = document.getElementById('form-nueva-habitacion');
  if (formNuevaHab) formNuevaHab.addEventListener('submit', manejarCrearHabitacion);

  // Módulo Ajustes - Recargar Usuarios
  const btnReloadUsers = document.getElementById('btn-reload-users');
  if (btnReloadUsers) btnReloadUsers.addEventListener('click', cargarUsuariosAjustes);

  // Módulo Ajustes - Crear Usuario
  const settingsNewUserForm = document.getElementById('settings-new-user-form');
  if (settingsNewUserForm) settingsNewUserForm.addEventListener('submit', manejarCrearUsuarioAjustes);

  // Modal - Cambiar Habitación
  const btnChangeRoom = document.getElementById('btn-change-room');
  const btnCancelChangeRoom = document.getElementById('btn-cancel-change-room');
  const btnConfirmChangeRoom = document.getElementById('btn-confirm-change-room');
  const changeRoomPanel = document.getElementById('modal-change-room-panel');

  if (btnChangeRoom) {
    btnChangeRoom.addEventListener('click', async () => {
      changeRoomPanel.style.display = 'block';
      // Poblar select con habitaciones disponibles
      const destSelect = document.getElementById('change-room-dest');
      destSelect.innerHTML = '<option value="">Cargando...</option>';
      try {
        const resp = await fetch('/api/habitaciones', { headers: { 'Authorization': `Bearer ${token}` } });
        const habs = await resp.json();
        const disponibles = habs.filter(h => h.id !== habitacionSeleccionada.id && (h.estado === 'DISPONIBLE' || h.estado === 'LIMPIEZA'));
        if (disponibles.length === 0) {
          destSelect.innerHTML = '<option value="">No hay habitaciones disponibles</option>';
        } else {
          destSelect.innerHTML = disponibles.map(h => `<option value="${h.id}">HAB ${h.numero} - Piso ${h.piso} (${h.tipo})</option>`).join('');
        }
      } catch(e) {
        destSelect.innerHTML = '<option value="">Error cargando</option>';
      }
    });
  }

  if (btnCancelChangeRoom) {
    btnCancelChangeRoom.addEventListener('click', () => {
      if (changeRoomPanel) changeRoomPanel.style.display = 'none';
    });
  }

  if (btnConfirmChangeRoom) {
    btnConfirmChangeRoom.addEventListener('click', async () => {
      const destId = document.getElementById('change-room-dest').value;
      const reason = document.getElementById('change-room-reason').value.trim();
      if (!destId) { mostrarToast('⚠️ Selecciona una habitación destino.', 'warning'); return; }
      if (!reason) { mostrarToast('⚠️ Ingresa el motivo del cambio.', 'warning'); return; }

      btnConfirmChangeRoom.disabled = true;
      btnConfirmChangeRoom.textContent = 'Procesando...';
      try {
        const res = await fetch(`/api/habitaciones/${habitacionSeleccionada.id}/cambiar`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
          body: JSON.stringify({ nuevaHabitacionId: destId, motivo: reason })
        });
        const data = await res.json();
        if (res.ok) {
          mostrarToast('✅ Cambio de habitación realizado.', 'success');
          cerrarModal();
          await obtenerHabitaciones();
        } else {
          mostrarToast(`❌ ${data.error}`, 'error');
        }
      } catch(e) {
        mostrarToast('❌ Error de conexión.', 'error');
      } finally {
        btnConfirmChangeRoom.disabled = false;
        btnConfirmChangeRoom.textContent = 'CONFIRMAR CAMBIO';
      }
    });
  }
}

// Actualizar todo el panel
function actualizarPanel() {
  calcularEstadisticas();
  renderizarMapaHabitaciones();
}

// Calcular y renderizar estadísticas globales (toda la base de datos)
function calcularEstadisticas() {
  const conteos = {
    DISPONIBLE: 0,
    OCUPADA: 0,
    LIMPIEZA: 0,
    MANTENIMIENTO: 0,
    FUERA_DE_SERVICIO: 0
  };

  datosHabitaciones.forEach(habitacion => {
    if (conteos[habitacion.estado] !== undefined) {
      conteos[habitacion.estado]++;
    }
  });

  statAvailable.textContent = conteos.DISPONIBLE;
  const statTotal = document.getElementById('stat-total');
  if (statTotal) statTotal.textContent = datosHabitaciones.length;
  statOccupied.textContent = conteos.OCUPADA;
  statDirty.textContent = conteos.LIMPIEZA;
  statMaintenance.textContent = conteos.MANTENIMIENTO;
  statOutOfService.textContent = conteos.FUERA_DE_SERVICIO;
}

// Mostrar u ocultar el bloque de fechas con animación
function toggleDateBlock(show) {
  if (show) {
    dateRangeBlock.classList.add('visible');
  } else {
    dateRangeBlock.classList.remove('visible');
    roomCheckIn.value = '';
    roomCheckOut.value = '';
    roomClient.value = '';
    roomPersons.value = 1;
    roomCompanions.value = '';
    dateDurationDisplay.textContent = '';
  }
}

// Calcular y mostrar la duración de la estancia (y precio estimado)
function updateDurationDisplay() {
  const checkIn = roomCheckIn.value;
  const checkOut = roomCheckOut.value;
  const priceDisplay = document.getElementById('room-price-display');
  if (checkIn && checkOut) {
    const start = new Date(checkIn);
    const end = new Date(checkOut);
    const diff = Math.round((end - start) / (1000 * 60 * 60 * 24));
    if (diff > 0) {
      dateDurationDisplay.textContent = `⏱ Estancia de ${diff} noche${diff !== 1 ? 's' : ''}`;
      dateDurationDisplay.className = 'date-duration-display valid';
      // Calculate price
      if (priceDisplay && habitacionSeleccionada) {
        const precio = habitacionSeleccionada.precioNoche || 50.0;
        const subtotal = precio * diff;

        const clienteNom = roomClient ? roomClient.value.trim() : '';
        const clienteVip = typeof buscarClienteVipPorNombre === 'function' ? buscarClienteVipPorNombre(clienteNom) : null;
        const descPct = clienteVip ? (parseFloat(clienteVip.nivel_descuento) || 0) : 0;
        const montoDesc = subtotal * (descPct / 100);
        const totalFinal = subtotal - montoDesc;

        if (descPct > 0) {
          priceDisplay.innerHTML = `
            <span style="color:var(--text-muted); font-size:11px;">$${precio.toFixed(2)} × ${diff} noches =</span>
            <span style="font-size:14px; text-decoration: line-through; color: var(--text-muted); margin-left:6px;">$${subtotal.toFixed(2)}</span>
            <span style="font-size:18px; margin-left:6px; color:#34d399; font-weight:700;">$${totalFinal.toFixed(2)} USD</span>
            <span class="vip-discount-tag" style="margin-left:6px; font-size:10px;">-${descPct}% ${escapeHtml(clienteVip.nivel_nombre)}</span>
          `;
        } else {
          priceDisplay.innerHTML = `
            <span style="color:var(--text-muted); font-size:11px;">$${precio.toFixed(2)} × ${diff} noches =</span>
            <span style="font-size:18px; margin-left:8px;">$${subtotal.toFixed(2)} USD</span>
          `;
        }
      }
    } else if (diff === 0) {
      dateDurationDisplay.textContent = '⚠️ Check-out debe ser posterior al check-in';
      dateDurationDisplay.className = 'date-duration-display warning';
      if (priceDisplay) priceDisplay.innerHTML = '';
    } else {
      dateDurationDisplay.textContent = '⚠️ Las fechas no son válidas';
      dateDurationDisplay.className = 'date-duration-display warning';
    }
  } else {
    dateDurationDisplay.textContent = '';
    const priceDisplay2 = document.getElementById('room-price-display');
    if (priceDisplay2) priceDisplay2.innerHTML = '';
  }
}

// Generar una tarjeta de habitación (HTML element)
function crearTarjetaHabitacion(habitacionVisual, habitacionOriginal) {
  const card = document.createElement('div');
  card.className = `room-hud-card status-${habitacionVisual.estado}`;
  card.setAttribute('data-id', habitacionVisual.id);
  
  // Indicador de nota
  const noteIndicator = habitacionVisual.notas ? `<div class="room-hud-notes-indicator" title=""></div>` : '';

  // Indicador de fechas (solo si está ocupada con fechas)
  let dateIndicator = '';
  if (habitacionVisual.estado === 'OCUPADA' && habitacionVisual.fechaEntrada && habitacionVisual.fechaSalida) {
    const checkIn = new Date(habitacionVisual.fechaEntrada + 'T00:00:00').toLocaleDateString('es-ES', { day: '2-digit', month: 'long' });
    const checkOut = new Date(habitacionVisual.fechaSalida + 'T00:00:00').toLocaleDateString('es-ES', { day: '2-digit', month: 'long' });
    dateIndicator = `<div class="room-hud-date-indicator" title="Check-in:  | Check-out: ">  - </div>`;
  }

  card.innerHTML = `
    ${noteIndicator}
    <div class="room-hud-num">${habitacionVisual.numero}</div>
    <div class="room-hud-details">
      <span class="room-hud-type">${habitacionVisual.tipo}</span>
      <span class="room-hud-status-badge">$${habitacionVisual.precioNoche || 50}</span>
    </div>
    ${dateIndicator}
  `;

  // Abrir modal con detalles del plano al hacer click. Siempre se pasa la original.
  card.addEventListener('click', () => abrirModalHabitacion(habitacionOriginal || habitacionVisual));

  return card;
}

// Renderizar las habitaciones en el plano de planta (Libre)
function renderizarMapaHabitaciones() {
  const mapCanvas = document.getElementById('reception-map-canvas');
  if (!mapCanvas) return;
  mapCanvas.innerHTML = '';
  const mundo = document.createElement('div');
  mundo.id = 'map-world';
  mapCanvas.appendChild(mundo);
  aplicarVistaMapa();

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
    
    mundo.appendChild(card);
  });
}

// ── Pan y zoom del plano ──────────────────────────────
const vistaMapa = { x: 0, y: 0, k: 1 };

function aplicarVistaMapa() {
  const mundo = document.getElementById('map-world');
  if (mundo) mundo.style.transform = `translate(${vistaMapa.x}px, ${vistaMapa.y}px) scale(${vistaMapa.k})`;
  const lbl = document.getElementById('map-zoom-label');
  if (lbl) lbl.textContent = Math.round(vistaMapa.k * 100) + '%';
}

function zoomMapa(factor, cx, cy) {
  const canvas = document.getElementById('reception-map-canvas');
  const rect = canvas.getBoundingClientRect();
  if (cx === undefined) { cx = rect.width / 2; cy = rect.height / 2; }
  const nk = Math.min(3, Math.max(0.3, vistaMapa.k * factor));
  const real = nk / vistaMapa.k;
  vistaMapa.x = cx - (cx - vistaMapa.x) * real;
  vistaMapa.y = cy - (cy - vistaMapa.y) * real;
  vistaMapa.k = nk;
  aplicarVistaMapa();
}

function iniciarPanZoomMapa() {
  const canvas = document.getElementById('reception-map-canvas');
  if (!canvas || canvas.dataset.panzoom) return;
  canvas.dataset.panzoom = '1';

  // Controles de zoom
  const ctrl = document.createElement('div');
  ctrl.className = 'map-zoom-controls';
  ctrl.innerHTML = `
    <button type="button" id="map-zoom-in" title="Acercar">+</button>
    <span id="map-zoom-label">100%</span>
    <button type="button" id="map-zoom-out" title="Alejar">−</button>
    <button type="button" id="map-zoom-reset" title="Restablecer vista">↺</button>`;
  canvas.parentElement.appendChild(ctrl);
  document.getElementById('map-zoom-in').onclick = () => zoomMapa(1.2);
  document.getElementById('map-zoom-out').onclick = () => zoomMapa(1 / 1.2);
  document.getElementById('map-zoom-reset').onclick = () => {
    vistaMapa.x = 0; vistaMapa.y = 0; vistaMapa.k = 1; aplicarVistaMapa();
  };

  // Arrastrar en zonas sin habitación
  let arrastrando = false, sx = 0, sy = 0, ox = 0, oy = 0;
  canvas.addEventListener('mousedown', (e) => {
    if (e.button !== 0 || e.target.closest('.room-hud-card')) return;
    arrastrando = true;
    sx = e.clientX; sy = e.clientY; ox = vistaMapa.x; oy = vistaMapa.y;
    canvas.classList.add('panning');
    e.preventDefault();
  });
  window.addEventListener('mousemove', (e) => {
    if (!arrastrando) return;
    vistaMapa.x = ox + (e.clientX - sx);
    vistaMapa.y = oy + (e.clientY - sy);
    aplicarVistaMapa();
  });
  window.addEventListener('mouseup', () => {
    arrastrando = false;
    canvas.classList.remove('panning');
  });

  // Zoom con la rueda, centrado en el cursor
  canvas.addEventListener('wheel', (e) => {
    e.preventDefault();
    const rect = canvas.getBoundingClientRect();
    zoomMapa(e.deltaY < 0 ? 1.1 : 1 / 1.1, e.clientX - rect.left, e.clientY - rect.top);
  }, { passive: false });
}

// Abrir Modal de Habitación (Símil Terminal de Diagnóstico)
function abrirModalHabitacion(habitacion) {
  habitacionSeleccionada = habitacion;
  modalRoomTitle.textContent = `HABITACIÓN ${habitacion.numero}`;
  modalRoomType.textContent = `CATEGORÍA: ${habitacion.tipo.toUpperCase()}`;
  
  // Banner de estado actual
  modalCurrentStatusText.textContent = traduccionesEstado[habitacion.estado];
  
  // Asignar color de borde izquierdo según estado
  let statusColor = 'var(--border-hud-active)';
  if (habitacion.estado === 'DISPONIBLE') statusColor = 'var(--color-available)';
  else if (habitacion.estado === 'OCUPADA') statusColor = 'var(--color-occupied)';
  else if (habitacion.estado === 'LIMPIEZA') statusColor = 'var(--color-dirty)';
  else if (habitacion.estado === 'MANTENIMIENTO') statusColor = 'var(--color-maintenance)';
  else if (habitacion.estado === 'FUERA_DE_SERVICIO') statusColor = 'var(--color-out-of-service)';
  
  modalCurrentStatusBanner.style.borderLeftColor = statusColor;

  // Seleccionar el radio button correspondiente
  const radio = statusForm.querySelector(`input[name="roomStatus"][value="${habitacion.estado}"]`);
  if (radio) radio.checked = true;

  // Rellenar notas
  roomNotes.value = habitacion.notas || '';

  // Manejar bloque de fechas y huéspedes
  if (habitacion.estado === 'OCUPADA') {
    roomCheckIn.value = habitacion.fechaEntrada || '';
    roomCheckOut.value = habitacion.fechaSalida || '';
    roomClient.value = habitacion.clientePrincipal || '';
    roomPersons.value = habitacion.cantidadPersonas || 1;
    roomCompanions.value = habitacion.acompanantes || '';
    // Payment fields
    const payMethod = document.getElementById('room-payment-method');
    const payDate = document.getElementById('room-payment-date');
    const payRef = document.getElementById('room-payment-ref');
    if (payMethod) payMethod.value = habitacion.metodoPago || '';
    if (payDate) payDate.value = habitacion.fechaPago || '';
    if (payRef) payRef.value = habitacion.comprobantePago || '';
    toggleDateBlock(true);
    updateDurationDisplay();
  } else {
    toggleDateBlock(false);
    const payMethod = document.getElementById('room-payment-method');
    const payDate = document.getElementById('room-payment-date');
    const payRef = document.getElementById('room-payment-ref');
    const priceDisplay = document.getElementById('room-price-display');
    if (payMethod) payMethod.value = '';
    if (payDate) payDate.value = '';
    if (payRef) payRef.value = '';
    if (priceDisplay) priceDisplay.innerHTML = '';
  }

  // Botón Cambiar Habitación (solo visible si está OCUPADA y tiene permiso)
  const btnChangeRoom = document.getElementById('btn-change-room');
  const changeRoomPanel = document.getElementById('modal-change-room-panel');
  if (btnChangeRoom) {
    const puedeEditar = usuarioLogueado.permisos && usuarioLogueado.permisos.includes('EDITAR_HABITACION');
    btnChangeRoom.style.display = (habitacion.estado === 'OCUPADA' && puedeEditar) ? 'block' : 'none';
  }
  if (changeRoomPanel) changeRoomPanel.style.display = 'none';

  // Llenar datos de vista
  let viewHTML = '';
  if (habitacion.estado === 'OCUPADA') {
    const clienteVip = typeof buscarClienteVipPorNombre === 'function' ? buscarClienteVipPorNombre(habitacion.clientePrincipal) : null;

    if (clienteVip && clienteVip.nivel_nombre) {
      const colorClase = (clienteVip.nivel_color || 'gold').toLowerCase();
      const descPct = parseFloat(clienteVip.nivel_descuento) || 0;
      viewHTML += `
        <div class="room-vip-banner">
          <div style="display: flex; align-items: center; gap: 8px;">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color: var(--text-gold);"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
            <span class="vip-pill-badge vip-pill-${colorClase}">${escapeHtml(clienteVip.nivel_nombre)}</span>
            ${descPct > 0 ? `<span class="vip-discount-tag">${descPct}% DESC. APLICADO</span>` : ''}
          </div>
          ${clienteVip.nivel_beneficios ? `<span style="font-size: 11px; color: var(--text-gold); font-weight: 500;" title="${escapeHtml(clienteVip.nivel_beneficios)}">Beneficios VIP Activos</span>` : ''}
        </div>
      `;
    }

    if (habitacion.clientePrincipal) {
      viewHTML += `
        <div class="view-data-row">
          <span class="view-data-icon">👤</span>
          <span class="view-data-text"><strong>Titular:</strong> ${escapeHtml(habitacion.clientePrincipal)} (${habitacion.cantidadPersonas} pers.)</span>
        </div>
      `;
    }
    if (habitacion.acompanantes) {
      viewHTML += `
        <div class="view-data-row">
          <span class="view-data-icon">👥</span>
          <span class="view-data-text"><strong>Acompañantes:</strong> ${escapeHtml(habitacion.acompanantes)}</span>
        </div>
      `;
    }
    if (habitacion.fechaEntrada && habitacion.fechaSalida) {
      const checkInStr = new Date(habitacion.fechaEntrada + 'T00:00:00').toLocaleDateString('es-ES', { day: '2-digit', month: 'long' });
      const checkOutStr = new Date(habitacion.fechaSalida + 'T00:00:00').toLocaleDateString('es-ES', { day: '2-digit', month: 'long' });
      const diffDays = Math.round((new Date(habitacion.fechaSalida) - new Date(habitacion.fechaEntrada)) / (1000 * 60 * 60 * 24));
      const precio = habitacion.precioNoche || 50.0;
      const subtotal = precio * diffDays;
      const descPct = clienteVip ? (parseFloat(clienteVip.nivel_descuento) || 0) : 0;
      const montoDesc = subtotal * (descPct / 100);
      const totalConDescuento = subtotal - montoDesc;

      let tarifaHtml = `<strong style="color:var(--text-gold);">$${subtotal.toFixed(2)} USD</strong>`;
      if (descPct > 0) {
        tarifaHtml = `
          <span style="text-decoration: line-through; color: var(--text-muted);">$${subtotal.toFixed(2)}</span>
          <strong style="color:#34d399; margin-left:4px;">$${totalConDescuento.toFixed(2)} USD</strong>
          <span style="font-size: 11px; color: var(--text-gold); margin-left: 4px;">(-${descPct}% ${escapeHtml(clienteVip.nivel_nombre)})</span>
        `;
      }

      viewHTML += `
        <div class="view-data-row">
          <span class="view-data-icon">📅</span>
          <span class="view-data-text"><strong>Ocupada:</strong> del ${checkInStr} al ${checkOutStr} (${diffDays} noche${diffDays !== 1 ? 's' : ''})</span>
        </div>
        <div class="view-data-row">
          <span class="view-data-icon">💰</span>
          <span class="view-data-text"><strong>Tarifa:</strong> $${precio.toFixed(2)}/noche &rarr; ${tarifaHtml}</span>
        </div>
      `;
    }
    if (habitacion.metodoPago) {
      viewHTML += `
        <div class="view-data-row">
          <span class="view-data-icon">💳</span>
          <span class="view-data-text"><strong>Pago:</strong> ${habitacion.metodoPago}${habitacion.comprobantePago ? ` (Ref: ${habitacion.comprobantePago})` : ''}</span>
        </div>
      `;
    }
  }
  
  if (habitacion.notas) {
    viewHTML += `
      <div class="view-data-row notes-row">
        <span class="view-data-icon">📝</span>
        <span class="view-data-text"><strong>Notas:</strong> ${habitacion.notas}</span>
      </div>
    `;
  } else {
    viewHTML += `
      <div class="view-data-row empty-notes">
        <span class="view-data-text">Sin observaciones registradas.</span>
      </div>
    `;
  }
  modalViewDetails.innerHTML = viewHTML;

  // Asegurar que abrimos en Modo Vista
  modalEditMode.style.display = 'none';
  modalViewMode.style.display = 'block';

  // Activar overlay
  roomModal.classList.add('active');
}

// =============================================
// GESTIÓN DE INFO BAR (FOOTER)
// =============================================
function actualizarBarraInfo() {
  const now = new Date();
  
  // Usuario Logueado
  const userEl = document.querySelector('.system-info-bar .info-item:first-child .info-text');
  if (userEl && usuarioLogueado.nombre) {
    userEl.innerHTML = `<strong>${usuarioLogueado.nombre.toUpperCase()} ${usuarioLogueado.apellido.toUpperCase()}</strong> | ${usuarioLogueado.rol}`;
    // Hacer clic en el usuario cierra sesión
    userEl.style.cursor = 'pointer';
    userEl.onclick = logout;
  }
  
  // Fecha: ej. "30 de junio de 2026"
  const dateOptions = { year: 'numeric', month: 'long', day: 'numeric' };
  const dateEl = document.getElementById('info-date');
  if (dateEl) dateEl.textContent = now.toLocaleDateString('es-ES', dateOptions).toUpperCase();
  
  // Hora: ej. "14:35:09"
  const timeOptions = { hour: '2-digit', minute: '2-digit', second: '2-digit' };
  const timeEl = document.getElementById('info-time');
  if (timeEl) timeEl.textContent = now.toLocaleTimeString('es-ES', timeOptions);
}

// Obtener Tasas BCV (USD y EUR) desde DolarApi.com
async function obtenerTasasBcv() {
  try {
    // USD
    const resUsd = await fetch('https://ve.dolarapi.com/v1/dolares/oficial');
    if (resUsd.ok) {
      const dataUsd = await resUsd.json();
      const rateUsdEl = document.getElementById('info-rate-usd');
      if (rateUsdEl && dataUsd.promedio) {
        rateUsdEl.textContent = `USD BCV: ${dataUsd.promedio.toFixed(2)} Bs`;
      }
    }

    // EUR
    const resEur = await fetch('https://ve.dolarapi.com/v1/euros/oficial');
    if (resEur.ok) {
      const dataEur = await resEur.json();
      const rateEurEl = document.getElementById('info-rate-eur');
      if (rateEurEl && dataEur.promedio) {
        rateEurEl.textContent = `EUR BCV: ${dataEur.promedio.toFixed(2)} Bs`;
      }
    }
  } catch (error) {
    console.error('No se pudieron obtener las tasas BCV:', error);
  }
}

// Iniciar reloj y datos
setInterval(actualizarBarraInfo, 1000);
actualizarBarraInfo();
obtenerTasasBcv();

// Cerrar Modal
function cerrarModal() {
  roomModal.classList.remove('active');
  habitacionSeleccionada = null;
}

// Enviar datos modificados al backend
async function manejarEnvioEstado(e) {
  e.preventDefault();
  if (!habitacionSeleccionada) return;

  const estadoSeleccionado = statusForm.querySelector('input[name="roomStatus"]:checked').value;
  const textoNotas = roomNotes.value.trim();

  // Incluir fechas y huéspedes solo si el estado es OCUPADA
  const valorEntrada = estadoSeleccionado === 'OCUPADA' ? (roomCheckIn.value || null) : null;
  const valorSalida = estadoSeleccionado === 'OCUPADA' ? (roomCheckOut.value || null) : null;
  const valorTitular = estadoSeleccionado === 'OCUPADA' ? (roomClient.value.trim() || null) : null;
  const valorPersonas = estadoSeleccionado === 'OCUPADA' ? parseInt(roomPersons.value, 10) : null;
  const valorAcompanantes = estadoSeleccionado === 'OCUPADA' ? (roomCompanions.value.trim() || null) : null;

  // Validar fechas si estado es OCUPADA
  if (estadoSeleccionado === 'OCUPADA' && valorEntrada && valorSalida) {
    const start = new Date(valorEntrada);
    const end = new Date(valorSalida);
    if (end <= start) {
      alert('La fecha de Check-Out debe ser posterior al Check-In.');
      return;
    }
  }

  try {
    const response = await fetch(`/api/habitaciones/${habitacionSeleccionada.id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        estado: estadoSeleccionado,
        notas: textoNotas,
        fechaEntrada: valorEntrada,
        fechaSalida: valorSalida,
        clientePrincipal: valorTitular,
        cantidadPersonas: valorPersonas,
        acompanantes: valorAcompanantes,
        metodoPago: estadoSeleccionado === 'OCUPADA' ? (document.getElementById('room-payment-method')?.value || null) : null,
        fechaPago: estadoSeleccionado === 'OCUPADA' ? (document.getElementById('room-payment-date')?.value || null) : null,
        comprobantePago: estadoSeleccionado === 'OCUPADA' ? (document.getElementById('room-payment-ref')?.value || null) : null
      })
    });

    if (!response.ok) throw new Error('Error al actualizar el estado en el servidor.');

    const data = await response.json();
    
    // Actualizar el estado local
    const index = datosHabitaciones.findIndex(r => r.id === habitacionSeleccionada.id);
    if (index !== -1) {
      datosHabitaciones[index] = data.habitacion;
    }

    // Refrescar UI
    actualizarPanel();
    cerrarModal();
  } catch (error) {
    console.error('Error:', error);
    alert('No se pudo guardar la información de la habitación.');
  }
}

// =============================================
// GESTIÓN DE USUARIOS
// =============================================
async function abrirModalUsuarios() {
  usersModal.classList.add('active');
  await cargarUsuarios();
}

async function cargarUsuarios() {
  try {
    const res = await fetch('/api/usuarios', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!res.ok) throw new Error();
    const usuarios = await res.json();
    
    usersTableBody.innerHTML = usuarios.map(u => `
      <tr style="border-bottom: 1px solid rgba(197, 168, 128, 0.2);">
        <td style="padding: 5px;">${u.cedula}</td>
        <td style="padding: 5px;">${u.usuario}</td>
        <td style="padding: 5px;">${u.nombre} ${u.apellido}</td>
        <td style="padding: 5px;">${u.rol}</td>
      </tr>
    `).join('');
  } catch (error) {
    console.error(error);
  }
}

async function manejarCreacionUsuario(e) {
  e.preventDefault();
  
  const payload = {
    cedula: document.getElementById('nu-cedula').value.trim(),
    usuario: document.getElementById('nu-usuario').value.trim(),
    nombre: document.getElementById('nu-nombre').value.trim(),
    apellido: document.getElementById('nu-apellido').value.trim(),
    password: document.getElementById('nu-password').value.trim(),
    rol_id: parseInt(document.getElementById('nu-rol').value, 10)
  };

  try {
    const res = await fetch('/api/usuarios', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(payload)
    });
    const data = await res.json();

    if (res.ok) {
      alert('Usuario creado exitosamente');
      newUserForm.reset();
      cargarUsuarios();
    } else {
      alert(data.error || 'Error al crear usuario');
    }
  } catch (error) {
    alert('Fallo de conexión al crear usuario');
  }
}

// =============================================
// MÓDULO AJUSTES - PISOS Y HABITACIONES
// =============================================

let pisoSeleccionadoAjustes = null;

async function cargarModuloAjustes() {
  try {
    const res = await fetch('/api/pisos', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!res.ok) throw new Error();
    const pisos = await res.json();
    renderizarPisosAjustes(pisos);
    // Reset room panel
    pisoSeleccionadoAjustes = null;
    const grid = document.getElementById('ajustes-rooms-grid');
    const emptyState = document.getElementById('ajustes-empty-state');
    const title = document.getElementById('ajustes-hab-panel-title');
    const count = document.getElementById('ajustes-hab-count');
    const addRoomPanel = document.getElementById('settings-create-room-panel');
    if (grid) grid.innerHTML = `<div class="settings-empty-state" id="ajustes-empty-state"><span class="settings-empty-icon">🏨</span><p>Haz clic en un piso para ver sus habitaciones.</p></div>`;
    if (title) title.textContent = 'SELECCIONA UN PISO';
    if (count) count.textContent = '';
    if (addRoomPanel) addRoomPanel.style.display = 'none';
  } catch (error) {
    console.error('Error al cargar módulo ajustes:', error);
  }
}

function renderizarPisosAjustes(pisos) {
  const list = document.getElementById('ajustes-floors-list');
  const totalEl = document.getElementById('ajustes-total-pisos');
  if (!list) return;

  if (totalEl) totalEl.textContent = `${pisos.length} piso${pisos.length !== 1 ? 's' : ''} registrado${pisos.length !== 1 ? 's' : ''}`;

  const nombresPisoAjustes = {
    1: 'Planta Baja', 2: 'Primer Piso', 3: 'Segundo Piso',
    4: 'Tercer Piso', 5: 'Cuarto Piso', 6: 'Quinto Piso',
    7: 'Sexto Piso', 8: 'Séptimo Piso', 9: 'Octavo Piso', 10: 'Noveno Piso'
  };

  if (pisos.length === 0) {
    list.innerHTML = `<div class="settings-empty-state"><span class="settings-empty-icon">🏗</span><p>No hay pisos registrados aún.</p></div>`;
    return;
  }

  list.innerHTML = pisos.map(piso => `
    <div class="settings-floor-card ${pisoSeleccionadoAjustes === piso ? 'active' : ''}" data-piso="${piso}">
      <div class="settings-floor-info" onclick="cargarHabitacionesPiso(${piso})">
        <span class="settings-floor-num">${piso}</span>
        <div>
          <div class="settings-floor-name">${nombresPisoAjustes[piso] || `Piso ${piso}`}</div>
          <div class="settings-floor-sub">Piso ${piso}</div>
        </div>
      </div>
      ${usuarioLogueado.permisos && usuarioLogueado.permisos.includes('GESTIONAR_HABITACIONES') ? `
        <button class="settings-floor-delete-btn" onclick="eliminarPiso(${piso})" title="Eliminar piso completo">🗑</button>
      ` : ''}
    </div>
  `).join('');
}

let isDraggingRoom = false;

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
      await fetch(`/api/habitaciones/${habitacion.id}/posicion`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
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

  if (title) title.textContent = `PISO ${piso} — HABITACIONES`;
  if (canvas) canvas.innerHTML = `<div class="settings-loading">Cargando...</div>`;

  try {
    const res = await fetch(`/api/pisos/${piso}/habitaciones`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!res.ok) throw new Error();
    const habitaciones = await res.json();

    if (count) count.textContent = `${habitaciones.length} habitaci${habitaciones.length !== 1 ? 'ones' : 'ón'}`;

    const puedeEliminar = usuarioLogueado.permisos && usuarioLogueado.permisos.includes('GESTIONAR_HABITACIONES');

    if (habitaciones.length === 0) {
      if (canvas) canvas.innerHTML = `<div class="settings-empty-state"><span class="settings-empty-icon"></span><p>Este piso no tiene habitaciones.</p></div>`;
    } else {
      if (canvas) canvas.innerHTML = '';
      habitaciones.forEach(h => {
        const el = document.createElement('div');
        el.className = `room-draggable settings-room-chip status-${h.estado}`;
        el.style.left = (h.pos_x || 0) + 'px';
        el.style.top = (h.pos_y || 0) + 'px';
        
        el.innerHTML = `
          ${h.numero}
          ${puedeEliminar ? `
            <button class="room-chip-action-btn btn-edit" onclick="editarHabitacionCompleta('${h.id}', '${h.numero}', '${h.tipo}', ${h.precioNoche || 50}, ${piso})" title="Editar">✎</button>
            <button class="room-chip-action-btn btn-delete" onclick="eliminarHabitacion('${h.id}', ${piso})" title="Eliminar">×</button>
          ` : ''}
        `;
        if (canvas) canvas.appendChild(el);
        if (puedeEliminar) {
          setupDraggableRoom(el, h);
        }
      });
    }

    if (addRoomPanel && puedeEliminar) addRoomPanel.style.display = 'block';

  } catch (error) {
    if (canvas) canvas.innerHTML = `<div class="settings-empty-state"><p>Error al cargar habitaciones.</p></div>`;
  }
}

async function eliminarPiso(piso) {
  if (!confirm(`¿Estás seguro de que deseas eliminar el PISO ${piso} y TODAS sus habitaciones? Esta acción no se puede deshacer.`)) return;

  try {
    const res = await fetch(`/api/pisos/${piso}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const data = await res.json();
    if (res.ok) {
      mostrarToast(`✅ Piso ${piso} eliminado correctamente.`, 'success');
      cargarModuloAjustes();
      // Recargar habitaciones del mapa principal también
      obtenerHabitaciones();
    } else {
      mostrarToast(`❌ ${data.error}`, 'error');
    }
  } catch (error) {
    mostrarToast('❌ Error de conexión.', 'error');
  }
}

async function editarHabitacionCompleta(id, numActual, tipoActual, precioActual, piso) {
  const nuevoNum = prompt(`Editar número de habitación (Actual: ${numActual}):`, numActual);
  if (!nuevoNum) return;
  const nuevoTipo = prompt(`Editar tipo (Sencilla, Doble, Suite) (Actual: ${tipoActual}):`, tipoActual);
  if (!nuevoTipo) return;
  const nuevoPrecio = prompt(`Editar precio por noche (USD) (Actual: ${precioActual}):`, precioActual);
  if (!nuevoPrecio) return;

  try {
    const res = await fetch(`/api/habitaciones/${id}/editar`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ numero: nuevoNum, tipo: nuevoTipo, precioNoche: parseFloat(nuevoPrecio) })
    });
    if (res.ok) {
      mostrarToast('✅ Habitación actualizada', 'success');
      cargarHabitacionesPiso(piso);
      obtenerPisos(); // Refrescar globales si es necesario
    } else {
      mostrarToast('❌ Error al actualizar', 'error');
    }
  } catch(e) {
    mostrarToast('❌ Error de conexión', 'error');
  }
}

async function eliminarHabitacion(id, piso) {
  if (!confirm(`¿Eliminar la habitación ${id}? Esta acción no se puede deshacer.`)) return;

  try {
    const res = await fetch(`/api/habitaciones/${id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const data = await res.json();
    if (res.ok) {
      mostrarToast(`✅ Habitación eliminada.`, 'success');
      cargarHabitacionesPiso(piso);
      obtenerHabitaciones();
    } else {
      mostrarToast(`❌ ${data.error}`, 'error');
    }
  } catch (error) {
    mostrarToast('❌ Error de conexión.', 'error');
  }
}

async function manejarCrearPiso(e) {
  e.preventDefault();
  const pisoNum = parseInt(document.getElementById('nuevo-piso-num').value, 10);
  const cant = parseInt(document.getElementById('nuevo-piso-cant').value, 10);
  const inicioStr = document.getElementById('nuevo-piso-inicio').value.trim();
  const tipo = document.getElementById('nuevo-piso-tipo').value;

  if (!pisoNum || !cant || !inicioStr) {
    mostrarToast('⚠️ Completa todos los campos.', 'warning');
    return;
  }

  // Generar habitaciones secuenciales
  const inicio = parseInt(inicioStr, 10);
  if (isNaN(inicio)) {
    mostrarToast('⚠️ El número de inicio debe ser numérico.', 'warning');
    return;
  }

  const precioInput = document.getElementById('nuevo-piso-precio');
  const precioNoche = precioInput ? parseFloat(precioInput.value) : 50.0;

  const habitaciones = [];
  for (let i = 0; i < cant; i++) {
    habitaciones.push({ numero: String(inicio + i), tipo });
  }

  const btn = document.getElementById('btn-crear-piso');
  if (btn) { btn.disabled = true; btn.textContent = 'Creando...'; }

  try {
    const res = await fetch('/api/pisos', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ piso: pisoNum, habitaciones, precioNoche })
    });
    const data = await res.json();
    if (res.ok) {
      mostrarToast(`✅ ${data.message}`, 'success');
      document.getElementById('form-nuevo-piso').reset();
      cargarModuloAjustes();
      obtenerHabitaciones();
    } else {
      mostrarToast(`❌ ${data.error}`, 'error');
    }
  } catch (error) {
    mostrarToast('❌ Error de conexión.', 'error');
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = '+ CREAR PISO'; }
  }
}

async function manejarCrearHabitacion(e) {
  e.preventDefault();
  if (!pisoSeleccionadoAjustes) {
    mostrarToast('⚠️ Selecciona un piso primero.', 'warning');
    return;
  }

  const numero = document.getElementById('nueva-hab-numero').value.trim();
  const tipo = document.getElementById('nueva-hab-tipo').value;
  const precioInput = document.getElementById('nueva-hab-precio');
  const precioNoche = precioInput ? parseFloat(precioInput.value) : 50.0;

  try {
    const res = await fetch(`/api/pisos/${pisoSeleccionadoAjustes}/habitaciones`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ numero, tipo, precioNoche })
    });
    const data = await res.json();
    if (res.ok) {
      mostrarToast(`✅ Habitación ${numero} agregada.`, 'success');
      document.getElementById('form-nueva-habitacion').reset();
      cargarHabitacionesPiso(pisoSeleccionadoAjustes);
      obtenerHabitaciones();
    } else {
      mostrarToast(`❌ ${data.error}`, 'error');
    }
  } catch (error) {
    mostrarToast('❌ Error de conexión.', 'error');
  }
}

async function editarPrecioHabitacion(id, precioActual) {
  const nuevoPrecio = prompt(`Ingrese el nuevo precio por noche para la habitación ${id} (USD):`, precioActual);
  if (nuevoPrecio === null || nuevoPrecio.trim() === '') return;
  const parsed = parseFloat(nuevoPrecio);
  if (isNaN(parsed) || parsed <= 0) {
    mostrarToast('⚠️ Precio inválido.', 'warning');
    return;
  }
  
  try {
    const res = await fetch(`/api/habitaciones/${id}/precio`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ precioNoche: parsed })
    });
    const data = await res.json();
    if (res.ok) {
      mostrarToast(`✅ ${data.message}`, 'success');
      cargarHabitacionesPiso(pisoSeleccionadoAjustes);
      obtenerHabitaciones();
    } else {
      mostrarToast(`❌ ${data.error}`, 'error');
    }
  } catch(error) {
    mostrarToast('❌ Error de conexión.', 'error');
  }
}


// =============================================
// MÓDULO AJUSTES - USUARIOS
// =============================================

async function cargarUsuariosAjustes() {
  const tbody = document.getElementById('table-body-usuarios');
  if (!tbody) return;
  tbody.innerHTML = '<tr><td colspan="4" style="padding: 20px; text-align: center;">Cargando usuarios...</td></tr>';
  try {
    const res = await fetch('/api/usuarios', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!res.ok) {
      tbody.innerHTML = '<tr><td colspan="4" style="padding: 20px; text-align: center;">❌ Sin permisos o error al cargar.</td></tr>';
      return;
    }
    const usuarios = await res.json();
    if (usuarios.length === 0) {
      tbody.innerHTML = '<tr><td colspan="4" style="padding: 20px; text-align: center;">No hay usuarios registrados.</td></tr>';
      return;
    }
    tbody.innerHTML = usuarios.map(u => `
      <tr style="border-bottom: 1px solid rgba(255,255,255,0.05);">
        <td style="padding: 15px 10px;">
          <div style="font-weight: 600; color: var(--text-active);">${u.nombre} ${u.apellido}</div>
          <div style="font-size: 12px; color: var(--text-muted);">${u.usuario}</div>
        </td>
        <td style="padding: 15px 10px;">
          <span style="background: rgba(255,255,255,0.1); padding: 4px 10px; border-radius: 12px; font-size: 10px; text-transform: uppercase;">${u.rol_nombre || u.rol || 'N/A'}</span>
        </td>
        <td style="padding: 15px 10px;">
          <span style="color: #40916c; background: rgba(64,145,108,0.2); padding: 4px 10px; border-radius: 12px; font-size: 10px; font-weight: 600;">ACTIVO</span>
        </td>
        <td style="padding: 15px 10px; text-align: right;">
          <button style="background: none; border: none; color: var(--text-gold); cursor: pointer; margin-right: 10px; font-size: 12px;" onclick='abrirModalEditarUsuario(${JSON.stringify(u)})'>✏ Editar</button>
          <button style="background: none; border: none; color: #d03a45; cursor: pointer; font-size: 12px;" onclick="eliminarUsuarioAjustes('${u.id}')">🗑 Eliminar</button>
        </td>
      </tr>
    `).join('');
  } catch (error) {
    tbody.innerHTML = '<tr><td colspan="4" style="padding: 20px; text-align: center;">⚠️ Error de conexión al cargar usuarios.</td></tr>';
  }
}

function abrirModalEditarUsuario(user) {
  document.getElementById('edit-user-id').value = user.id;
  document.getElementById('edit-user-cedula').value = user.cedula;
  document.getElementById('edit-user-usuario').value = user.usuario;
  document.getElementById('edit-user-nombre').value = user.nombre;
  document.getElementById('edit-user-apellido').value = user.apellido;
  document.getElementById('edit-user-password').value = '';
  document.getElementById('edit-user-rol').value = user.rol_id;
  document.getElementById('modal-editar-usuario').style.display = 'flex';
}

function cerrarModalEditarUsuario() {
  document.getElementById('modal-editar-usuario').style.display = 'none';
}

async function manejarEditarUsuario(e) {
  e.preventDefault();
  const id = document.getElementById('edit-user-id').value;
  const payload = {
    cedula: document.getElementById('edit-user-cedula').value.trim(),
    usuario: document.getElementById('edit-user-usuario').value.trim(),
    nombre: document.getElementById('edit-user-nombre').value.trim(),
    apellido: document.getElementById('edit-user-apellido').value.trim(),
    password: document.getElementById('edit-user-password').value.trim(),
    rol_id: parseInt(document.getElementById('edit-user-rol').value, 10)
  };

  try {
    const res = await fetch('/api/usuarios/' + id, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (res.ok) {
      mostrarToast('✅ Usuario actualizado exitosamente.', 'success');
      cerrarModalEditarUsuario();
      cargarUsuariosAjustes();
    } else {
      mostrarToast(`❌ ${data.error || 'Error al actualizar'}`, 'error');
    }
  } catch (error) {
    mostrarToast('❌ Fallo de conexión.', 'error');
  }
}

async function eliminarUsuarioAjustes(id) {
  if (!confirm('¿Seguro que deseas eliminar este usuario?')) return;
  try {
    const res = await fetch('/api/usuarios/' + id, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const data = await res.json();
    if (res.ok) {
      mostrarToast('✅ Usuario eliminado.', 'success');
      cargarUsuariosAjustes();
    } else {
      mostrarToast(`❌ ${data.error || 'Error'}`, 'error');
    }
  } catch (error) {
    mostrarToast('❌ Fallo de conexión.', 'error');
  }
}

async function manejarCrearUsuarioAjustes(e) {
  e.preventDefault();
  const payload = {
    cedula: document.getElementById('snu-cedula').value.trim(),
    usuario: document.getElementById('snu-usuario').value.trim(),
    nombre: document.getElementById('snu-nombre').value.trim(),
    apellido: document.getElementById('snu-apellido').value.trim(),
    telefono: document.getElementById('snu-telefono').value.trim(),
    password: document.getElementById('snu-password').value.trim(),
    rol_id: parseInt(document.getElementById('snu-rol').value, 10)
  };

  try {
    const res = await fetch('/api/usuarios', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (res.ok) {
      mostrarToast('✅ Usuario creado exitosamente.', 'success');
      document.getElementById('settings-new-user-form').reset();
      cargarUsuariosAjustes();
    } else {
      mostrarToast(`❌ ${data.error || 'Error al crear usuario'}`, 'error');
    }
  } catch (error) {
    mostrarToast('❌ Fallo de conexión.', 'error');
  }
}

// =============================================
// TOAST NOTIFICATIONS
// =============================================
function mostrarToast(mensaje, tipo = 'info') {
  let toastContainer = document.getElementById('toast-container');
  if (!toastContainer) {
    toastContainer = document.createElement('div');
    toastContainer.id = 'toast-container';
    document.body.appendChild(toastContainer);
  }

  const toast = document.createElement('div');
  toast.className = `toast toast-${tipo}`;
  toast.textContent = mensaje;
  toastContainer.appendChild(toast);

  // Animate in
  requestAnimationFrame(() => {
    toast.classList.add('toast-visible');
  });

  setTimeout(() => {
    toast.classList.remove('toast-visible');
    toast.addEventListener('transitionend', () => toast.remove());
  }, 3500);
}

// =============================================
// MÓDULO RECEPCIÓN - FILTRO DE DISPONIBILIDAD
// =============================================

let filtroFechas = null;

function aplicarFiltroDisponibilidad() {
  const fin = document.getElementById('filter-date-in').value;
  const fout = document.getElementById('filter-date-out').value;
  if (!fin || !fout) {
    mostrarToast('⚠️ Selecciona fecha de entrada y salida.', 'warning');
    return;
  }
  if (new Date(fout) <= new Date(fin)) {
    mostrarToast('⚠️ La fecha de salida debe ser mayor a la de entrada.', 'warning');
    return;
  }
  filtroFechas = { in: fin, out: fout };
  renderizarMapaHabitaciones();
  mostrarToast('🔍 Filtro aplicado correctamente.', 'success');
}

function limpiarFiltroDisponibilidad() {
  document.getElementById('filter-date-in').value = '';
  document.getElementById('filter-date-out').value = '';
  filtroFechas = null;
  renderizarMapaHabitaciones();
}

// =============================================
// MÓDULO AJUSTES - ROLES Y PERMISOS
// =============================================

const todosLosPermisos = [
  { id: 'VER_MAPA', nombre: 'Ver Mapa de Habitaciones' },
  { id: 'EDITAR_HABITACION', nombre: 'Editar Estado de Habitaciones' },
  { id: 'GESTIONAR_HABITACIONES', nombre: 'Crear/Eliminar Pisos y Habitaciones' },
  { id: 'GESTIONAR_USUARIOS', nombre: 'Gestionar Usuarios y Permisos' }
];

async function cargarRolesYPermisos() {
  const grid = document.getElementById('settings-roles-grid');
  if (!grid) return;
  grid.innerHTML = '<div class="settings-loading">Cargando roles...</div>';
  
  try {
    const res = await fetch('/api/roles', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!res.ok) {
      grid.innerHTML = '<div class="settings-empty-state"><span class="settings-empty-icon">❌</span><p>No tienes permisos para ver esta sección.</p></div>';
      return;
    }
    
    const roles = await res.json();
    grid.innerHTML = roles.map(rol => {
      const checkboxList = todosLosPermisos.map(p => {
        const isChecked = rol.permisos.includes(p.id) ? 'checked' : '';
        return `
          <label class="settings-permiso-label">
            <input type="checkbox" class="permiso-checkbox-${rol.id}" value="${p.id}" ${isChecked}>
            <span class="permiso-text">${p.nombre}</span>
          </label>
        `;
      }).join('');
      
      return `
        <div class="settings-rol-card">
          <div class="settings-rol-header">
            <h3>${rol.nombre}</h3>
          </div>
          <div class="settings-rol-body">
            ${checkboxList}
          </div>
          <div class="settings-rol-footer">
            <button class="settings-btn settings-btn-primary" onclick="guardarPermisosRol(${rol.id}, '${rol.nombre}')">GUARDAR PERMISOS</button>
          </div>
        </div>
      `;
    }).join('');
  } catch (error) {
    grid.innerHTML = '<div class="settings-empty-state"><span class="settings-empty-icon">⚠️</span><p>Error de conexión al cargar roles.</p></div>';
  }
}

async function guardarPermisosRol(rolId, rolNombre) {
  const checkboxes = document.querySelectorAll(`.permiso-checkbox-${rolId}:checked`);
  const permisos = Array.from(checkboxes).map(cb => cb.value);
  
  try {
    const res = await fetch(`/api/roles/${rolId}/permisos`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ permisos })
    });
    const data = await res.json();
    if (res.ok) {
      mostrarToast(`✅ Permisos de ${rolNombre} guardados.`, 'success');
      if (usuarioLogueado.rol === rolNombre) {
        usuarioLogueado.permisos = permisos;
        localStorage.setItem('hotel_user', JSON.stringify(usuarioLogueado));
      }
    } else {
      mostrarToast(`❌ ${data.error}`, 'error');
    }
  } catch (error) {
    mostrarToast('❌ Error de conexión.', 'error');
  }
}

// ====================================================
//  EFECTO RIPPLE — ONDAS DORADAS AL HACER CLICK
//  Usa event delegation para capturar botones dinámicos
// ====================================================
(function initRipple() {
  const RIPPLE_SELECTORS = [
    '.nav-item', '.floor-hud-btn', '.theme-toggle-btn',
    '.close-btn', '.save-btn', '.action-btn', '.cancel-btn',
    '.settings-btn', '.settings-tab', '.settings-floor-delete-btn',
    '.settings-room-chip-del', '.room-hud-card', '.login-btn'
  ].join(', ');

  document.addEventListener('click', function (e) {
    const btn = e.target.closest(RIPPLE_SELECTORS);
    if (!btn) return;

    // Eliminar ripple anterior si existe
    const old = btn.querySelector('.ripple-wave');
    if (old) old.remove();

    const rect   = btn.getBoundingClientRect();
    const size   = Math.max(btn.offsetWidth, btn.offsetHeight);
    const x      = e.clientX - rect.left - size / 2;
    const y      = e.clientY - rect.top  - size / 2;

    const wave   = document.createElement('span');
    wave.classList.add('ripple-wave');
    wave.style.width  = wave.style.height = `${size}px`;
    wave.style.left   = `${x}px`;
    wave.style.top    = `${y}px`;

    btn.appendChild(wave);
    wave.addEventListener('animationend', () => wave.remove(), { once: true });
  });
})();
// ====================================================


document.addEventListener('DOMContentLoaded', () => {
  const formEditarUsuario = document.getElementById('form-editar-usuario');
  if (formEditarUsuario) formEditarUsuario.addEventListener('submit', manejarEditarUsuario);

  const btnReloadUsers = document.getElementById('btn-reload-users');
  if (btnReloadUsers) btnReloadUsers.addEventListener('click', cargarUsuariosAjustes);
});

// ====================================================
// NAVEGACIÓN DASHBOARD AJUSTES
// ====================================================
function openSettingsDetail(viewId) {
  // Ocultar dashboard
  document.getElementById('settings-dashboard-view').style.display = 'none';
  
  // Ocultar todas las vistas de detalle
  document.getElementById('settings-detail-usuarios').style.display = 'none';
  document.getElementById('settings-detail-pisos').style.display = 'none';
  const elNiveles = document.getElementById('settings-detail-niveles');
  if (elNiveles) elNiveles.style.display = 'none';
  
  // Mostrar la solicitada
  if (viewId === 'usuarios') {
    document.getElementById('settings-detail-usuarios').style.display = 'block';
    cargarUsuariosAjustes();
  } else if (viewId === 'pisos') {
    document.getElementById('settings-detail-pisos').style.display = 'block';
    if (typeof cargarPisos === 'function') cargarPisos();
  } else if (viewId === 'niveles') {
    if (elNiveles) elNiveles.style.display = 'block';
    cargarModuloNiveles();
  }
}

function closeSettingsDetail() {
  document.getElementById('settings-detail-usuarios').style.display = 'none';
  document.getElementById('settings-detail-pisos').style.display = 'none';
  const elNiveles = document.getElementById('settings-detail-niveles');
  if (elNiveles) elNiveles.style.display = 'none';
  document.getElementById('settings-dashboard-view').style.display = 'block';
}

// ====================================================
// MÓDULO DE GESTIÓN DE INVENTARIO
// ====================================================

let inventarioItems = [];
let inventarioContadores = {
  total: 0,
  total_unidades: 0,
  asignado: 0,
  mantenimiento: 0,
  danado: 0,
  para_cambio: 0,
  disponible: 0
};
let inventarioOpciones = { departamentos: [], habitaciones: [], estados: [] };
let inventarioItemAEliminar = null;
let inventarioDebounceTimer = null;
let inventarioOpcionesCargadas = false;

// Función de escape para proteger contra inyección HTML (XSS)
function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// Configuración de listeners y eventos del módulo de inventario
function configurarListenersInventario() {
  // Botones principales
  const btnNuevo = document.getElementById('inv-btn-nuevo');
  if (btnNuevo) btnNuevo.addEventListener('click', abrirModalNuevoItem);

  const btnRecargar = document.getElementById('inv-btn-recargar');
  if (btnRecargar) btnRecargar.addEventListener('click', () => obtenerInventario(true));

  // Buscador en tiempo real
  const inputBuscar = document.getElementById('inv-input-buscar');
  const btnClearSearch = document.getElementById('inv-btn-clear-search');
  if (inputBuscar) {
    inputBuscar.addEventListener('input', () => {
      if (inputBuscar.value.trim() !== '') {
        if (btnClearSearch) btnClearSearch.style.display = 'block';
      } else {
        if (btnClearSearch) btnClearSearch.style.display = 'none';
      }
      clearTimeout(inventarioDebounceTimer);
      inventarioDebounceTimer = setTimeout(() => {
        obtenerInventario();
      }, 180);
    });
  }

  if (btnClearSearch) {
    btnClearSearch.addEventListener('click', () => {
      if (inputBuscar) {
        inputBuscar.value = '';
        btnClearSearch.style.display = 'none';
        obtenerInventario();
      }
    });
  }

  // Filtros de estado y ubicación
  const filtroEstado = document.getElementById('inv-select-filtro-estado');
  if (filtroEstado) filtroEstado.addEventListener('change', () => {
    actualizarHighlightAcumulador(filtroEstado.value);
    obtenerInventario();
  });

  const filtroTipo = document.getElementById('inv-select-filtro-tipo');
  if (filtroTipo) filtroTipo.addEventListener('change', () => {
    actualizarOpcionesFiltroDestino();
    obtenerInventario();
  });

  const filtroDestino = document.getElementById('inv-select-filtro-destino');
  if (filtroDestino) filtroDestino.addEventListener('change', () => obtenerInventario());

  const btnLimpiarFiltros = document.getElementById('inv-btn-limpiar-filtros');
  if (btnLimpiarFiltros) btnLimpiarFiltros.addEventListener('click', limpiarTodosLosFiltros);

  // Formulario nuevo/editar elemento
  const formElemento = document.getElementById('form-inv-elemento');
  if (formElemento) formElemento.addEventListener('submit', guardarElementoInventario);

  const btnCerrarForm = document.getElementById('modal-inv-btn-cerrar');
  if (btnCerrarForm) btnCerrarForm.addEventListener('click', cerrarModalElemento);

  const btnCancelarForm = document.getElementById('modal-inv-btn-cancelar');
  if (btnCancelarForm) btnCancelarForm.addEventListener('click', cerrarModalElemento);

  // Toggle del panel de asignación según el estado seleccionado
  const selectEstadoForm = document.getElementById('inv-form-estado');
  if (selectEstadoForm) {
    selectEstadoForm.addEventListener('change', () => {
      togglePanelAsignacionForm(selectEstadoForm.value);
    });
  }

  const selectTipoAsignadoForm = document.getElementById('inv-form-asignado-tipo');
  if (selectTipoAsignadoForm) {
    selectTipoAsignadoForm.addEventListener('change', () => {
      actualizarDestinosEnFormulario(selectTipoAsignadoForm.value, 'inv-form-asignado-a');
    });
  }

  // Formulario de cambio de estado rápido
  const formCambiarEstado = document.getElementById('form-inv-cambiar-estado');
  if (formCambiarEstado) formCambiarEstado.addEventListener('submit', guardarCambioEstado);

  const btnCerrarEstado = document.getElementById('modal-inv-estado-btn-cerrar');
  if (btnCerrarEstado) btnCerrarEstado.addEventListener('click', cerrarModalCambioEstado);

  const btnCancelarEstado = document.getElementById('modal-inv-estado-btn-cancelar');
  if (btnCancelarEstado) btnCancelarEstado.addEventListener('click', cerrarModalCambioEstado);

  const selectNuevoEstado = document.getElementById('inv-estado-nuevo-select');
  if (selectNuevoEstado) {
    selectNuevoEstado.addEventListener('change', () => {
      const panel = document.getElementById('inv-estado-asignacion-panel');
      if (selectNuevoEstado.value === 'Asignado') {
        panel.style.display = 'block';
        actualizarDestinosEnFormulario(document.getElementById('inv-estado-tipo-select').value, 'inv-estado-destino-select');
      } else {
        panel.style.display = 'none';
      }
    });
  }

  const selectTipoEstado = document.getElementById('inv-estado-tipo-select');
  if (selectTipoEstado) {
    selectTipoEstado.addEventListener('change', () => {
      actualizarDestinosEnFormulario(selectTipoEstado.value, 'inv-estado-destino-select');
    });
  }

  // Modal de doble confirmación para eliminación definitiva (Regla 3 de AGENTS.md)
  const btnCerrarDel = document.getElementById('modal-inv-del-btn-cerrar');
  if (btnCerrarDel) btnCerrarDel.addEventListener('click', cerrarModalEliminar);

  const btnCancelarDel = document.getElementById('modal-del-btn-cancelar');
  if (btnCancelarDel) btnCancelarDel.addEventListener('click', cerrarModalEliminar);

  const btnDelPaso1 = document.getElementById('modal-del-btn-paso1');
  if (btnDelPaso1) {
    btnDelPaso1.addEventListener('click', () => {
      document.getElementById('modal-del-paso1').style.display = 'none';
      btnDelPaso1.style.display = 'none';
      document.getElementById('modal-del-paso2').style.display = 'block';
      document.getElementById('modal-del-btn-definitivo').style.display = 'inline-flex';
    });
  }

  const btnDelDefinitivo = document.getElementById('modal-del-btn-definitivo');
  if (btnDelDefinitivo) btnDelDefinitivo.addEventListener('click', ejecutarEliminacionDefinitiva);

  // Modal de desglose de acumuladores
  const btnCerrarAcum = document.getElementById('modal-acum-btn-cerrar');
  if (btnCerrarAcum) btnCerrarAcum.addEventListener('click', cerrarModalAcumulador);

  const btnCerrarAcumFooter = document.getElementById('modal-acum-btn-cerrar-footer');
  if (btnCerrarAcumFooter) btnCerrarAcumFooter.addEventListener('click', cerrarModalAcumulador);

  const btnFiltrarEnPantalla = document.getElementById('modal-acum-btn-filtrar-pantalla');
  if (btnFiltrarEnPantalla) {
    btnFiltrarEnPantalla.addEventListener('click', () => {
      cerrarModalAcumulador();
    });
  }

  // Click listeners para cada tarjeta de acumulador inferior (Requerimiento 4)
  document.querySelectorAll('.inv-stat-card').forEach(card => {
    card.addEventListener('click', () => {
      const estado = card.getAttribute('data-estado');
      const filtroSelect = document.getElementById('inv-select-filtro-estado');
      if (filtroSelect) {
        filtroSelect.value = estado;
        actualizarHighlightAcumulador(estado);
      }
      obtenerInventario();

      if (estado !== 'todos') {
        mostrarDetalleAcumulador(estado);
      }
    });
  });
}

// Carga inicial al cambiar al módulo de inventario
async function cargarModuloInventario() {
  if (!inventarioOpcionesCargadas) {
    await cargarOpcionesInventario();
    inventarioOpcionesCargadas = true;
  }
  await obtenerInventario();
}

// Carga las opciones de habitaciones y departamentos desde el servidor
async function cargarOpcionesInventario() {
  try {
    const res = await fetch('/api/inventario/opciones', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!res.ok) throw new Error('Error al cargar opciones de inventario.');
    inventarioOpciones = await res.json();
    actualizarOpcionesFiltroDestino();
  } catch (err) {
    console.error('Error:', err);
  }
}

// Actualiza el desplegable de filtro de destino según la ubicación seleccionada
function actualizarOpcionesFiltroDestino() {
  const selectTipo = document.getElementById('inv-select-filtro-tipo');
  const selectDestino = document.getElementById('inv-select-filtro-destino');
  if (!selectTipo || !selectDestino) return;

  const tipo = selectTipo.value;
  selectDestino.innerHTML = '<option value="todos">Todos los Destinos</option>';

  if (tipo === 'habitacion' || tipo === 'todos') {
    const optGroupHab = document.createElement('optgroup');
    optGroupHab.label = 'Habitaciones';
    (inventarioOpciones.habitaciones || []).forEach(h => {
      const opt = document.createElement('option');
      opt.value = h.numero;
      opt.textContent = `Hab. ${h.numero} (Piso ${h.piso})`;
      optGroupHab.appendChild(opt);
    });
    selectDestino.appendChild(optGroupHab);
  }

  if (tipo === 'departamento' || tipo === 'todos') {
    const optGroupDpto = document.createElement('optgroup');
    optGroupDpto.label = 'Departamentos';
    (inventarioOpciones.departamentos || []).forEach(d => {
      const opt = document.createElement('option');
      opt.value = d;
      opt.textContent = d;
      optGroupDpto.appendChild(opt);
    });
    selectDestino.appendChild(optGroupDpto);
  }
}

// Actualiza los destinos (habitaciones o departamentos) dentro de los modales
function actualizarDestinosEnFormulario(tipo, selectId, valorSeleccionado = '') {
  const select = document.getElementById(selectId);
  if (!select) return;

  select.innerHTML = '<option value="">-- Seleccionar Destino --</option>';

  if (tipo === 'habitacion') {
    (inventarioOpciones.habitaciones || []).forEach(h => {
      const opt = document.createElement('option');
      opt.value = h.numero;
      opt.textContent = `Habitación ${h.numero} (${h.tipo} - Piso ${h.piso})`;
      if (valorSeleccionado && valorSeleccionado.toString() === h.numero.toString()) {
        opt.selected = true;
      }
      select.appendChild(opt);
    });
  } else if (tipo === 'departamento') {
    (inventarioOpciones.departamentos || []).forEach(d => {
      const opt = document.createElement('option');
      opt.value = d;
      opt.textContent = `Departamento: ${d}`;
      if (valorSeleccionado && valorSeleccionado.toString().toLowerCase() === d.toString().toLowerCase()) {
        opt.selected = true;
      }
      select.appendChild(opt);
    });
  }
}

// Obtiene los datos del inventario del backend con los filtros actuales
async function obtenerInventario(mostrarAlerta = false) {
  try {
    const inputBuscar = document.getElementById('inv-input-buscar');
    const selectEstado = document.getElementById('inv-select-filtro-estado');
    const selectTipo = document.getElementById('inv-select-filtro-tipo');
    const selectDestino = document.getElementById('inv-select-filtro-destino');

    const params = new URLSearchParams();
    if (inputBuscar && inputBuscar.value.trim()) params.append('q', inputBuscar.value.trim());
    if (selectEstado && selectEstado.value !== 'todos') params.append('estado', selectEstado.value);
    if (selectTipo && selectTipo.value !== 'todos') params.append('asignado_tipo', selectTipo.value);
    if (selectDestino && selectDestino.value !== 'todos') params.append('asignado_a', selectDestino.value);

    const res = await fetch(`/api/inventario?${params.toString()}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (res.status === 401 || res.status === 403) return logout();
    if (!res.ok) throw new Error('Error al obtener datos del inventario.');

    const data = await res.json();
    inventarioItems = data.items || [];
    inventarioContadores = data.contadores || {};

    renderizarTablaInventario();
    actualizarAcumuladoresInventario();

    if (mostrarAlerta) {
      alert('Inventario sincronizado correctamente con el servidor.');
    }
  } catch (err) {
    console.error('Error al cargar inventario:', err);
  }
}

// Renderiza la tabla de inventario
function renderizarTablaInventario() {
  const tbody = document.getElementById('inv-table-body');
  const badgeConteo = document.getElementById('inv-badge-conteo');
  if (!tbody) return;

  tbody.innerHTML = '';

  if (badgeConteo) {
    const totalRegistros = inventarioContadores.total || 0;
    badgeConteo.textContent = `Mostrando ${inventarioItems.length} de ${totalRegistros} elementos`;
  }

  if (inventarioItems.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="7">
          <div class="inv-empty-state">
            <div class="inv-empty-icon">
              <svg width="42" height="42" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
            </div>
            <div class="inv-empty-title">No se encontraron elementos en el inventario</div>
            <div class="inv-empty-desc">Intente modificar los criterios de búsqueda o presione "Nuevo Elemento" para registrar insumos o activos.</div>
          </div>
        </td>
      </tr>
    `;
    return;
  }

  inventarioItems.forEach(item => {
    const tr = document.createElement('tr');

    // Estado class
    const est = (item.estado || '').toLowerCase().trim();
    let estadoClass = 'estado-disponible';
    if (est === 'asignado' || est === 'en uso') estadoClass = 'estado-asignado';
    else if (est === 'mantenimiento') estadoClass = 'estado-mantenimiento';
    else if (est === 'dañado' || est === 'danado') estadoClass = 'estado-danado';
    else if (est === 'para cambio') estadoClass = 'estado-para-cambio';

    // Ubicación / Asignado chip
    let ubicacionHtml = '<span style="color:var(--text-muted); font-size:12px;">Almacén General</span>';
    if (item.asignado_tipo === 'habitacion' && item.asignado_a) {
      ubicacionHtml = `
        <span class="inv-ubicacion-chip" title="Asignado a habitación">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M2 4v16"/><path d="M2 8h18a2 2 0 0 1 2 2v10"/><path d="M2 17h20"/><path d="M6 8v9"/></svg>
          Hab. <strong>${escapeHtml(item.asignado_a)}</strong>
        </span>
      `;
    } else if (item.asignado_tipo === 'departamento' && item.asignado_a) {
      ubicacionHtml = `
        <span class="inv-ubicacion-chip" title="Asignado a departamento">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect width="16" height="20" x="4" y="2" rx="2" ry="2"/><path d="M9 22v-4h6v4"/></svg>
          ${escapeHtml(item.asignado_a)}
        </span>
      `;
    }

    const notasTexto = item.notas ? escapeHtml(item.notas) : '<span style="color:var(--text-muted); font-size:11px;">Sin notas</span>';

    tr.innerHTML = `
      <td>
        <span class="inv-code-pill">${escapeHtml(item.codigo || `INV-${item.id}`)}</span>
      </td>
      <td>
        <span class="inv-item-name">${escapeHtml(item.nombre)}</span>
        <div class="inv-tags-wrap">
          <span class="inv-tag-pill"><strong>${escapeHtml(item.caracteristica)}:</strong> ${escapeHtml(item.sub_caracteristica)}</span>
        </div>
      </td>
      <td style="text-align: center;">
        <span style="font-weight: 700; font-size: 14px; color: var(--text-active);">${item.cantidad || 1}</span>
      </td>
      <td>
        <span class="inv-badge-estado ${estadoClass}">
          <span class="inv-dot"></span>
          ${escapeHtml(item.estado)}
        </span>
      </td>
      <td>
        ${ubicacionHtml}
      </td>
      <td style="font-size: 12px; color: var(--text-muted); max-width: 220px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${item.notas ? escapeHtml(item.notas) : ''}">
        ${notasTexto}
      </td>
      <td>
        <div class="inv-actions-cell">
          <button class="inv-action-btn" title="Cambiar Estado Rápido" onclick="abrirModalCambiarEstado(${item.id})">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m16 3 4 4-4 4"/><path d="M20 7H4"/><path d="m8 21-4-4 4-4"/><path d="M4 17h16"/></svg>
          </button>
          <button class="inv-action-btn" title="Editar Elemento" onclick="abrirModalEditarItem(${item.id})">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
          </button>
          <button class="inv-action-btn btn-trash" title="Eliminar del Inventario" onclick="iniciarEliminarItem(${item.id})">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
          </button>
        </div>
      </td>
    `;

    tbody.appendChild(tr);
  });
}

// Actualiza los números y el resaltado visual de los acumuladores inferiores
function actualizarAcumuladoresInventario() {
  const elTotal = document.getElementById('inv-stat-total');
  const elAsig = document.getElementById('inv-stat-asignado');
  const elMant = document.getElementById('inv-stat-mantenimiento');
  const elDan = document.getElementById('inv-stat-danado');
  const elCamb = document.getElementById('inv-stat-para-cambio');
  const elDisp = document.getElementById('inv-stat-disponible');

  if (elTotal) elTotal.textContent = inventarioContadores.total || 0;
  if (elAsig) elAsig.textContent = inventarioContadores.asignado || 0;
  if (elMant) elMant.textContent = inventarioContadores.mantenimiento || 0;
  if (elDan) elDan.textContent = inventarioContadores.danado || 0;
  if (elCamb) elCamb.textContent = inventarioContadores.para_cambio || 0;
  if (elDisp) elDisp.textContent = inventarioContadores.disponible || 0;

  const filtroSelect = document.getElementById('inv-select-filtro-estado');
  if (filtroSelect) {
    actualizarHighlightAcumulador(filtroSelect.value);
  }
}

// Resalta la tarjeta de acumulador activa
function actualizarHighlightAcumulador(estadoActivo) {
  document.querySelectorAll('.inv-stat-card').forEach(card => {
    const cardEstado = card.getAttribute('data-estado');
    if (cardEstado === estadoActivo) {
      card.classList.add('active-filter');
    } else {
      card.classList.remove('active-filter');
    }
  });
}

// Muestra el modal popup con la lista de elementos en ese estado (Requerimiento 4)
function mostrarDetalleAcumulador(estado) {
  const modal = document.getElementById('modal-inv-detalle-acumulador');
  const elTitulo = document.getElementById('modal-acum-nombre-estado');
  const elDot = document.getElementById('modal-acum-dot');
  const elConteo = document.getElementById('modal-acum-conteo');
  const elLista = document.getElementById('modal-acum-lista-items');
  if (!modal || !elLista) return;

  const itemsEnEstado = inventarioItems.filter(item => {
    const est = (item.estado || '').toLowerCase().trim();
    if (estado.toLowerCase() === 'dañado' || estado.toLowerCase() === 'danado') {
      return est === 'dañado' || est === 'danado';
    }
    if (estado.toLowerCase() === 'asignado' || estado.toLowerCase() === 'en uso') {
      return est === 'asignado' || est === 'en uso';
    }
    return est === estado.toLowerCase();
  });

  // Configurar títulos y colores del modal
  elTitulo.textContent = `ESTADO: ${estado.toUpperCase()}`;
  elConteo.textContent = `${itemsEnEstado.length} elementos`;

  let dotColor = '#38bdf8';
  if (estado.toLowerCase() === 'mantenimiento') dotColor = 'var(--color-maintenance)';
  else if (estado.toLowerCase() === 'dañado' || estado.toLowerCase() === 'danado') dotColor = 'var(--color-occupied)';
  else if (estado.toLowerCase() === 'para cambio') dotColor = '#c084fc';
  else if (estado.toLowerCase() === 'disponible') dotColor = 'var(--color-available)';

  elDot.style.background = dotColor;

  if (itemsEnEstado.length === 0) {
    elLista.innerHTML = `
      <div style="text-align: center; padding: 30px; color: var(--text-muted);">
        No hay elementos registrados actualmente en estado <strong>${estado}</strong>.
      </div>
    `;
  } else {
    let html = '<div style="display: flex; flex-direction: column; gap: 8px;">';
    itemsEnEstado.forEach(item => {
      let ubicacion = 'Almacén General';
      if (item.asignado_tipo === 'habitacion') ubicacion = `Habitación ${item.asignado_a}`;
      else if (item.asignado_tipo === 'departamento') ubicacion = `Departamento ${item.asignado_a}`;

      html += `
        <div style="background: var(--bg-input); border: 1px solid rgba(197, 168, 128, 0.25); border-radius: 6px; padding: 12px; display: flex; justify-content: space-between; align-items: center; gap: 12px;">
          <div>
            <div style="display: flex; align-items: center; gap: 8px;">
              <span class="inv-code-pill">${escapeHtml(item.codigo || `INV-${item.id}`)}</span>
              <strong style="color: var(--text-active); font-size: 14px;">${escapeHtml(item.nombre)}</strong>
              <span style="font-size: 11px; background: rgba(255,255,255,0.06); padding: 2px 6px; border-radius: 4px; color: var(--text-gold);">Cant: ${item.cantidad}</span>
            </div>
            <div style="font-size: 12px; color: var(--text-muted); margin-top: 4px;">
              <strong>${escapeHtml(item.caracteristica)}:</strong> ${escapeHtml(item.sub_caracteristica)} &bull; Ubicación: <strong>${escapeHtml(ubicacion)}</strong>
            </div>
            ${item.notas ? `<div style="font-size: 11px; color: var(--text-muted); font-style: italic; margin-top: 3px;">Nota: ${escapeHtml(item.notas)}</div>` : ''}
          </div>
          <div style="display: flex; gap: 6px;">
            <button class="inv-btn-secondary" style="padding: 5px 10px; font-size: 11px;" onclick="cerrarModalAcumulador(); abrirModalCambiarEstado(${item.id});">
              Cambiar Estado
            </button>
            <button class="inv-btn-secondary" style="padding: 5px 10px; font-size: 11px;" onclick="cerrarModalAcumulador(); abrirModalEditarItem(${item.id});">
              Editar
            </button>
          </div>
        </div>
      `;
    });
    html += '</div>';
    elLista.innerHTML = html;
  }

  modal.style.display = 'flex';
  setTimeout(() => modal.classList.add('active'), 10);
}

function cerrarModalAcumulador() {
  const modal = document.getElementById('modal-inv-detalle-acumulador');
  if (modal) {
    modal.classList.remove('active');
    setTimeout(() => modal.style.display = 'none', 200);
  }
}

// Limpia todos los filtros y restablece la búsqueda
function limpiarTodosLosFiltros() {
  const inputBuscar = document.getElementById('inv-input-buscar');
  const btnClear = document.getElementById('inv-btn-clear-search');
  const selectEstado = document.getElementById('inv-select-filtro-estado');
  const selectTipo = document.getElementById('inv-select-filtro-tipo');
  const selectDestino = document.getElementById('inv-select-filtro-destino');

  if (inputBuscar) inputBuscar.value = '';
  if (btnClear) btnClear.style.display = 'none';
  if (selectEstado) selectEstado.value = 'todos';
  if (selectTipo) selectTipo.value = 'todos';
  actualizarOpcionesFiltroDestino();
  actualizarHighlightAcumulador('todos');
  obtenerInventario();
}

// Toggle para mostrar/ocultar el selector de habitación o dpto en el modal de nuevo elemento
function togglePanelAsignacionForm(estado) {
  const panel = document.getElementById('inv-form-asignacion-panel');
  const selectTipo = document.getElementById('inv-form-asignado-tipo');
  if (!panel || !selectTipo) return;

  if (estado === 'Asignado') {
    panel.style.display = 'block';
    if (!selectTipo.value) selectTipo.value = 'habitacion';
    actualizarDestinosEnFormulario(selectTipo.value, 'inv-form-asignado-a');
  } else {
    // Si es otro estado, mantener visible como opcional o limpiar si es Almacén
    if (estado === 'Disponible') {
      selectTipo.value = '';
      const selectDestino = document.getElementById('inv-form-asignado-a');
      if (selectDestino) selectDestino.innerHTML = '<option value="">-- No Asignado (Almacén) --</option>';
    }
  }
}

// Abrir modal para crear nuevo elemento
function abrirModalNuevoItem() {
  const modal = document.getElementById('modal-inv-elemento');
  const form = document.getElementById('form-inv-elemento');
  const titulo = document.getElementById('modal-inv-form-title');
  const btnTexto = document.getElementById('modal-inv-guardar-texto');
  if (!modal || !form) return;

  form.reset();
  document.getElementById('inv-form-id').value = '';
  titulo.textContent = 'NUEVO ELEMENTO EN INVENTARIO';
  btnTexto.textContent = 'GUARDAR ELEMENTO';

  // Valores predeterminados
  document.getElementById('inv-form-cantidad').value = '1';
  document.getElementById('inv-form-estado').value = 'Disponible';
  togglePanelAsignacionForm('Disponible');

  modal.style.display = 'flex';
  setTimeout(() => modal.classList.add('active'), 10);
}

// Abrir modal para editar elemento existente
function abrirModalEditarItem(id) {
  const item = inventarioItems.find(i => i.id === id);
  if (!item) return;

  const modal = document.getElementById('modal-inv-elemento');
  const titulo = document.getElementById('modal-inv-form-title');
  const btnTexto = document.getElementById('modal-inv-guardar-texto');
  if (!modal) return;

  document.getElementById('inv-form-id').value = item.id;
  document.getElementById('inv-form-codigo').value = item.codigo || '';
  document.getElementById('inv-form-nombre').value = item.nombre || '';
  document.getElementById('inv-form-caracteristica').value = item.caracteristica || '';
  document.getElementById('inv-form-subcaracteristica').value = item.sub_caracteristica || '';
  document.getElementById('inv-form-cantidad').value = item.cantidad || 1;
  document.getElementById('inv-form-estado').value = item.estado || 'Disponible';
  document.getElementById('inv-form-notas').value = item.notas || '';

  const selectTipo = document.getElementById('inv-form-asignado-tipo');
  if (selectTipo) {
    selectTipo.value = item.asignado_tipo || '';
    actualizarDestinosEnFormulario(item.asignado_tipo, 'inv-form-asignado-a', item.asignado_a);
  }

  togglePanelAsignacionForm(item.estado);

  titulo.textContent = `EDITAR ELEMENTO: ${item.codigo || item.nombre}`;
  btnTexto.textContent = 'ACTUALIZAR CAMBIOS';

  modal.style.display = 'flex';
  setTimeout(() => modal.classList.add('active'), 10);
}

function cerrarModalElemento() {
  const modal = document.getElementById('modal-inv-elemento');
  if (modal) {
    modal.classList.remove('active');
    setTimeout(() => modal.style.display = 'none', 200);
  }
}

// Guardar o actualizar elemento con protección anti doble clic
async function guardarElementoInventario(e) {
  e.preventDefault();

  const btnGuardar = document.getElementById('modal-inv-btn-guardar');
  const spinner = document.getElementById('modal-inv-guardar-spinner');
  const textoBtn = document.getElementById('modal-inv-guardar-texto');

  // Bloqueo anti doble clic (Regla 6)
  if (btnGuardar.disabled) return;
  btnGuardar.disabled = true;
  if (spinner) spinner.style.display = 'inline-block';

  try {
    const id = document.getElementById('inv-form-id').value;
    const bodyData = {
      codigo: document.getElementById('inv-form-codigo').value.trim() || undefined,
      nombre: document.getElementById('inv-form-nombre').value.trim(),
      caracteristica: document.getElementById('inv-form-caracteristica').value.trim(),
      sub_caracteristica: document.getElementById('inv-form-subcaracteristica').value.trim(),
      cantidad: parseInt(document.getElementById('inv-form-cantidad').value, 10) || 1,
      estado: document.getElementById('inv-form-estado').value,
      asignado_tipo: document.getElementById('inv-form-asignado-tipo').value || null,
      asignado_a: document.getElementById('inv-form-asignado-a').value || null,
      notas: document.getElementById('inv-form-notas').value.trim()
    };

    if (bodyData.estado === 'Asignado' && (!bodyData.asignado_tipo || !bodyData.asignado_a)) {
      alert('Debe especificar la habitación o departamento al que está asignado el artículo.');
      btnGuardar.disabled = false;
      if (spinner) spinner.style.display = 'none';
      return;
    }

    const url = id ? `/api/inventario/${id}` : '/api/inventario';
    const method = id ? 'PUT' : 'POST';

    const res = await fetch(url, {
      method: method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(bodyData)
    });

    const resData = await res.json();
    if (!res.ok) throw new Error(resData.error || 'Error al guardar el elemento.');

    cerrarModalElemento();
    await obtenerInventario();
  } catch (err) {
    console.error('Error al guardar en inventario:', err);
    alert(err.message || 'Error al procesar la solicitud.');
  } finally {
    btnGuardar.disabled = false;
    if (spinner) spinner.style.display = 'none';
  }
}

// Modal para cambio rápido de estado
function abrirModalCambiarEstado(id) {
  const item = inventarioItems.find(i => i.id === id);
  if (!item) return;

  const modal = document.getElementById('modal-inv-cambiar-estado');
  if (!modal) return;

  document.getElementById('inv-estado-item-id').value = item.id;
  document.getElementById('inv-estado-item-codigo').textContent = item.codigo || `INV-${item.id}`;
  document.getElementById('inv-estado-item-nombre').textContent = item.nombre;
  document.getElementById('inv-estado-item-detalle').textContent = `${item.caracteristica}: ${item.sub_caracteristica} (Cant: ${item.cantidad})`;

  const selectNuevo = document.getElementById('inv-estado-nuevo-select');
  selectNuevo.value = item.estado || 'Disponible';

  const panel = document.getElementById('inv-estado-asignacion-panel');
  const selectTipo = document.getElementById('inv-estado-tipo-select');

  if (item.estado === 'Asignado') {
    panel.style.display = 'block';
    selectTipo.value = item.asignado_tipo || 'habitacion';
    actualizarDestinosEnFormulario(selectTipo.value, 'inv-estado-destino-select', item.asignado_a);
  } else {
    panel.style.display = 'none';
  }

  document.getElementById('inv-estado-notas').value = item.notas || '';

  modal.style.display = 'flex';
  setTimeout(() => modal.classList.add('active'), 10);
}

function cerrarModalCambioEstado() {
  const modal = document.getElementById('modal-inv-cambiar-estado');
  if (modal) {
    modal.classList.remove('active');
    setTimeout(() => modal.style.display = 'none', 200);
  }
}

// Guardar cambio rápido de estado con protección anti doble clic
async function guardarCambioEstado(e) {
  e.preventDefault();

  const btn = document.getElementById('modal-inv-estado-btn-guardar');
  const spinner = document.getElementById('modal-inv-estado-spinner');

  if (btn.disabled) return;
  btn.disabled = true;
  if (spinner) spinner.style.display = 'inline-block';

  try {
    const id = document.getElementById('inv-estado-item-id').value;
    const nuevoEstado = document.getElementById('inv-estado-nuevo-select').value;
    let asignadoTipo = null;
    let asignadoA = null;

    if (nuevoEstado === 'Asignado') {
      asignadoTipo = document.getElementById('inv-estado-tipo-select').value;
      asignadoA = document.getElementById('inv-estado-destino-select').value;
      if (!asignadoTipo || !asignadoA) {
        alert('Debe indicar la habitación o departamento para la asignación.');
        btn.disabled = false;
        if (spinner) spinner.style.display = 'none';
        return;
      }
    }

    const notas = document.getElementById('inv-estado-notas').value.trim();

    const res = await fetch(`/api/inventario/${id}/estado`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        estado: nuevoEstado,
        asignado_tipo: asignadoTipo,
        asignado_a: asignadoA,
        notas: notas
      })
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Error al cambiar estado.');

    cerrarModalCambioEstado();
    await obtenerInventario();
  } catch (err) {
    console.error('Error al actualizar estado:', err);
    alert(err.message || 'Error al actualizar estado.');
  } finally {
    btn.disabled = false;
    if (spinner) spinner.style.display = 'none';
  }
}

// Iniciar proceso de eliminación con doble confirmación explícita (Regla 3 de AGENTS.md)
function iniciarEliminarItem(id) {
  const item = inventarioItems.find(i => i.id === id);
  if (!item) return;

  inventarioItemAEliminar = item;

  const modal = document.getElementById('modal-inv-confirmar-eliminar');
  if (!modal) return;

  document.getElementById('modal-del-codigo').textContent = item.codigo || `INV-${item.id}`;
  document.getElementById('modal-del-nombre').textContent = item.nombre;
  document.getElementById('modal-del-carac').textContent = `Característica: ${item.caracteristica} -> ${item.sub_caracteristica} (Cantidad: ${item.cantidad})`;

  let ubicacion = 'Almacén General';
  if (item.asignado_tipo === 'habitacion') ubicacion = `Habitación ${item.asignado_a}`;
  else if (item.asignado_tipo === 'departamento') ubicacion = `Departamento ${item.asignado_a}`;
  document.getElementById('modal-del-ubicacion').textContent = `Estado actual: ${item.estado} | Ubicación: ${ubicacion}`;

  // Restablecer a paso 1
  document.getElementById('modal-del-paso1').style.display = 'block';
  document.getElementById('modal-del-paso2').style.display = 'none';
  document.getElementById('modal-del-btn-paso1').style.display = 'inline-flex';
  document.getElementById('modal-del-btn-definitivo').style.display = 'none';

  modal.style.display = 'flex';
  setTimeout(() => modal.classList.add('active'), 10);
}

function cerrarModalEliminar() {
  const modal = document.getElementById('modal-inv-confirmar-eliminar');
  if (modal) {
    modal.classList.remove('active');
    setTimeout(() => modal.style.display = 'none', 200);
  }
  inventarioItemAEliminar = null;
}

// Ejecución definitiva de eliminación (Paso 2 cumplido)
async function ejecutarEliminacionDefinitiva() {
  if (!inventarioItemAEliminar) return;

  const btn = document.getElementById('modal-del-btn-definitivo');
  const spinner = document.getElementById('modal-del-spinner');

  if (btn.disabled) return;
  btn.disabled = true;
  if (spinner) spinner.style.display = 'inline-block';

  try {
    const res = await fetch(`/api/inventario/${inventarioItemAEliminar.id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` }
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Error al eliminar el elemento.');

    cerrarModalEliminar();
    await obtenerInventario();
  } catch (err) {
    console.error('Error al eliminar elemento de inventario:', err);
    alert(err.message || 'No se pudo eliminar el elemento.');
  } finally {
    btn.disabled = false;
    if (spinner) spinner.style.display = 'none';
  }
}

// ====================================================
// MÓDULO: NIVELES ESPECIALES Y CLIENTES VIP
// ====================================================

// Estado local de niveles especiales y clientes
let nivelesEspeciales = [];
let clientesDirectorio = [];
let nivelAEliminar = null;
let clienteAEliminar = null;
let clientesDebounceTimer = null;
let tabNivelesActiva = 'catalogo';

// Configurar listeners de eventos para Niveles Especiales y Clientes
function configurarListenersNiveles() {
  // Botones para abrir modales
  const btnNuevoNivel = document.getElementById('btn-nuevo-nivel-modal');
  if (btnNuevoNivel) btnNuevoNivel.addEventListener('click', abrirModalNuevoNivel);

  const btnNuevoCliente = document.getElementById('btn-nuevo-cliente-modal');
  if (btnNuevoCliente) btnNuevoCliente.addEventListener('click', abrirModalNuevoCliente);

  // Cerrar modal de nivel
  const btnCerrarNivel = document.getElementById('modal-nivel-btn-cerrar');
  if (btnCerrarNivel) btnCerrarNivel.addEventListener('click', cerrarModalNivel);

  const btnCancelarNivel = document.getElementById('modal-nivel-btn-cancelar');
  if (btnCancelarNivel) btnCancelarNivel.addEventListener('click', cerrarModalNivel);

  // Formulario nivel
  const formNivel = document.getElementById('form-nivel-especial');
  if (formNivel) formNivel.addEventListener('submit', guardarNivelEspecial);

  // Cerrar modal de cliente
  const btnCerrarCliente = document.getElementById('modal-cliente-btn-cerrar');
  if (btnCerrarCliente) btnCerrarCliente.addEventListener('click', cerrarModalCliente);

  const btnCancelarCliente = document.getElementById('modal-cliente-btn-cancelar');
  if (btnCancelarCliente) btnCancelarCliente.addEventListener('click', cerrarModalCliente);

  // Formulario cliente
  const formCliente = document.getElementById('form-cliente-registro');
  if (formCliente) formCliente.addEventListener('submit', guardarClienteDirectorio);

  // Modal eliminación nivel (Doble confirmación - Regla 3 de AGENTS.md)
  const btnCerrarDelNivel = document.getElementById('modal-del-nivel-btn-cerrar');
  if (btnCerrarDelNivel) btnCerrarDelNivel.addEventListener('click', cerrarModalEliminarNivel);

  const btnCancelarDelNivel = document.getElementById('modal-del-nivel-btn-cancelar');
  if (btnCancelarDelNivel) btnCancelarDelNivel.addEventListener('click', cerrarModalEliminarNivel);

  const btnPaso1DelNivel = document.getElementById('modal-del-nivel-btn-paso1');
  if (btnPaso1DelNivel) {
    btnPaso1DelNivel.addEventListener('click', () => {
      document.getElementById('modal-del-nivel-paso1').style.display = 'none';
      document.getElementById('modal-del-nivel-paso2').style.display = 'block';
      btnPaso1DelNivel.style.display = 'none';
      document.getElementById('modal-del-nivel-btn-definitivo').style.display = 'inline-flex';
    });
  }

  const btnDefDelNivel = document.getElementById('modal-del-nivel-btn-definitivo');
  if (btnDefDelNivel) btnDefDelNivel.addEventListener('click', ejecutarEliminarNivelDefinitivo);

  // Modal eliminación cliente (Doble confirmación - Regla 3 de AGENTS.md)
  const btnCerrarDelCliente = document.getElementById('modal-del-cliente-btn-cerrar');
  if (btnCerrarDelCliente) btnCerrarDelCliente.addEventListener('click', cerrarModalEliminarCliente);

  const btnCancelarDelCliente = document.getElementById('modal-del-cliente-btn-cancelar');
  if (btnCancelarDelCliente) btnCancelarDelCliente.addEventListener('click', cerrarModalEliminarCliente);

  const btnPaso1DelCliente = document.getElementById('modal-del-cliente-btn-paso1');
  if (btnPaso1DelCliente) {
    btnPaso1DelCliente.addEventListener('click', () => {
      document.getElementById('modal-del-cliente-paso1').style.display = 'none';
      document.getElementById('modal-del-cliente-paso2').style.display = 'block';
      btnPaso1DelCliente.style.display = 'none';
      document.getElementById('modal-del-cliente-btn-definitivo').style.display = 'inline-flex';
    });
  }

  const btnDefDelCliente = document.getElementById('modal-del-cliente-btn-definitivo');
  if (btnDefDelCliente) btnDefDelCliente.addEventListener('click', ejecutarEliminarClienteDefinitivo);

  // Búsqueda y filtrado de clientes en tiempo real
  const inputBuscarCliente = document.getElementById('clientes-input-buscar');
  if (inputBuscarCliente) {
    inputBuscarCliente.addEventListener('input', () => {
      clearTimeout(clientesDebounceTimer);
      clientesDebounceTimer = setTimeout(() => {
        obtenerClientesDirectorio();
      }, 180);
    });
  }

  const selectFiltroNivel = document.getElementById('clientes-select-filtro-nivel');
  if (selectFiltroNivel) {
    selectFiltroNivel.addEventListener('change', () => {
      obtenerClientesDirectorio();
    });
  }
}

// Alternar entre pestañas de Niveles y Clientes
function cambiarTabNiveles(tab) {
  tabNivelesActiva = tab;
  const btnCat = document.getElementById('tab-btn-niveles-catalogo');
  const btnCli = document.getElementById('tab-btn-niveles-clientes');
  const viewCat = document.getElementById('view-tab-niveles-catalogo');
  const viewCli = document.getElementById('view-tab-niveles-clientes');

  if (tab === 'catalogo') {
    if (btnCat) btnCat.classList.add('active');
    if (btnCli) btnCli.classList.remove('active');
    if (viewCat) viewCat.style.display = 'block';
    if (viewCli) viewCli.style.display = 'none';
  } else {
    if (btnCat) btnCat.classList.remove('active');
    if (btnCli) btnCli.classList.add('active');
    if (viewCat) viewCat.style.display = 'none';
    if (viewCli) viewCli.style.display = 'block';
    obtenerClientesDirectorio();
  }
}

// Carga inicial del módulo al entrar a Niveles Especiales
async function cargarModuloNiveles() {
  await obtenerNivelesEspeciales();
  await obtenerClientesDirectorio();
  actualizarMetricasNiveles();
  poblarSelectorNivelesEnClienteModal();
  poblarSelectorFiltroNivel();
}

// Obtener todas las categorías de niveles especiales desde el backend
async function obtenerNivelesEspeciales() {
  try {
    const res = await fetch('/api/niveles', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (res.status === 401 || res.status === 403) return logout();
    if (!res.ok) throw new Error('Error al cargar niveles especiales.');
    nivelesEspeciales = await res.json();
    renderizarNiveles();
    actualizarMetricasNiveles();
    poblarSelectorNivelesEnClienteModal();
    poblarSelectorFiltroNivel();
  } catch (error) {
    console.error('Error al obtener niveles especiales:', error);
  }
}

// Obtener el directorio de clientes con filtros activos
async function obtenerClientesDirectorio() {
  try {
    const inputBuscar = document.getElementById('clientes-input-buscar');
    const selectNivel = document.getElementById('clientes-select-filtro-nivel');

    const params = new URLSearchParams();
    if (inputBuscar && inputBuscar.value.trim()) params.append('q', inputBuscar.value.trim());
    if (selectNivel && selectNivel.value !== 'todos') params.append('nivel_id', selectNivel.value);

    const res = await fetch(`/api/clientes?${params.toString()}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (res.status === 401 || res.status === 403) return logout();
    if (!res.ok) throw new Error('Error al cargar directorio de clientes.');
    clientesDirectorio = await res.json();
    renderizarClientes();
    actualizarMetricasNiveles();
  } catch (error) {
    console.error('Error al obtener clientes:', error);
  }
}

// Actualizar las cajas de estadísticas superiores
function actualizarMetricasNiveles() {
  const statTotalNiveles = document.getElementById('vip-stat-total-niveles');
  const statTotalClientes = document.getElementById('vip-stat-total-clientes');
  const statMaxDesc = document.getElementById('vip-stat-max-desc');

  if (statTotalNiveles) statTotalNiveles.textContent = nivelesEspeciales.length;

  // Contar clientes que tienen algún nivel asignado
  const clientesConNivel = clientesDirectorio.filter(c => c.nivel_id !== null && c.nivel_id !== undefined).length;
  if (statTotalClientes) statTotalClientes.textContent = clientesConNivel;

  // Calcular mayor descuento porcentual disponible
  const maxDescuento = nivelesEspeciales.reduce((max, n) => {
    const d = parseFloat(n.descuento_porcentaje) || 0;
    return d > max ? d : max;
  }, 0);
  if (statMaxDesc) statMaxDesc.textContent = `${maxDescuento}%`;
}

// Renderizar las tarjetas de categorías en el grid
function renderizarNiveles() {
  const grid = document.getElementById('grid-niveles-cards');
  if (!grid) return;

  grid.innerHTML = '';

  if (nivelesEspeciales.length === 0) {
    grid.innerHTML = `
      <div style="grid-column: 1 / -1; text-align: center; padding: 40px 20px; background: var(--bg-panel); border: 1px dashed var(--border-gold); border-radius: 12px;">
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="color: var(--text-gold); margin-bottom: 12px;"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
        <div style="font-size: 16px; font-weight: 600; color: var(--text-active); margin-bottom: 6px;">No hay niveles especiales configurados</div>
        <div style="font-size: 13px; color: var(--text-muted); margin-bottom: 16px;">Cree categorías preferenciales como VIP 1, VIP 2 o etiquetas corporativas personalizadas.</div>
        <button onclick="abrirModalNuevoNivel()" class="settings-btn settings-btn-primary" style="padding: 8px 16px; font-size: 12px;">Crear Primer Nivel</button>
      </div>
    `;
    return;
  }

  nivelesEspeciales.forEach(nivel => {
    const card = document.createElement('div');
    const colorKey = (nivel.color || 'gold').toLowerCase();
    card.className = `nivel-card color-${colorKey}`;

    // Procesar lista de beneficios
    let beneficiosHtml = '';
    if (nivel.beneficios && nivel.beneficios.trim()) {
      const lista = nivel.beneficios
        .split(/[\n,]+/)
        .map(b => b.trim())
        .filter(b => b.length > 0);

      beneficiosHtml = lista.map(b => `
        <li>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
          <span>${escapeHtml(b)}</span>
        </li>
      `).join('');
    } else {
      beneficiosHtml = `<li style="color: var(--text-muted); font-style: italic;">Sin beneficios registrados</li>`;
    }

    const descPorcentaje = parseFloat(nivel.descuento_porcentaje) || 0;
    const descBadge = descPorcentaje > 0 
      ? `<span class="vip-discount-tag"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="19" y1="5" x2="5" y2="19"/><circle cx="6.5" cy="6.5" r="2.5"/><circle cx="17.5" cy="17.5" r="2.5"/></svg> ${descPorcentaje}% DESCUENTO</span>`
      : `<span style="font-size: 11px; color: var(--text-muted); background: rgba(255,255,255,0.05); padding: 3px 8px; border-radius: 12px;">Sin descuento directo</span>`;

    const cantClientes = parseInt(nivel.total_clientes, 10) || 0;

    card.innerHTML = `
      <div>
        <div class="nivel-card-header">
          <div class="nivel-card-title-group">
            <span class="vip-pill-badge vip-pill-${colorKey}">${escapeHtml(nivel.nombre)}</span>
            <div class="nivel-card-name">${escapeHtml(nivel.nombre)}</div>
          </div>
          ${descBadge}
        </div>

        <div class="nivel-card-desc">
          ${nivel.descripcion ? escapeHtml(nivel.descripcion) : '<span style="color:var(--text-muted);">Sin descripción general.</span>'}
        </div>

        <div class="nivel-beneficios-section">
          <div class="nivel-beneficios-title">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/></svg>
            Privilegios y Beneficios
          </div>
          <ul class="nivel-beneficios-list">
            ${beneficiosHtml}
          </ul>
        </div>
      </div>

      <div class="nivel-card-footer">
        <div class="nivel-clients-count">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>
          <span><strong>${cantClientes}</strong> cliente${cantClientes !== 1 ? 's' : ''} asignado${cantClientes !== 1 ? 's' : ''}</span>
        </div>
        <div style="display: flex; gap: 8px;">
          <button type="button" class="inv-action-btn" title="Editar Categoría" onclick="abrirModalEditarNivel(${nivel.id})">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
          </button>
          <button type="button" class="inv-action-btn btn-trash" title="Eliminar Categoría" onclick="iniciarEliminarNivel(${nivel.id})">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
          </button>
        </div>
      </div>
    `;

    grid.appendChild(card);
  });
}

// Renderizar la tabla del directorio de clientes
function renderizarClientes() {
  const tbody = document.getElementById('clientes-table-body');
  const badgeConteo = document.getElementById('clientes-badge-conteo');
  if (!tbody) return;

  tbody.innerHTML = '';

  if (badgeConteo) {
    badgeConteo.textContent = `Mostrando ${clientesDirectorio.length} cliente${clientesDirectorio.length !== 1 ? 's' : ''}`;
  }

  if (clientesDirectorio.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="6" style="padding: 40px; text-align: center; color: var(--text-muted);">
          <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="color: var(--text-gold); margin-bottom: 8px;"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
          <div style="font-weight: 600; color: var(--text-active);">No se encontraron clientes registrados</div>
          <div style="font-size: 12px; margin-top: 4px;">Utilice el botón "Registrar Cliente" para incorporar huéspedes y asignarles una categoría VIP.</div>
        </td>
      </tr>
    `;
    return;
  }

  clientesDirectorio.forEach(c => {
    const tr = document.createElement('tr');
    tr.style.borderBottom = '1px solid rgba(255,255,255,0.05)';

    // Inicial del cliente para el avatar
    const inicial = (c.nombre || 'C').charAt(0).toUpperCase();
    const colorKey = (c.nivel_color || 'neutral').toLowerCase();

    // Etiqueta del nivel
    let nivelBadgeHtml = '<span class="vip-pill-badge vip-pill-neutral">Estándar (Sin Nivel)</span>';
    if (c.nivel_nombre) {
      nivelBadgeHtml = `<span class="vip-pill-badge vip-pill-${colorKey}"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg> ${escapeHtml(c.nivel_nombre)}</span>`;
    }

    // Descuento & Beneficios resumidos
    let beneficiosResumen = '<span style="color: var(--text-muted); font-size: 11px;">Tarifa normal sin privilegios</span>';
    if (c.nivel_nombre) {
      const desc = parseFloat(c.nivel_descuento) || 0;
      const descTag = desc > 0 ? `<strong style="color: #34d399;">-${desc}%</strong>` : '';
      const benfTexto = c.nivel_beneficios ? escapeHtml(c.nivel_beneficios) : 'Beneficios asignados';
      beneficiosResumen = `
        <div style="font-size: 12px; line-height: 1.4;">
          ${descTag ? `<span style="margin-right: 6px;">${descTag} Descuento</span>` : ''}
          <div style="font-size: 11px; color: var(--text-muted); max-width: 250px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${benfTexto}">
            ${benfTexto}
          </div>
        </div>
      `;
    }

    const notasTexto = c.notas ? `<div style="font-size: 11px; color: var(--text-muted); margin-top: 2px;">${escapeHtml(c.notas)}</div>` : '';

    tr.innerHTML = `
      <td style="padding: 12px 10px;">
        <div style="display: flex; align-items: center; gap: 10px;">
          <div class="cliente-avatar" style="${c.nivel_nombre ? '' : 'background: rgba(255,255,255,0.05); border-color: rgba(255,255,255,0.1); color: var(--text-muted);'}">
            ${inicial}
          </div>
          <div>
            <div style="font-weight: 600; color: var(--text-active); font-size: 13px;">${escapeHtml(c.nombre)}</div>
            ${notasTexto}
          </div>
        </div>
      </td>
      <td style="padding: 12px 10px; font-size: 12px; color: var(--text-active);">
        ${c.documento ? escapeHtml(c.documento) : '<span style="color:var(--text-muted);">No registrado</span>'}
      </td>
      <td style="padding: 12px 10px; font-size: 12px;">
        <div>${c.telefono ? `<a href="tel:${escapeHtml(c.telefono)}" style="color: var(--text-active); text-decoration: none;">${escapeHtml(c.telefono)}</a>` : '<span style="color:var(--text-muted);">Sin teléfono</span>'}</div>
        <div style="font-size: 11px; color: var(--text-muted);">${c.correo ? escapeHtml(c.correo) : ''}</div>
      </td>
      <td style="padding: 12px 10px;">
        ${nivelBadgeHtml}
      </td>
      <td style="padding: 12px 10px;">
        ${beneficiosResumen}
      </td>
      <td style="padding: 12px 10px; text-align: right;">
        <div style="display: flex; justify-content: flex-end; gap: 6px;">
          <button type="button" class="inv-action-btn" title="Editar Cliente" onclick="abrirModalEditarCliente(${c.id})">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
          </button>
          <button type="button" class="inv-action-btn btn-trash" title="Eliminar Cliente" onclick="iniciarEliminarCliente(${c.id})">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
          </button>
        </div>
      </td>
    `;

    tbody.appendChild(tr);
  });
}

// Poblar selector de niveles en el modal de cliente
function poblarSelectorNivelesEnClienteModal(valorSeleccionado = '') {
  const select = document.getElementById('cliente-form-nivel-id');
  if (!select) return;

  select.innerHTML = '<option value="">-- Sin Nivel Especial (Cliente Estándar) --</option>';
  nivelesEspeciales.forEach(n => {
    const opt = document.createElement('option');
    opt.value = n.id;
    const desc = parseFloat(n.descuento_porcentaje) || 0;
    opt.textContent = `${n.nombre}${desc > 0 ? ` (${desc}% descuento)` : ''}`;
    if (valorSeleccionado && valorSeleccionado.toString() === n.id.toString()) {
      opt.selected = true;
    }
    select.appendChild(opt);
  });
}

// Poblar selector de filtro por nivel en la tabla de clientes
function poblarSelectorFiltroNivel() {
  const select = document.getElementById('clientes-select-filtro-nivel');
  if (!select) return;

  const valorActual = select.value;
  select.innerHTML = `
    <option value="todos">Todos los Niveles</option>
    <option value="sin_nivel">Sin Nivel Asignado</option>
  `;

  nivelesEspeciales.forEach(n => {
    const opt = document.createElement('option');
    opt.value = n.id;
    opt.textContent = n.nombre;
    if (valorActual === n.id.toString()) {
      opt.selected = true;
    }
    select.appendChild(opt);
  });
}

// Abrir modal de nuevo nivel
function abrirModalNuevoNivel() {
  const modal = document.getElementById('modal-nivel-form');
  if (!modal) return;

  document.getElementById('nivel-form-id').value = '';
  document.getElementById('modal-nivel-title-text').textContent = 'NUEVA CATEGORÍA ESPECIAL';
  document.getElementById('nivel-form-nombre').value = '';
  document.getElementById('nivel-form-descuento').value = '0';
  document.getElementById('nivel-form-color').value = 'gold';
  document.getElementById('nivel-form-beneficios').value = '';
  document.getElementById('nivel-form-descripcion').value = '';

  modal.style.display = 'flex';
  setTimeout(() => modal.classList.add('active'), 10);
  document.getElementById('nivel-form-nombre').focus();
}

// Abrir modal para editar nivel existente
function abrirModalEditarNivel(id) {
  const nivel = nivelesEspeciales.find(n => n.id === id);
  if (!nivel) return;

  const modal = document.getElementById('modal-nivel-form');
  if (!modal) return;

  document.getElementById('nivel-form-id').value = nivel.id;
  document.getElementById('modal-nivel-title-text').textContent = `EDITAR: ${nivel.nombre.toUpperCase()}`;
  document.getElementById('nivel-form-nombre').value = nivel.nombre;
  document.getElementById('nivel-form-descuento').value = nivel.descuento_porcentaje || 0;
  document.getElementById('nivel-form-color').value = (nivel.color || 'gold').toLowerCase();
  document.getElementById('nivel-form-beneficios').value = nivel.beneficios || '';
  document.getElementById('nivel-form-descripcion').value = nivel.descripcion || '';

  modal.style.display = 'flex';
  setTimeout(() => modal.classList.add('active'), 10);
}

// Cerrar modal de nivel
function cerrarModalNivel() {
  const modal = document.getElementById('modal-nivel-form');
  if (modal) {
    modal.classList.remove('active');
    setTimeout(() => modal.style.display = 'none', 200);
  }
}

// Guardar nivel especial (Creación o Edición) con protección anti doble clic
async function guardarNivelEspecial(e) {
  e.preventDefault();

  const btn = document.getElementById('modal-nivel-btn-guardar');
  const spinner = document.getElementById('modal-nivel-spinner');

  if (btn.disabled) return;
  btn.disabled = true;
  if (spinner) spinner.style.display = 'inline-block';

  try {
    const id = document.getElementById('nivel-form-id').value;
    const nombre = document.getElementById('nivel-form-nombre').value.trim();
    const descuento = parseFloat(document.getElementById('nivel-form-descuento').value) || 0;
    const color = document.getElementById('nivel-form-color').value;
    const beneficios = document.getElementById('nivel-form-beneficios').value.trim();
    const descripcion = document.getElementById('nivel-form-descripcion').value.trim();

    if (!nombre) {
      alert('El nombre o etiqueta del nivel es obligatorio.');
      btn.disabled = false;
      if (spinner) spinner.style.display = 'none';
      return;
    }

    const payload = {
      nombre,
      descuento_porcentaje: descuento,
      color,
      beneficios,
      descripcion
    };

    const url = id ? `/api/niveles/${id}` : '/api/niveles';
    const method = id ? 'PUT' : 'POST';

    const res = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(payload)
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Error al guardar el nivel especial.');

    cerrarModalNivel();
    await obtenerNivelesEspeciales();
    if (typeof mostrarToast === 'function') {
      mostrarToast(id ? 'Categoría actualizada exitosamente.' : 'Nueva categoría registrada.', 'success');
    }
  } catch (error) {
    console.error('Error al guardar categoría:', error);
    alert(error.message || 'Error al guardar la categoría.');
  } finally {
    btn.disabled = false;
    if (spinner) spinner.style.display = 'none';
  }
}

// Iniciar eliminación de nivel (Doble confirmación obligatoria - Regla 3 de AGENTS.md)
function iniciarEliminarNivel(id) {
  const nivel = nivelesEspeciales.find(n => n.id === id);
  if (!nivel) return;

  nivelAEliminar = nivel;

  const modal = document.getElementById('modal-del-nivel');
  if (!modal) return;

  document.getElementById('modal-del-nivel-nombre').textContent = nivel.nombre;
  document.getElementById('modal-del-nivel-desc').textContent = `${nivel.descuento_porcentaje || 0}%`;
  document.getElementById('modal-del-nivel-clientes').textContent = `${nivel.total_clientes || 0} cliente(s)`;

  // Restablecer a paso 1
  document.getElementById('modal-del-nivel-paso1').style.display = 'block';
  document.getElementById('modal-del-nivel-paso2').style.display = 'none';
  document.getElementById('modal-del-nivel-btn-paso1').style.display = 'inline-flex';
  document.getElementById('modal-del-nivel-btn-definitivo').style.display = 'none';

  modal.style.display = 'flex';
  setTimeout(() => modal.classList.add('active'), 10);
}

// Cerrar modal de eliminación de nivel
function cerrarModalEliminarNivel() {
  const modal = document.getElementById('modal-del-nivel');
  if (modal) {
    modal.classList.remove('active');
    setTimeout(() => modal.style.display = 'none', 200);
  }
  nivelAEliminar = null;
}

// Ejecución definitiva de eliminación de nivel
async function ejecutarEliminarNivelDefinitivo() {
  if (!nivelAEliminar) return;

  const btn = document.getElementById('modal-del-nivel-btn-definitivo');
  const spinner = document.getElementById('modal-del-nivel-spinner');

  if (btn.disabled) return;
  btn.disabled = true;
  if (spinner) spinner.style.display = 'inline-block';

  try {
    const res = await fetch(`/api/niveles/${nivelAEliminar.id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` }
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Error al eliminar el nivel especial.');

    cerrarModalEliminarNivel();
    await obtenerNivelesEspeciales();
    await obtenerClientesDirectorio();
    if (typeof mostrarToast === 'function') {
      mostrarToast('Categoría eliminada correctamente.', 'success');
    }
  } catch (error) {
    console.error('Error al eliminar nivel:', error);
    alert(error.message || 'No se pudo eliminar el nivel.');
  } finally {
    btn.disabled = false;
    if (spinner) spinner.style.display = 'none';
  }
}

// Abrir modal de nuevo cliente
function abrirModalNuevoCliente() {
  const modal = document.getElementById('modal-cliente-form');
  if (!modal) return;

  document.getElementById('cliente-form-id').value = '';
  document.getElementById('modal-cliente-title-text').textContent = 'REGISTRAR CLIENTE';
  document.getElementById('cliente-form-nombre').value = '';
  document.getElementById('cliente-form-documento').value = '';
  document.getElementById('cliente-form-telefono').value = '';
  document.getElementById('cliente-form-correo').value = '';
  document.getElementById('cliente-form-notas').value = '';

  poblarSelectorNivelesEnClienteModal();

  modal.style.display = 'flex';
  setTimeout(() => modal.classList.add('active'), 10);
  document.getElementById('cliente-form-nombre').focus();
}

// Abrir modal para editar cliente existente
function abrirModalEditarCliente(id) {
  const cliente = clientesDirectorio.find(c => c.id === id);
  if (!cliente) return;

  const modal = document.getElementById('modal-cliente-form');
  if (!modal) return;

  document.getElementById('cliente-form-id').value = cliente.id;
  document.getElementById('modal-cliente-title-text').textContent = `EDITAR: ${cliente.nombre.toUpperCase()}`;
  document.getElementById('cliente-form-nombre').value = cliente.nombre;
  document.getElementById('cliente-form-documento').value = cliente.documento || '';
  document.getElementById('cliente-form-telefono').value = cliente.telefono || '';
  document.getElementById('cliente-form-correo').value = cliente.correo || '';
  document.getElementById('cliente-form-notas').value = cliente.notas || '';

  poblarSelectorNivelesEnClienteModal(cliente.nivel_id || '');

  modal.style.display = 'flex';
  setTimeout(() => modal.classList.add('active'), 10);
}

// Cerrar modal de cliente
function cerrarModalCliente() {
  const modal = document.getElementById('modal-cliente-form');
  if (modal) {
    modal.classList.remove('active');
    setTimeout(() => modal.style.display = 'none', 200);
  }
}

// Guardar cliente (Creación o Edición) con protección anti doble clic
async function guardarClienteDirectorio(e) {
  e.preventDefault();

  const btn = document.getElementById('modal-cliente-btn-guardar');
  const spinner = document.getElementById('modal-cliente-spinner');

  if (btn.disabled) return;
  btn.disabled = true;
  if (spinner) spinner.style.display = 'inline-block';

  try {
    const id = document.getElementById('cliente-form-id').value;
    const nombre = document.getElementById('cliente-form-nombre').value.trim();
    const documento = document.getElementById('cliente-form-documento').value.trim();
    const telefono = document.getElementById('cliente-form-telefono').value.trim();
    const correo = document.getElementById('cliente-form-correo').value.trim();
    const nivelId = document.getElementById('cliente-form-nivel-id').value || null;
    const notas = document.getElementById('cliente-form-notas').value.trim();

    if (!nombre) {
      alert('El nombre del cliente es obligatorio.');
      btn.disabled = false;
      if (spinner) spinner.style.display = 'none';
      return;
    }

    const payload = {
      nombre,
      documento,
      telefono,
      correo,
      nivel_id: nivelId,
      notas
    };

    const url = id ? `/api/clientes/${id}` : '/api/clientes';
    const method = id ? 'PUT' : 'POST';

    const res = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(payload)
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Error al guardar el cliente.');

    cerrarModalCliente();
    await obtenerClientesDirectorio();
    await obtenerNivelesEspeciales();
    if (typeof mostrarToast === 'function') {
      mostrarToast(id ? 'Ficha de cliente actualizada.' : 'Cliente registrado exitosamente.', 'success');
    }
  } catch (error) {
    console.error('Error al guardar cliente:', error);
    alert(error.message || 'Error al guardar los datos del cliente.');
  } finally {
    btn.disabled = false;
    if (spinner) spinner.style.display = 'none';
  }
}

// Iniciar eliminación de cliente (Doble confirmación obligatoria - Regla 3 de AGENTS.md)
function iniciarEliminarCliente(id) {
  const cliente = clientesDirectorio.find(c => c.id === id);
  if (!cliente) return;

  clienteAEliminar = cliente;

  const modal = document.getElementById('modal-del-cliente');
  if (!modal) return;

  document.getElementById('modal-del-cliente-nombre').textContent = cliente.nombre;
  document.getElementById('modal-del-cliente-doc').textContent = cliente.documento || 'Sin documento';
  document.getElementById('modal-del-cliente-nivel').textContent = cliente.nivel_nombre || 'Sin nivel asignado';

  // Restablecer a paso 1
  document.getElementById('modal-del-cliente-paso1').style.display = 'block';
  document.getElementById('modal-del-cliente-paso2').style.display = 'none';
  document.getElementById('modal-del-cliente-btn-paso1').style.display = 'inline-flex';
  document.getElementById('modal-del-cliente-btn-definitivo').style.display = 'none';

  modal.style.display = 'flex';
  setTimeout(() => modal.classList.add('active'), 10);
}

// Cerrar modal de eliminación de cliente
function cerrarModalEliminarCliente() {
  const modal = document.getElementById('modal-del-cliente');
  if (modal) {
    modal.classList.remove('active');
    setTimeout(() => modal.style.display = 'none', 200);
  }
  clienteAEliminar = null;
}

// Ejecución definitiva de eliminación de cliente
async function ejecutarEliminarClienteDefinitivo() {
  if (!clienteAEliminar) return;

  const btn = document.getElementById('modal-del-cliente-btn-definitivo');
  const spinner = document.getElementById('modal-del-cliente-spinner');

  if (btn.disabled) return;
  btn.disabled = true;
  if (spinner) spinner.style.display = 'inline-block';

  try {
    const res = await fetch(`/api/clientes/${clienteAEliminar.id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` }
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Error al eliminar el cliente.');

    cerrarModalEliminarCliente();
    await obtenerClientesDirectorio();
    await obtenerNivelesEspeciales();
    if (typeof mostrarToast === 'function') {
      mostrarToast('Cliente eliminado del directorio.', 'success');
    }
  } catch (error) {
    console.error('Error al eliminar cliente:', error);
    alert(error.message || 'No se pudo eliminar el cliente.');
  } finally {
    btn.disabled = false;
    if (spinner) spinner.style.display = 'none';
  }
}

// Helper para buscar datos de un cliente VIP por su nombre (para módulo de recepción)
function buscarClienteVipPorNombre(nombre) {
  if (!nombre || !nombre.trim()) return null;
  const nomNorm = nombre.trim().toLowerCase();
  return clientesDirectorio.find(c => (c.nombre || '').toLowerCase() === nomNorm && c.nivel_nombre) || null;
}
