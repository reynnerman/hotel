const express = require('express');
const path = require('path');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const { setupDatabase, getDb } = require('./database');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = 'super_secret_hotel_key_change_in_production';

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Middleware de Autenticación
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) return res.status(401).json({ error: 'Acceso denegado. No hay token.' });

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: 'Token inválido o expirado.' });
    req.user = user;
    next();
  });
}

// ----------------------------------------------------
// ENDPOINTS DE AUTENTICACIÓN
// ----------------------------------------------------
app.post('/api/login', async (req, res) => {
  try {
    const { usuario, password } = req.body;
    const db = await getDb();
    
    // Buscar usuario incluyendo su rol y permisos
    const user = await db.get(`
      SELECT u.*, r.nombre as rol_nombre 
      FROM usuarios u 
      JOIN roles r ON u.rol_id = r.id 
      WHERE u.usuario = ?
    `, [usuario]);

    if (!user) {
      return res.status(400).json({ error: 'Usuario no encontrado.' });
    }

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(400).json({ error: 'Contraseña incorrecta.' });
    }

    // Obtener permisos
    const permisos = await db.all('SELECT permiso FROM rol_accesos WHERE rol_id = ?', [user.rol_id]);
    const permisosArray = permisos.map(p => p.permiso);

    const tokenPayload = {
      id: user.id,
      usuario: user.usuario,
      nombre: user.nombre,
      apellido: user.apellido,
      rol: user.rol_nombre,
      permisos: permisosArray
    };

    const token = jwt.sign(tokenPayload, JWT_SECRET, { expiresIn: '8h' });

    res.json({ message: 'Login exitoso', token, usuario: tokenPayload });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error interno del servidor.' });
  }
});

// ----------------------------------------------------
// ENDPOINTS DE HABITACIONES (Protegidos)
// ----------------------------------------------------

// Obtener todas las habitaciones
app.get('/api/habitaciones', authenticateToken, async (req, res) => {
  try {
    const db = await getDb();
    const habitaciones = await db.all('SELECT * FROM habitaciones');
    res.json(habitaciones);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener habitaciones.' });
  }
});

// Actualizar el estado de una habitación
app.put('/api/habitaciones/:id', authenticateToken, async (req, res) => {
  try {
    // Validar permiso
    if (!req.user.permisos.includes('EDITAR_HABITACION')) {
      return res.status(403).json({ error: 'No tienes permisos para editar habitaciones.' });
    }

    const { id } = req.params;
    const { estado, notas, fechaEntrada, fechaSalida, clientePrincipal, cantidadPersonas, acompanantes, metodoPago, fechaPago, comprobantePago } = req.body;
    const db = await getDb();

    const habitacion = await db.get('SELECT * FROM habitaciones WHERE id = ?', [id]);
    if (!habitacion) {
      return res.status(404).json({ error: 'Habitación no encontrada.' });
    }

    const estadosValidos = ["DISPONIBLE", "OCUPADA", "LIMPIEZA", "MANTENIMIENTO", "FUERA_DE_SERVICIO"];
    if (estado && !estadosValidos.includes(estado)) {
      return res.status(400).json({ error: 'Estado no válido.' });
    }

    const newEstado = estado || habitacion.estado;
    const newNotas = notas !== undefined ? notas : habitacion.notas;
    
    let newFeInt = habitacion.fechaEntrada;
    let newFeSal = habitacion.fechaSalida;
    let newCli = habitacion.clientePrincipal;
    let newCant = habitacion.cantidadPersonas;
    let newAcomp = habitacion.acompanantes;
    let newMetodo = habitacion.metodoPago;
    let newFechaP = habitacion.fechaPago;
    let newComprobante = habitacion.comprobantePago;

    if (newEstado === 'OCUPADA') {
      newFeInt = fechaEntrada !== undefined ? fechaEntrada : newFeInt;
      newFeSal = fechaSalida !== undefined ? fechaSalida : newFeSal;
      newCli = clientePrincipal !== undefined ? clientePrincipal : newCli;
      newCant = cantidadPersonas !== undefined ? cantidadPersonas : newCant;
      newAcomp = acompanantes !== undefined ? acompanantes : newAcomp;
      newMetodo = metodoPago !== undefined ? metodoPago : newMetodo;
      newFechaP = fechaPago !== undefined ? fechaPago : newFechaP;
      newComprobante = comprobantePago !== undefined ? comprobantePago : newComprobante;
    } else {
      // Limpiar datos si no está ocupada
      newFeInt = null;
      newFeSal = null;
      newCli = null;
      newCant = null;
      newAcomp = null;
      newMetodo = null;
      newFechaP = null;
      newComprobante = null;
    }

    await db.run(`
      UPDATE habitaciones 
      SET estado = ?, notas = ?, fechaEntrada = ?, fechaSalida = ?, clientePrincipal = ?, cantidadPersonas = ?, acompanantes = ?, metodoPago = ?, fechaPago = ?, comprobantePago = ?
      WHERE id = ?
    `, [newEstado, newNotas, newFeInt, newFeSal, newCli, newCant, newAcomp, newMetodo, newFechaP, newComprobante, id]);

    const updatedHabitacion = await db.get('SELECT * FROM habitaciones WHERE id = ?', [id]);
    res.json({ message: 'Habitación actualizada correctamente.', habitacion: updatedHabitacion });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al actualizar habitación.' });
  }
});

