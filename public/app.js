// ===== GESTIÓN DEL TEMA (OSCURO / CLARO) =====
const themeToggleBtn = document.getElementById('theme-toggle-btn');
const themeIcon = document.getElementById('theme-icon');
const themeLabel = document.getElementById('theme-label');

// Cargar tema guardado (localStorage) o usar oscuro por defecto
let currentTheme = localStorage.getItem('hotelTheme') || 'dark';
document.body.setAttribute('data-theme', currentTheme);
updateThemeButton(currentTheme);

function updateThemeButton(theme) {
  if (theme === 'dark') {
    themeIcon.textContent = '☀';
    themeLabel.textContent = 'MODO CLARO';
  } else {
    themeIcon.textContent = '☽';
    themeLabel.textContent = 'MODO OSCURO';
  }
}

themeToggleBtn.addEventListener('click', () => {
  currentTheme = currentTheme === 'dark' ? 'light' : 'dark';
  document.body.setAttribute('data-theme', currentTheme);
  localStorage.setItem('hotelTheme', currentTheme);
  updateThemeButton(currentTheme);
});
// =============================================

// =============================================
// VERIFICAR AUTENTICACIÓN
// =============================================
const token = localStorage.getItem('hotel_token');
if (!token) {
  window.location.href = '/login.html';
}
const usuarioLogueado = JSON.parse(localStorage.getItem('hotel_user') || '{}');

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

  // Ya no mostramos el botón de usuarios en la barra superior del mapa, lo movemos a Ajustes.
  // if (usuarioLogueado.permisos && usuarioLogueado.permisos.includes('GESTIONAR_USUARIOS')) {
  //   usersManageBtn.style.display = 'flex';
  // }

  configurarNavegacionPrincipal();
  obtenerHabitaciones();
  configurarListeners();
});

