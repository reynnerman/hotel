# Registro de Actualizaciones — System Hotel

---

## 28-10-2026

### Configuración inicial del proyecto y estructura base

| Módulo | Acción / Mejora |
| :--- | :--- |
| **Servidor** | Servidor Node.js + Express funcionando con autenticación JWT y control de acceso por roles y permisos granulares. |
| **Base de Datos** | Conexión a PostgreSQL en Supabase configurada correctamente, con compatibilidad de sintaxis SQLite → PostgreSQL mediante adaptador interno. |
| **Habitaciones** | Módulo completo de gestión de habitaciones: ver estado por piso, actualizar estado, registrar huéspedes, liberar habitación, y cambiar de habitación con motivo registrado. |
| **Pisos** | Creación y eliminación de pisos completos con todas sus habitaciones incluidas. |
| **Usuarios** | CRUD de usuarios del sistema con asignación de roles y validaciones de duplicados. |
| **Roles y Permisos** | Configuración dinámica de permisos por rol desde el panel de ajustes. |
| **Frontend** | Interfaz web con soporte de Modo Claro y Modo Oscuro, fuentes Cinzel + Outfit, y configuración centralizada del hotel en `hotel.config.js`. |
| **Login** | Pantalla de acceso con diseño dividido (visual + formulario), reloj en tiempo real y transición de tema suave. |
| **AGENTS.md** | Archivo de reglas del proyecto adaptado específicamente al sistema hotelero: stack técnico real, módulos del proyecto y normas de desarrollo. |

---