// Cambiar de habitación
app.put('/api/habitaciones/:id/cambiar', authenticateToken, async (req, res) => {
  try {
    if (!req.user.permisos.includes('EDITAR_HABITACION')) {
      return res.status(403).json({ error: 'No tienes permisos para editar habitaciones.' });
    }

    const { id } = req.params;
    const { nuevaHabitacionId, motivo } = req.body;
    const db = await getDb();

    if (!nuevaHabitacionId || !motivo) return res.status(400).json({ error: 'Faltan datos.' });

    const habOrigen = await db.get('SELECT * FROM habitaciones WHERE id = ?', [id]);
    const habDestino = await db.get('SELECT * FROM habitaciones WHERE id = ?', [nuevaHabitacionId]);

    if (!habOrigen || !habDestino) return res.status(404).json({ error: 'Habitación origen o destino no encontrada.' });
    if (habOrigen.estado !== 'OCUPADA') return res.status(400).json({ error: 'La habitación origen no está ocupada.' });
    if (habDestino.estado === 'OCUPADA' || habDestino.estado === 'FUERA_DE_SERVICIO' || habDestino.estado === 'MANTENIMIENTO') {
      return res.status(400).json({ error: 'La habitación destino no está disponible.' });
    }

    const nuevaNotaDestino = (habDestino.notas ? habDestino.notas + '\\n' : '') + `[CAMBIO DESDE HAB ${habOrigen.numero}] Motivo: ${motivo}`;

    await db.run('BEGIN TRANSACTION');
    try {
      // Transfer to new room
      await db.run(`
        UPDATE habitaciones 
        SET estado = 'OCUPADA', notas = ?, fechaEntrada = ?, fechaSalida = ?, clientePrincipal = ?, cantidadPersonas = ?, acompanantes = ?, metodoPago = ?, fechaPago = ?, comprobantePago = ?
        WHERE id = ?
      `, [nuevaNotaDestino, habOrigen.fechaEntrada, habOrigen.fechaSalida, habOrigen.clientePrincipal, habOrigen.cantidadPersonas, habOrigen.acompanantes, habOrigen.metodoPago, habOrigen.fechaPago, habOrigen.comprobantePago, habDestino.id]);
      
      // Free old room
      await db.run(`
        UPDATE habitaciones 
        SET estado = 'LIMPIEZA', notas = '', fechaEntrada = NULL, fechaSalida = NULL, clientePrincipal = NULL, cantidadPersonas = NULL, acompanantes = NULL, metodoPago = NULL, fechaPago = NULL, comprobantePago = NULL
        WHERE id = ?
      `, [habOrigen.id]);
      
      await db.run('COMMIT');
      res.json({ message: 'Cambio de habitación exitoso.' });
    } catch(err) {
      await db.run('ROLLBACK');
      throw err;
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al cambiar de habitación.' });
  }
});

// ----------------------------------------------------
// ENDPOINTS DE GESTIÓN DE USUARIOS (Protegidos por rol)
// ----------------------------------------------------

app.get('/api/usuarios', authenticateToken, async (req, res) => {
  if (!req.user.permisos.includes('GESTIONAR_USUARIOS')) {
    return res.status(403).json({ error: 'No tienes permisos para gestionar usuarios.' });
  }
  try {
    const db = await getDb();
    const usuarios = await db.all(`
      SELECT u.id, u.usuario, u.nombre, u.apellido, u.cedula, r.nombre as rol
      FROM usuarios u JOIN roles r ON u.rol_id = r.id
    `);
    res.json(usuarios);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener usuarios.' });
  }
});

app.post('/api/usuarios', authenticateToken, async (req, res) => {
  if (!req.user.permisos.includes('GESTIONAR_USUARIOS')) {
    return res.status(403).json({ error: 'No tienes permisos para gestionar usuarios.' });
  }
  try {
    const { usuario, password, nombre, apellido, cedula, rol_id } = req.body;
    const db = await getDb();
    
    const hashedPwd = await bcrypt.hash(password, 10);
    
    await db.run(`
      INSERT INTO usuarios (usuario, password, nombre, apellido, cedula, rol_id)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [usuario, hashedPwd, nombre, apellido, cedula, rol_id]);
    
    res.json({ message: 'Usuario creado exitosamente.' });
  } catch (error) {
    if (error.message.includes('UNIQUE constraint failed')) {
      return res.status(400).json({ error: 'El usuario o la cédula ya están registrados.' });
    }
    console.error(error);
    res.status(500).json({ error: 'Error al crear usuario.' });
  }
});

// ----------------------------------------------------
// ENDPOINTS DE ROLES Y PERMISOS (Ajustes)
// ----------------------------------------------------

app.get('/api/roles', authenticateToken, async (req, res) => {
  if (!req.user.permisos.includes('GESTIONAR_USUARIOS')) {
    return res.status(403).json({ error: 'No tienes permisos para ver roles y permisos.' });
  }
  try {
    const db = await getDb();
    const roles = await db.all('SELECT * FROM roles');
    const accesos = await db.all('SELECT * FROM rol_accesos');
    
    // Agrupar permisos por rol
    const rolesConPermisos = roles.map(rol => {
      const permisosDelRol = accesos.filter(a => a.rol_id === rol.id).map(a => a.permiso);
      return { ...rol, permisos: permisosDelRol };
    });
    
    res.json(rolesConPermisos);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener roles.' });
  }
});

app.put('/api/roles/:id/permisos', authenticateToken, async (req, res) => {
  if (!req.user.permisos.includes('GESTIONAR_USUARIOS')) {
    return res.status(403).json({ error: 'No tienes permisos para modificar permisos.' });
  }
  try {
    const { permisos } = req.body;
    const rol_id = parseInt(req.params.id, 10);
    
    if (!Array.isArray(permisos)) {
      return res.status(400).json({ error: 'Formato de permisos inválido.' });
    }
    
    const db = await getDb();
    
    // Iniciar transacción (usamos serialize o execute secuencial)
    await db.run('BEGIN TRANSACTION');
    try {
      // Eliminar permisos actuales
      await db.run('DELETE FROM rol_accesos WHERE rol_id = ?', [rol_id]);
      
      // Insertar nuevos permisos
      const stmt = await db.prepare('INSERT INTO rol_accesos (rol_id, permiso) VALUES (?, ?)');
      for (const p of permisos) {
        await stmt.run([rol_id, p]);
      }
      await stmt.finalize();
      
      await db.run('COMMIT');
      res.json({ message: 'Permisos actualizados exitosamente.' });
    } catch (err) {
      await db.run('ROLLBACK');
      throw err;
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al actualizar permisos.' });
  }
});

// ----------------------------------------------------
// ENDPOINTS DE PISOS Y HABITACIONES (Ajustes)
// ----------------------------------------------------

// Obtener todos los pisos únicos
app.get('/api/pisos', authenticateToken, async (req, res) => {
  try {
    const db = await getDb();
    const pisos = await db.all('SELECT DISTINCT piso FROM habitaciones ORDER BY piso ASC');
    res.json(pisos.map(p => p.piso));
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener pisos.' });
  }
});

// Obtener habitaciones de un piso específico
app.get('/api/pisos/:piso/habitaciones', authenticateToken, async (req, res) => {
  try {
    const db = await getDb();
    const habitaciones = await db.all('SELECT * FROM habitaciones WHERE piso = ? ORDER BY numero ASC', [req.params.piso]);
    res.json(habitaciones);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener habitaciones del piso.' });
  }
});

// Crear nuevo piso con habitaciones
app.post('/api/pisos', authenticateToken, async (req, res) => {
  if (!req.user.permisos.includes('GESTIONAR_HABITACIONES')) {
    return res.status(403).json({ error: 'No tienes permisos para gestionar habitaciones.' });
  }
  try {
    const { piso, habitaciones, precioNoche } = req.body;
    if (!piso || !Array.isArray(habitaciones) || habitaciones.length === 0) {
      return res.status(400).json({ error: 'Datos de piso inválidos.' });
    }
    const db = await getDb();
    const exists = await db.get('SELECT COUNT(*) as count FROM habitaciones WHERE piso = ?', [piso]);
    if (exists.count > 0) {
      return res.status(400).json({ error: `El piso ${piso} ya existe.` });
    }
    const precio = precioNoche ? parseFloat(precioNoche) : 50.0;
    const stmt = await db.prepare('INSERT INTO habitaciones (id, numero, piso, tipo, estado, notas, precioNoche) VALUES (?, ?, ?, ?, ?, ?, ?)');
    for (const hab of habitaciones) {
      const id = `${piso}${hab.numero}`;
      await stmt.run([id, hab.numero, piso, hab.tipo, 'DISPONIBLE', '', precio]);
    }
    await stmt.finalize();
    res.json({ message: `Piso ${piso} creado con ${habitaciones.length} habitaciones.` });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al crear piso.' });
  }
});

// Eliminar un piso completo (todas sus habitaciones)
app.delete('/api/pisos/:piso', authenticateToken, async (req, res) => {
  if (!req.user.permisos.includes('GESTIONAR_HABITACIONES')) {
    return res.status(403).json({ error: 'No tienes permisos para gestionar habitaciones.' });
  }
  try {
    const db = await getDb();
    const result = await db.run('DELETE FROM habitaciones WHERE piso = ?', [req.params.piso]);
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Piso no encontrado.' });
    }
    res.json({ message: `Piso ${req.params.piso} eliminado.` });
  } catch (error) {
    res.status(500).json({ error: 'Error al eliminar piso.' });
  }
});

// Agregar una habitación a un piso existente
app.post('/api/pisos/:piso/habitaciones', authenticateToken, async (req, res) => {
  if (!req.user.permisos.includes('GESTIONAR_HABITACIONES')) {
    return res.status(403).json({ error: 'No tienes permisos para gestionar habitaciones.' });
  }
  try {
    const { numero, tipo, precioNoche } = req.body;
    const piso = parseInt(req.params.piso, 10);
    if (!numero || !tipo) {
      return res.status(400).json({ error: 'Número y tipo son requeridos.' });
    }
    const db = await getDb();
    const exists = await db.get('SELECT id FROM habitaciones WHERE numero = ? AND piso = ?', [numero, piso]);
    if (exists) {
      return res.status(400).json({ error: `La habitación ${numero} ya existe en el piso ${piso}.` });
    }
    const precio = precioNoche ? parseFloat(precioNoche) : 50.0;
    const id = `${piso}${numero}`;
    await db.run('INSERT INTO habitaciones (id, numero, piso, tipo, estado, notas, precioNoche) VALUES (?, ?, ?, ?, ?, ?, ?)', [id, numero, piso, tipo, 'DISPONIBLE', '', precio]);
    const nueva = await db.get('SELECT * FROM habitaciones WHERE id = ?', [id]);
    res.json({ message: 'Habitación creada.', habitacion: nueva });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al crear habitación.' });
  }
});

// Eliminar una habitación
app.delete('/api/habitaciones/:id', authenticateToken, async (req, res) => {
  if (!req.user.permisos.includes('GESTIONAR_HABITACIONES')) {
    return res.status(403).json({ error: 'No tienes permisos para gestionar habitaciones.' });
  }
  try {
    const db = await getDb();
    const result = await db.run('DELETE FROM habitaciones WHERE id = ?', [req.params.id]);
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Habitación no encontrada.' });
    }
    res.json({ message: 'Habitación eliminada.' });
  } catch (error) {
    res.status(500).json({ error: 'Error al eliminar habitación.' });
  }
});

// Cambiar precio de una habitación
app.put('/api/habitaciones/:id/precio', authenticateToken, async (req, res) => {
  if (!req.user.permisos.includes('GESTIONAR_HABITACIONES')) {
    return res.status(403).json({ error: 'No tienes permisos para gestionar habitaciones.' });
  }
  try {
    const { precioNoche } = req.body;
    if (precioNoche === undefined) return res.status(400).json({ error: 'Precio requerido.' });
    const db = await getDb();
    await db.run('UPDATE habitaciones SET precioNoche = ? WHERE id = ?', [parseFloat(precioNoche), req.params.id]);
    res.json({ message: 'Precio actualizado.' });
  } catch (error) {
    res.status(500).json({ error: 'Error al actualizar precio.' });
  }
});

// Servir la interfaz frontend en cualquier otra ruta
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Inicializar base de datos y luego el servidor
setupDatabase().then(() => {
  app.listen(PORT, () => {
    console.log(`Servidor del hotel corriendo en http://localhost:${PORT}`);
  });
}).catch(err => {
  console.error("Error al inicializar la base de datos:", err);
});