// =============================================
// NAVEGACIÓN Y ROLES
// =============================================
function configurarNavegacionPrincipal() {
  const rol = usuarioLogueado.rol || '';
  
  // Definir accesos a módulos por rol (en base de datos esto podría venir dinámico también)
  const accesosPorRol = {
    'GERENCIA': ['recepcion', 'limpieza', 'mantenimiento', 'seguridad', 'administracion', 'gerencia', 'ajustes'],
    'RECEPCION': ['recepcion'],
    'ADMINISTRACION': ['recepcion', 'administracion', 'ajustes'],
    'SEGURIDAD': ['recepcion', 'seguridad'],
    'LIMPIEZA': ['recepcion', 'limpieza'],
    'MANTENIMIENTO': ['recepcion', 'mantenimiento']
  };

  const modulosPermitidos = accesosPorRol[rol] || ['recepcion'];

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
  if (moduleAjustes) moduleAjustes.style.display = 'none';
  modulePlaceholder.style.display = 'none';

  if (moduleName === 'recepcion') {
    moduleRecepcion.style.display = '';
    moduleRecepcion.classList.add('active-module');
  } else if (moduleName === 'ajustes') {
    if (moduleAjustes) {
      moduleAjustes.style.display = 'flex';
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
    actualizarPanel();
  } catch (error) {
    console.error('Error:', error);
    alert('No se pudo conectar con el servidor del hotel.');
  }
}

// Configurar// Configurar eventos
function configurarListeners() {
  // Toggle Theme
  themeToggleBtn.addEventListener('click', toggleTheme);

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

  // Duración dinámica en fechas
  roomCheckIn.addEventListener('change', updateDurationDisplay);
  roomCheckOut.addEventListener('change', updateDurationDisplay);

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
        priceDisplay.innerHTML = `
          <span style="color:var(--text-muted); font-size:11px;">$${precio.toFixed(2)} × ${diff} noches =</span>
          <span style="font-size:18px; margin-left:8px;">$${subtotal.toFixed(2)} USD</span>
        `;
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
  const noteIndicator = habitacionVisual.notas ? `<div class="room-hud-notes-indicator" title="${habitacionVisual.notas}">📝</div>` : '';

  // Indicador de fechas (solo si está ocupada con fechas)
  let dateIndicator = '';
  if (habitacionVisual.estado === 'OCUPADA' && habitacionVisual.fechaEntrada && habitacionVisual.fechaSalida) {
    const checkIn = new Date(habitacionVisual.fechaEntrada + 'T00:00:00').toLocaleDateString('es-ES', { day: '2-digit', month: 'long' });
    const checkOut = new Date(habitacionVisual.fechaSalida + 'T00:00:00').toLocaleDateString('es-ES', { day: '2-digit', month: 'long' });
    dateIndicator = `<div class="room-hud-date-indicator" title="Check-in: ${habitacionVisual.fechaEntrada} | Check-out: ${habitacionVisual.fechaSalida}">📅 ${checkIn} → ${checkOut}</div>`;
  }

  card.innerHTML = `
    ${noteIndicator}
    <div class="room-hud-num">${habitacionVisual.numero}</div>
    <div class="room-hud-details">
      <span class="room-hud-type">${habitacionVisual.tipo}</span>
      <span class="room-hud-status-badge">${traduccionesEstadoCorto[habitacionVisual.estado]}</span>
    </div>
    ${dateIndicator}
  `;

  // Abrir modal con detalles del plano al hacer click. Siempre se pasa la original.
  card.addEventListener('click', () => abrirModalHabitacion(habitacionOriginal || habitacionVisual));

  return card;
}

// Renderizar las habitaciones en el plano de planta (Norte y Sur wings)
function renderizarMapaHabitaciones() {
  // Limpiar ambas secciones
  northWing.innerHTML = '';
  southWing.innerHTML = '';

  // Filtrar habitaciones por piso activo
  const habitacionesPiso = datosHabitaciones.filter(h => h.piso === pisoActual);

  // Distribuir en el plano: impares al norte, pares al sur
  habitacionesPiso.forEach(habitacion => {
    let habVisual = { ...habitacion };

    // Si hay un filtro activo, calculamos su estado visual
    if (filtroFechas) {
      if (habitacion.estado === 'OCUPADA' && habitacion.fechaEntrada && habitacion.fechaSalida) {
        const fIn = new Date(filtroFechas.in);
        const fOut = new Date(filtroFechas.out);
        const hIn = new Date(habitacion.fechaEntrada);
        const hOut = new Date(habitacion.fechaSalida);
        
        // Comprobar si se solapan los rangos de fechas
        if (hIn < fOut && hOut > fIn) {
          habVisual.estado = 'OCUPADA';
        } else {
          // Si no se solapan, para esas fechas está disponible
          habVisual.estado = 'DISPONIBLE';
          habVisual.fechaEntrada = null;
          habVisual.fechaSalida = null;
        }
      }
    }

    const roomNumInt = parseInt(habVisual.numero, 10);
    const card = crearTarjetaHabitacion(habVisual, habitacion);

    if (roomNumInt % 2 !== 0) {
      // Impares (Norte)
      northWing.appendChild(card);
    } else {
      // Pares (Sur)
      southWing.appendChild(card);
    }
  });
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
    if (habitacion.clientePrincipal) {
      viewHTML += `
        <div class="view-data-row">
          <span class="view-data-icon">👤</span>
          <span class="view-data-text"><strong>Titular:</strong> ${habitacion.clientePrincipal} (${habitacion.cantidadPersonas} pers.)</span>
        </div>
      `;
    }
    if (habitacion.acompanantes) {
      viewHTML += `
        <div class="view-data-row">
          <span class="view-data-icon">👥</span>
          <span class="view-data-text"><strong>Acompañantes:</strong> ${habitacion.acompanantes}</span>
        </div>
      `;
    }
    if (habitacion.fechaEntrada && habitacion.fechaSalida) {
      const checkInStr = new Date(habitacion.fechaEntrada + 'T00:00:00').toLocaleDateString('es-ES', { day: '2-digit', month: 'long' });
      const checkOutStr = new Date(habitacion.fechaSalida + 'T00:00:00').toLocaleDateString('es-ES', { day: '2-digit', month: 'long' });
      const diffDays = Math.round((new Date(habitacion.fechaSalida) - new Date(habitacion.fechaEntrada)) / (1000 * 60 * 60 * 24));
      const precio = habitacion.precioNoche || 50.0;
      const subtotal = precio * diffDays;
      viewHTML += `
        <div class="view-data-row">
          <span class="view-data-icon">📅</span>
          <span class="view-data-text"><strong>Ocupada:</strong> del ${checkInStr} al ${checkOutStr} (${diffDays} noche${diffDays !== 1 ? 's' : ''})</span>
        </div>
        <div class="view-data-row">
          <span class="view-data-icon">💰</span>
          <span class="view-data-text"><strong>Tarifa:</strong> $${precio.toFixed(2)}/noche &rarr; <strong style="color:var(--text-gold);">$${subtotal.toFixed(2)} USD</strong></span>
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
    password: document.getElementById('nu-password').value,
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

async function cargarHabitacionesPiso(piso) {
  pisoSeleccionadoAjustes = piso;
  // Marcar piso activo visualmente
  document.querySelectorAll('.settings-floor-card').forEach(c => {
    c.classList.toggle('active', parseInt(c.dataset.piso) === piso);
  });

  const title = document.getElementById('ajustes-hab-panel-title');
  const count = document.getElementById('ajustes-hab-count');
  const grid = document.getElementById('ajustes-rooms-grid');
  const addRoomPanel = document.getElementById('settings-create-room-panel');

  if (title) title.textContent = `PISO ${piso} — HABITACIONES`;
  if (grid) grid.innerHTML = `<div class="settings-loading">Cargando...</div>`;

  try {
    const res = await fetch(`/api/pisos/${piso}/habitaciones`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!res.ok) throw new Error();
    const habitaciones = await res.json();

    if (count) count.textContent = `${habitaciones.length} habitaci${habitaciones.length !== 1 ? 'ones' : 'ón'}`;

    const puedeEliminar = usuarioLogueado.permisos && usuarioLogueado.permisos.includes('GESTIONAR_HABITACIONES');

    if (habitaciones.length === 0) {
      grid.innerHTML = `<div class="settings-empty-state"><span class="settings-empty-icon">🚪</span><p>Este piso no tiene habitaciones.</p></div>`;
    } else {
      grid.innerHTML = habitaciones.map(h => `
        <div class="settings-room-chip status-${h.estado}" style="position:relative;">
          <span class="settings-room-chip-num">${h.numero}</span>
          <span class="settings-room-chip-tipo">${h.tipo} - $${h.precioNoche || 50}</span>
          ${puedeEliminar ? `
            <button class="settings-room-chip-price-edit" onclick="editarPrecioHabitacion('${h.id}', ${h.precioNoche || 50})" title="Editar Precio" style="position:absolute; bottom:5px; right:5px; background:none; border:none; cursor:pointer; color:var(--text-gold); font-size:12px;">💰</button>
            <button class="settings-room-chip-del" onclick="eliminarHabitacion('${h.id}', ${piso})" title="Eliminar">×</button>
          ` : ''}
        </div>
      `).join('');
    }

    if (addRoomPanel && puedeEliminar) addRoomPanel.style.display = 'block';

  } catch (error) {
    if (grid) grid.innerHTML = `<div class="settings-empty-state"><p>Error al cargar habitaciones.</p></div>`;
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
  const tbody = document.getElementById('settings-users-tbody');
  if (!tbody) return;
  tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; padding: 20px; color: var(--text-muted);">Cargando...</td></tr>';
  try {
    const res = await fetch('/api/usuarios', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!res.ok) {
      tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; padding: 20px; color: var(--color-out-of-service);">Sin permisos o error al cargar.</td></tr>';
      return;
    }
    const usuarios = await res.json();
    if (usuarios.length === 0) {
      tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; padding: 20px; color: var(--text-muted);">No hay usuarios registrados.</td></tr>';
      return;
    }
    tbody.innerHTML = usuarios.map(u => `
      <tr>
        <td>${u.cedula}</td>
        <td>${u.usuario}</td>
        <td>${u.nombre} ${u.apellido}</td>
        <td><span class="settings-rol-badge">${u.rol}</span></td>
      </tr>
    `).join('');
  } catch (error) {
    tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; padding: 20px; color: var(--color-out-of-service);">Error de conexión.</td></tr>';
  }
}

async function manejarCrearUsuarioAjustes(e) {
  e.preventDefault();
  const payload = {
    cedula: document.getElementById('snu-cedula').value.trim(),
    usuario: document.getElementById('snu-usuario').value.trim(),
    nombre: document.getElementById('snu-nombre').value.trim(),
    apellido: document.getElementById('snu-apellido').value.trim(),
    password: document.getElementById('snu-password').value,
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
