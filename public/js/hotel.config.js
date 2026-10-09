// ============================================================
//  CONFIGURACIÓN CENTRAL DEL HOTEL
//  ➜ Cambia los valores aquí y se actualizarán en TODA la app
// ============================================================

const HOTEL_CONFIG = {
  // Nombre completo que aparece en la barra de navegación y en el login
  nombre: "System Hotel",

  // Siglas / iniciales que aparecen en el logo de la navbar (máx. 3 caracteres)
  siglas: "SH",

  // Sub-título que aparece debajo del nombre en la pantalla de login
  subtitulo: "Sistema de Gestión Operativa",

  // Texto del tab del navegador (título de la pestaña)
  tituloRecepcion: "Recepción",
  tituloLogin:     "Acceso al Sistema",
};

// Aplica el nombre automáticamente a todos los elementos marcados con
// los atributos data-hotel-* en el HTML
(function aplicarConfig() {
  function inyectar() {
    // Nombre completo
    document.querySelectorAll('[data-hotel-nombre]').forEach(el => {
      el.textContent = HOTEL_CONFIG.nombre;
    });
    // Siglas / logo
    document.querySelectorAll('[data-hotel-siglas]').forEach(el => {
      el.textContent = HOTEL_CONFIG.siglas;
    });
    // Subtítulo
    document.querySelectorAll('[data-hotel-subtitulo]').forEach(el => {
      el.textContent = HOTEL_CONFIG.subtitulo;
    });
    // Título de la pestaña (recepcion)
    if (document.querySelector('[data-hotel-titulo-recepcion]')) {
      document.title = HOTEL_CONFIG.tituloRecepcion + ' - ' + HOTEL_CONFIG.nombre;
    }
    // Título de la pestaña (login)
    if (document.querySelector('[data-hotel-titulo-login]')) {
      document.title = HOTEL_CONFIG.tituloLogin + ' - ' + HOTEL_CONFIG.nombre;
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', inyectar);
  } else {
    inyectar();
  }
})();
