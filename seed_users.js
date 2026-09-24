require('dotenv').config();
const { getDb } = require('./database.js');
const crypto = require('crypto');

function hashPassword(password) {
  return crypto.createHash('sha256').update(password).digest('hex');
}

async function seedUsers() {
  const db = await getDb();
  console.log("Creando usuarios por defecto para cada rol...");

  const users = [
    { cedula: 'V00000001', usuario: 'superadmin', nombre: 'Super', apellido: 'Admin', password: 'admin', rol_id: 1 },
    { cedula: 'V00000002', usuario: 'gerencia', nombre: 'Director', apellido: 'Gerente', password: 'admin', rol_id: 2 },
    { cedula: 'V00000003', usuario: 'administrador', nombre: 'Jefe', apellido: 'Admin', password: 'admin', rol_id: 3 },
    { cedula: 'V00000004', usuario: 'contador', nombre: 'Contador', apellido: 'Principal', password: 'admin', rol_id: 4 },
    { cedula: 'V00000005', usuario: 'recepcion', nombre: 'Agente', apellido: 'Recepcion', password: 'admin', rol_id: 5 },
    { cedula: 'V00000006', usuario: 'mantenimiento', nombre: 'Jefe', apellido: 'Mantenimiento', password: 'admin', rol_id: 6 },
    { cedula: 'V00000007', usuario: 'limpieza', nombre: 'Jefe', apellido: 'Limpieza', password: 'admin', rol_id: 7 },
    { cedula: 'V00000008', usuario: 'seguridad', nombre: 'Oficial', apellido: 'Seguridad', password: 'admin', rol_id: 8 },
    { cedula: 'V00000009', usuario: 'marketing', nombre: 'Jefe', apellido: 'Marketing', password: 'admin', rol_id: 9 }
  ];

  try {
    for (const u of users) {
      const hashed = hashPassword(u.password);
      await db.run(
        `INSERT INTO usuarios (cedula, usuario, nombre, apellido, password, rol_id)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (usuario) DO UPDATE SET rol_id = EXCLUDED.rol_id`,
        [u.cedula, u.usuario, u.nombre, u.apellido, hashed, u.rol_id]
      );
    }
    console.log("¡Usuarios creados con éxito! La clave para todos es: admin");
    process.exit(0);
  } catch(err) {
    console.error("Error:", err);
    process.exit(1);
  }
}

seedUsers();
