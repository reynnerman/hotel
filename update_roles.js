require('dotenv').config();
const { getDb } = require('./database.js');

async function updateRoles() {
  const db = await getDb();
  console.log("Iniciando actualización de roles...");

  try {
    await db.run('BEGIN');
    
    // Lista de roles deseados
    const roles = [
      { id: 1, nombre: 'SUPERADMIN' },
      { id: 2, nombre: 'GERENCIA' },
      { id: 3, nombre: 'ADMINISTRADOR' },
      { id: 4, nombre: 'CONTADOR' },
      { id: 5, nombre: 'RECEPCION' },
      { id: 6, nombre: 'MANTENIMIENTO' },
      { id: 7, nombre: 'LIMPIEZA' },
      { id: 8, nombre: 'SEGURIDAD' },
      { id: 9, nombre: 'MARKETING' }
    ];

    // Actualizar o insertar roles
    for (const rol of roles) {
      await db.run(
        `INSERT INTO roles (id, nombre) VALUES ($1, $2) 
         ON CONFLICT (id) DO UPDATE SET nombre = EXCLUDED.nombre`,
        [rol.id, rol.nombre]
      );
    }
    
    // Asegurar que SUPERADMIN tenga todos los permisos iniciales
    const permisosBasicos = ['VER_MAPA', 'EDITAR_HABITACION', 'GESTIONAR_USUARIOS', 'GESTIONAR_HABITACIONES'];
    for (const p of permisosBasicos) {
      await db.run(
        `INSERT INTO rol_accesos (rol_id, permiso) VALUES (1, $1) ON CONFLICT DO NOTHING`,
        [p]
      );
    }

    await db.run('COMMIT');
    console.log("¡Roles actualizados con éxito!");
    process.exit(0);
  } catch (err) {
    await db.run('ROLLBACK');
    console.error("Error actualizando roles:", err);
    process.exit(1);
  }
}

updateRoles();
