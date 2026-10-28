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
    let { usuario, password } = req.body;
    usuario = typeof usuario === 'string' ? usuario.trim() : '';
    password = typeof password === 'string' ? password.trim() : '';

    if (!usuario || !password) {
      return res.status(400).json({ error: 'Usuario y contraseña son requeridos.' });
    }

    const db = await getDb();
    
    // Buscar usuario incluyendo su rol y permisos, ignorando espacios
    const user = await db.get(`
      SELECT u.*, r.nombre as rol_nombre 
      FROM usuarios u 
      JOIN roles r ON u.rol_id = r.id 
      WHERE TRIM(u.usuario) = ? OR u.usuario = ?
    `, [usuario, usuario]);

    if (!user) {
      return res.status(400).json({ error: 'Usuario no encontrado.' });
    }

    let validPassword = await bcrypt.compare(password, user.password);
    // En caso de que la contraseña en la base de datos se hubiera registrado con espacios originales
    if (!validPassword && req.body.password && req.body.password !== password) {
      validPassword = await bcrypt.compare(req.body.password, user.password);
    }

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
// ENDPOINTS DE USUARIOS (CRUD)
// ----------------------------------------------------

app.get('/api/usuarios', authenticateToken, async (req, res) => {
  try {
    if (!req.user.permisos.includes('GESTIONAR_USUARIOS')) {
      return res.status(403).json({ error: 'No tienes permisos para gestionar usuarios.' });
    }
    const db = await getDb();
    const usuarios = await db.all(`
      SELECT u.id, u.cedula, u.usuario, u.nombre, u.apellido, u.telefono, u.rol_id, r.nombre as rol_nombre
      FROM usuarios u
      JOIN roles r ON u.rol_id = r.id
    `);
    res.json(usuarios);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener usuarios.' });
  }
});

app.post('/api/usuarios', authenticateToken, async (req, res) => {
  try {
    if (!req.user.permisos.includes('GESTIONAR_USUARIOS')) {
      return res.status(403).json({ error: 'No tienes permisos para gestionar usuarios.' });
    }
    let { cedula, usuario, nombre, apellido, telefono, password, rol_id } = req.body;
    cedula = typeof cedula === 'string' ? cedula.trim() : cedula;
    usuario = typeof usuario === 'string' ? usuario.trim() : usuario;
    nombre = typeof nombre === 'string' ? nombre.trim() : nombre;
    apellido = typeof apellido === 'string' ? apellido.trim() : apellido;
    telefono = typeof telefono === 'string' ? telefono.trim() : telefono;
    password = typeof password === 'string' ? password.trim() : password;

    const db = await getDb();
    
    // Check if user already exists
    const exists = await db.get('SELECT * FROM usuarios WHERE TRIM(usuario) = ? OR TRIM(cedula) = ?', [usuario, cedula]);
    if (exists) return res.status(400).json({ error: 'El usuario o la cédula ya existe.' });

    const hashed = bcrypt.hashSync(password, 10);
    await db.run(
      'INSERT INTO usuarios (cedula, usuario, nombre, apellido, telefono, password, rol_id) VALUES ($1, $2, $3, $4, $5, $6, $7)',
      [cedula, usuario, nombre, apellido, telefono, hashed, rol_id]
    );
    res.json({ message: 'Usuario creado exitosamente.' });
  } catch (error) {
    res.status(500).json({ error: 'Error al crear usuario.' });
  }
});

app.put('/api/usuarios/:id', authenticateToken, async (req, res) => {
  try {
    if (!req.user.permisos.includes('GESTIONAR_USUARIOS')) {
      return res.status(403).json({ error: 'No tienes permisos para gestionar usuarios.' });
    }
    const { id } = req.params;
    let { cedula, usuario, nombre, apellido, telefono, password, rol_id } = req.body;
    cedula = typeof cedula === 'string' ? cedula.trim() : cedula;
    usuario = typeof usuario === 'string' ? usuario.trim() : usuario;
    nombre = typeof nombre === 'string' ? nombre.trim() : nombre;
    apellido = typeof apellido === 'string' ? apellido.trim() : apellido;
    telefono = typeof telefono === 'string' ? telefono.trim() : telefono;
    if (password) {
      password = typeof password === 'string' ? password.trim() : password;
    }

    const db = await getDb();

    if (password) {
      const hashed = bcrypt.hashSync(password, 10);
      await db.run(
        'UPDATE usuarios SET cedula = $1, usuario = $2, nombre = $3, apellido = $4, telefono = $5, password = $6, rol_id = $7 WHERE id = $8',
        [cedula, usuario, nombre, apellido, telefono, hashed, rol_id, id]
      );
    } else {
      await db.run(
        'UPDATE usuarios SET cedula = $1, usuario = $2, nombre = $3, apellido = $4, telefono = $5, rol_id = $6 WHERE id = $7',
        [cedula, usuario, nombre, apellido, telefono, rol_id, id]
      );
    }
    res.json({ message: 'Usuario actualizado exitosamente.' });
  } catch (error) {
    res.status(500).json({ error: 'Error al actualizar usuario.' });
  }
});

app.delete('/api/usuarios/:id', authenticateToken, async (req, res) => {
  try {
    if (!req.user.permisos.includes('GESTIONAR_USUARIOS')) {
      return res.status(403).json({ error: 'No tienes permisos para gestionar usuarios.' });
    }
    const { id } = req.params;
    if (id === req.user.id.toString()) {
      return res.status(400).json({ error: 'No puedes eliminarte a ti mismo.' });
    }
    const db = await getDb();
    await db.run('DELETE FROM usuarios WHERE id = ?', [id]);
    res.json({ message: 'Usuario eliminado exitosamente.' });
  } catch (error) {
    res.status(500).json({ error: 'Error al eliminar usuario.' });
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

// Actualizar posición de la habitación (drag & drop)
app.put('/api/habitaciones/:id/posicion', authenticateToken, async (req, res) => {
  try {
    if (!req.user.permisos.includes('GESTIONAR_HABITACIONES')) {
      return res.status(403).json({ error: 'No tienes permisos para configurar pisos.' });
    }
    const { id } = req.params;
    const { pos_x, pos_y } = req.body;
    const db = await getDb();
    await db.run('UPDATE habitaciones SET pos_x = $1, pos_y = $2 WHERE id = $3', [pos_x, pos_y, id]);
    res.json({ message: 'Posición actualizada correctamente.' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al actualizar la posición de la habitación.' });
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

// Editar datos de la habitación
app.put('/api/habitaciones/:id/editar', authenticateToken, async (req, res) => {
  if (!req.user.permisos.includes('GESTIONAR_HABITACIONES')) {
    return res.status(403).json({ error: 'No tienes permisos para gestionar habitaciones.' });
  }
  try {
    const { numero, tipo, precioNoche } = req.body;
    const db = await getDb();
    const precio = precioNoche ? parseFloat(precioNoche) : 50.0;
    const result = await db.run('UPDATE habitaciones SET numero = ?, tipo = ?, precioNoche = ? WHERE id = ?', [numero, tipo, precio, req.params.id]);
    if (result.changes === 0) return res.status(404).json({ error: 'Habitación no encontrada.' });
    res.json({ message: 'Habitación actualizada.' });
  } catch (error) {
    res.status(500).json({ error: 'Error al actualizar habitación.' });
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

// ----------------------------------------------------
// ENDPOINTS DE GESTIÓN DE INVENTARIO
// ----------------------------------------------------

// Departamentos estándar del hotel para asignación rápida
const DEPARTAMENTOS_HOTEL = [
  'Recepción',
  'Limpieza',
  'Mantenimiento',
  'Seguridad',
  'Administración',
  'Contabilidad',
  'Marketing',
  'Gerencia',
  'Lavandería',
  'Restaurante / Bar',
  'Almacén General'
];

// Obtener opciones de ayuda para asignaciones (habitaciones y departamentos)
app.get('/api/inventario/opciones', authenticateToken, async (req, res) => {
  try {
    const db = await getDb();
    const habitaciones = await db.all('SELECT id, numero, piso, tipo FROM habitaciones ORDER BY piso ASC, numero ASC');
    res.json({
      departamentos: DEPARTAMENTOS_HOTEL,
      habitaciones: habitaciones,
      estados: ['Asignado', 'Mantenimiento', 'Dañado', 'Para Cambio', 'Disponible']
    });
  } catch (error) {
    console.error('Error al obtener opciones de inventario:', error);
    res.status(500).json({ error: 'Error al obtener opciones para inventario.' });
  }
});

// Listar elementos del inventario con buscador en tiempo real, filtros y acumuladores/contadores
app.get('/api/inventario', authenticateToken, async (req, res) => {
  try {
    const db = await getDb();
    const { q, estado, asignado_tipo, asignado_a } = req.query;

    // Obtener todos los ítems para calcular los acumuladores globales y luego filtrar
    const todosLosItems = await db.all('SELECT * FROM inventario ORDER BY id DESC');

    // Calcular acumuladores / contadores de estado
    const contadores = {
      total: 0,
      total_unidades: 0,
      asignado: 0,
      mantenimiento: 0,
      danado: 0,
      para_cambio: 0,
      disponible: 0
    };

    todosLosItems.forEach(item => {
      const cant = parseInt(item.cantidad, 10) || 1;
      contadores.total += 1;
      contadores.total_unidades += cant;

      const est = (item.estado || '').toLowerCase().trim();
      if (est === 'asignado' || est === 'en uso') {
        contadores.asignado += 1;
      } else if (est === 'mantenimiento') {
        contadores.mantenimiento += 1;
      } else if (est === 'dañado' || est === 'danado') {
        contadores.danado += 1;
      } else if (est === 'para cambio') {
        contadores.para_cambio += 1;
      } else {
        contadores.disponible += 1;
      }
    });

    // Filtrar los ítems según los parámetros enviados por el buscador y filtros
    let itemsFiltrados = todosLosItems;

    // Filtro por palabra clave (buscador en tiempo real)
    if (q && q.trim() !== '') {
      const busqueda = q.trim().toLowerCase();
      itemsFiltrados = itemsFiltrados.filter(item => {
        const codigo = (item.codigo || '').toLowerCase();
        const nombre = (item.nombre || '').toLowerCase();
        const carac = (item.caracteristica || '').toLowerCase();
        const sub = (item.sub_caracteristica || '').toLowerCase();
        const est = (item.estado || '').toLowerCase();
        const asig = (item.asignado_a || '').toLowerCase();
        const notas = (item.notas || '').toLowerCase();
        return (
          codigo.includes(busqueda) ||
          nombre.includes(busqueda) ||
          carac.includes(busqueda) ||
          sub.includes(busqueda) ||
          est.includes(busqueda) ||
          asig.includes(busqueda) ||
          notas.includes(busqueda)
        );
      });
    }

    // Filtro por estado
    if (estado && estado !== 'todos' && estado.trim() !== '') {
      const estadoFiltro = estado.toLowerCase().trim();
      itemsFiltrados = itemsFiltrados.filter(item => {
        const est = (item.estado || '').toLowerCase().trim();
        if (estadoFiltro === 'dañado' || estadoFiltro === 'danado') {
          return est === 'dañado' || est === 'danado';
        }
        if (estadoFiltro === 'asignado' || estadoFiltro === 'en uso') {
          return est === 'asignado' || est === 'en uso';
        }
        return est === estadoFiltro;
      });
    }

    // Filtro por tipo de asignación (departamento o habitación)
    if (asignado_tipo && asignado_tipo !== 'todos' && asignado_tipo.trim() !== '') {
      itemsFiltrados = itemsFiltrados.filter(item => (item.asignado_tipo || '').toLowerCase() === asignado_tipo.toLowerCase());
    }

    // Filtro por asignado_a específico
    if (asignado_a && asignado_a !== 'todos' && asignado_a.trim() !== '') {
      itemsFiltrados = itemsFiltrados.filter(item => (item.asignado_a || '').toLowerCase() === asignado_a.toLowerCase());
    }

    res.json({
      items: itemsFiltrados,
      contadores: contadores
    });
  } catch (error) {
    console.error('Error al listar inventario:', error);
    res.status(500).json({ error: 'Error al obtener elementos del inventario.' });
  }
});

// Crear nuevo elemento en el inventario
app.post('/api/inventario', authenticateToken, async (req, res) => {
  try {
    const { nombre, caracteristica, sub_caracteristica, estado, asignado_tipo, asignado_a, cantidad, notas, codigo } = req.body;

    if (!nombre || !caracteristica || !sub_caracteristica) {
      return res.status(400).json({ error: 'El nombre, característica y sub-característica son requeridos.' });
    }

    const estadoFinal = estado || 'Disponible';
    const cantFinal = parseInt(cantidad, 10) > 0 ? parseInt(cantidad, 10) : 1;

    // Validación si está asignado
    let tipoAsignado = asignado_tipo || null;
    let destinoAsignado = asignado_a || null;

    if (estadoFinal === 'Asignado') {
      if (!tipoAsignado || !destinoAsignado) {
        return res.status(400).json({ error: 'Para artículos con estado "Asignado", debe indicar si es a Habitación o Departamento y su destino.' });
      }
    }

    // Generar código único si no se proporcionó
    let codigoFinal = codigo ? codigo.trim().toUpperCase() : null;
    if (!codigoFinal) {
      const prefijo = nombre.replace(/[^a-zA-Z]/g, '').slice(0, 3).toUpperCase() || 'INV';
      const numAleatorio = Math.floor(1000 + Math.random() * 9000);
      codigoFinal = `INV-${prefijo}-${numAleatorio}`;
    }

    const db = await getDb();
    await db.run(`
      INSERT INTO inventario (codigo, nombre, caracteristica, sub_caracteristica, estado, asignado_tipo, asignado_a, cantidad, notas)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [codigoFinal, nombre.trim(), caracteristica.trim(), sub_caracteristica.trim(), estadoFinal, tipoAsignado, destinoAsignado, cantFinal, notas ? notas.trim() : '']);

    const nuevoItem = await db.get('SELECT * FROM inventario WHERE codigo = ?', [codigoFinal]);
    res.json({ message: 'Elemento agregado al inventario exitosamente.', item: nuevoItem });
  } catch (error) {
    console.error('Error al crear elemento de inventario:', error);
    res.status(500).json({ error: 'Error al registrar el elemento en el inventario.' });
  }
});

// Actualizar un elemento del inventario
app.put('/api/inventario/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre, caracteristica, sub_caracteristica, estado, asignado_tipo, asignado_a, cantidad, notas, codigo } = req.body;

    const db = await getDb();
    const itemActual = await db.get('SELECT * FROM inventario WHERE id = ?', [id]);
    if (!itemActual) {
      return res.status(404).json({ error: 'Elemento de inventario no encontrado.' });
    }

    const nuevoNombre = nombre !== undefined ? nombre.trim() : itemActual.nombre;
    const nuevaCarac = caracteristica !== undefined ? caracteristica.trim() : itemActual.caracteristica;
    const nuevaSub = sub_caracteristica !== undefined ? sub_caracteristica.trim() : itemActual.sub_caracteristica;
    const nuevoEstado = estado !== undefined ? estado : itemActual.estado;
    const nuevaCantidad = cantidad !== undefined && parseInt(cantidad, 10) > 0 ? parseInt(cantidad, 10) : itemActual.cantidad;
    const nuevoCodigo = codigo !== undefined ? codigo.trim().toUpperCase() : itemActual.codigo;
    const nuevasNotas = notas !== undefined ? notas.trim() : itemActual.notas;

    let nuevoTipo = asignado_tipo !== undefined ? asignado_tipo : itemActual.asignado_tipo;
    let nuevoAsignadoA = asignado_a !== undefined ? asignado_a : itemActual.asignado_a;

    if (nuevoEstado === 'Asignado' && (!nuevoTipo || !nuevoAsignadoA)) {
      return res.status(400).json({ error: 'Debe especificar el departamento o habitación de asignación.' });
    }

    await db.run(`
      UPDATE inventario
      SET codigo = ?, nombre = ?, caracteristica = ?, sub_caracteristica = ?, estado = ?, asignado_tipo = ?, asignado_a = ?, cantidad = ?, notas = ?, fecha_actualizacion = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [nuevoCodigo, nuevoNombre, nuevaCarac, nuevaSub, nuevoEstado, nuevoTipo, nuevoAsignadoA, nuevaCantidad, nuevasNotas, id]);

    const itemActualizado = await db.get('SELECT * FROM inventario WHERE id = ?', [id]);
    res.json({ message: 'Elemento actualizado exitosamente.', item: itemActualizado });
  } catch (error) {
    console.error('Error al actualizar elemento de inventario:', error);
    res.status(500).json({ error: 'Error al actualizar el elemento en el inventario.' });
  }
});

// Cambio rápido de estado de un elemento
app.put('/api/inventario/:id/estado', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { estado, asignado_tipo, asignado_a, notas } = req.body;

    if (!estado) {
      return res.status(400).json({ error: 'El estado es requerido.' });
    }

    const db = await getDb();
    const itemActual = await db.get('SELECT * FROM inventario WHERE id = ?', [id]);
    if (!itemActual) {
      return res.status(404).json({ error: 'Elemento no encontrado.' });
    }

    let finalTipo = asignado_tipo !== undefined ? asignado_tipo : itemActual.asignado_tipo;
    let finalAsignadoA = asignado_a !== undefined ? asignado_a : itemActual.asignado_a;

    if (estado === 'Asignado' && (!finalTipo || !finalAsignadoA)) {
      return res.status(400).json({ error: 'Debe indicar habitación o departamento para asignar.' });
    }

    // Si cambia a Disponible, limpiamos la asignación
    if (estado === 'Disponible') {
      finalTipo = null;
      finalAsignadoA = null;
    }

    const finalNotas = notas !== undefined ? notas : itemActual.notas;

    await db.run(`
      UPDATE inventario
      SET estado = ?, asignado_tipo = ?, asignado_a = ?, notas = ?, fecha_actualizacion = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [estado, finalTipo, finalAsignadoA, finalNotas, id]);

    const itemActualizado = await db.get('SELECT * FROM inventario WHERE id = ?', [id]);
    res.json({ message: 'Estado actualizado correctamente.', item: itemActualizado });
  } catch (error) {
    console.error('Error al cambiar estado en inventario:', error);
    res.status(500).json({ error: 'Error al cambiar el estado del elemento.' });
  }
});

// Eliminar elemento del inventario
app.delete('/api/inventario/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const db = await getDb();
    const item = await db.get('SELECT * FROM inventario WHERE id = ?', [id]);
    if (!item) {
      return res.status(404).json({ error: 'Elemento no encontrado.' });
    }

    await db.run('DELETE FROM inventario WHERE id = ?', [id]);
    res.json({ message: `Elemento "${item.nombre} (${item.codigo})" eliminado del inventario.` });
  } catch (error) {
    console.error('Error al eliminar elemento de inventario:', error);
    res.status(500).json({ error: 'Error al eliminar el elemento del inventario.' });
  }
});

// ----------------------------------------------------
// ENDPOINTS DE NIVELES ESPECIALES (VIP) Y CLIENTES
// ----------------------------------------------------

// Listar todos los niveles especiales con contador de clientes
app.get('/api/niveles', authenticateToken, async (req, res) => {
  try {
    const db = await getDb();
    const niveles = await db.all(`
      SELECT n.*, 
        (SELECT COUNT(*) FROM clientes c WHERE c.nivel_id = n.id) as total_clientes
      FROM niveles_especiales n
      ORDER BY n.descuento_porcentaje ASC, n.id ASC
    `);
    res.json(niveles);
  } catch (error) {
    console.error('Error al obtener niveles especiales:', error);
    res.status(500).json({ error: 'Error al obtener los niveles especiales.' });
  }
});

// Crear nuevo nivel especial
app.post('/api/niveles', authenticateToken, async (req, res) => {
  try {
    const { nombre, descuento_porcentaje, beneficios, color, descripcion, activo } = req.body;
    if (!nombre || nombre.trim() === '') {
      return res.status(400).json({ error: 'El nombre o etiqueta del nivel es requerido.' });
    }

    const descuento = parseFloat(descuento_porcentaje) || 0;
    const colorNivel = color ? color.trim().toLowerCase() : 'gold';
    const estadoActivo = activo !== undefined ? (activo ? 1 : 0) : 1;

    const db = await getDb();
    await db.run(`
      INSERT INTO niveles_especiales (nombre, descuento_porcentaje, beneficios, color, descripcion, activo)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [nombre.trim(), descuento, beneficios ? beneficios.trim() : '', colorNivel, descripcion ? descripcion.trim() : '', estadoActivo]);

    const nuevoNivel = await db.get('SELECT * FROM niveles_especiales WHERE nombre = ? ORDER BY id DESC LIMIT 1', [nombre.trim()]);
    res.json({ message: 'Nivel especial creado exitosamente.', nivel: nuevoNivel });
  } catch (error) {
    console.error('Error al crear nivel especial:', error);
    res.status(500).json({ error: 'Error al registrar el nivel especial.' });
  }
});

// Modificar nivel especial
app.put('/api/niveles/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre, descuento_porcentaje, beneficios, color, descripcion, activo } = req.body;

    const db = await getDb();
    const nivelExistente = await db.get('SELECT * FROM niveles_especiales WHERE id = ?', [id]);
    if (!nivelExistente) {
      return res.status(404).json({ error: 'Nivel especial no encontrado.' });
    }

    const nuevoNombre = nombre !== undefined ? nombre.trim() : nivelExistente.nombre;
    const nuevoDesc = descuento_porcentaje !== undefined ? parseFloat(descuento_porcentaje) : nivelExistente.descuento_porcentaje;
    const nuevosBeneficios = beneficios !== undefined ? beneficios.trim() : nivelExistente.beneficios;
    const nuevoColor = color !== undefined ? color.trim().toLowerCase() : nivelExistente.color;
    const nuevaDesc = descripcion !== undefined ? descripcion.trim() : nivelExistente.descripcion;
    const nuevoActivo = activo !== undefined ? (activo ? 1 : 0) : nivelExistente.activo;

    await db.run(`
      UPDATE niveles_especiales
      SET nombre = ?, descuento_porcentaje = ?, beneficios = ?, color = ?, descripcion = ?, activo = ?
      WHERE id = ?
    `, [nuevoNombre, nuevoDesc, nuevosBeneficios, nuevoColor, nuevaDesc, nuevoActivo, id]);

    const nivelActualizado = await db.get('SELECT * FROM niveles_especiales WHERE id = ?', [id]);
    res.json({ message: 'Nivel especial actualizado correctamente.', nivel: nivelActualizado });
  } catch (error) {
    console.error('Error al actualizar nivel especial:', error);
    res.status(500).json({ error: 'Error al actualizar el nivel especial.' });
  }
});

// Eliminar nivel especial
app.delete('/api/niveles/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const db = await getDb();
    const nivel = await db.get('SELECT * FROM niveles_especiales WHERE id = ?', [id]);
    if (!nivel) {
      return res.status(404).json({ error: 'Nivel especial no encontrado.' });
    }

    // Desvincular clientes que tengan este nivel antes de eliminar
    await db.run('UPDATE clientes SET nivel_id = NULL WHERE nivel_id = ?', [id]);
    await db.run('DELETE FROM niveles_especiales WHERE id = ?', [id]);

    res.json({ message: `Nivel especial "${nivel.nombre}" eliminado correctamente.` });
  } catch (error) {
    console.error('Error al eliminar nivel especial:', error);
    res.status(500).json({ error: 'Error al eliminar el nivel especial.' });
  }
});

// Listar clientes y su nivel asignado con soporte de búsqueda
app.get('/api/clientes', authenticateToken, async (req, res) => {
  try {
    const { q, nivel_id } = req.query;
    const db = await getDb();

    let sql = `
      SELECT c.*, 
        n.nombre as nivel_nombre, 
        n.descuento_porcentaje as nivel_descuento, 
        n.beneficios as nivel_beneficios, 
        n.color as nivel_color
      FROM clientes c
      LEFT JOIN niveles_especiales n ON c.nivel_id = n.id
    `;
    const params = [];
    const conditions = [];

    if (nivel_id && nivel_id !== 'todos') {
      if (nivel_id === 'sin_nivel') {
        conditions.push('c.nivel_id IS NULL');
      } else {
        conditions.push('c.nivel_id = ?');
        params.push(parseInt(nivel_id, 10));
      }
    }

    if (conditions.length > 0) {
      sql += ' WHERE ' + conditions.join(' AND ');
    }

    sql += ' ORDER BY c.id DESC';
    let clientes = await db.all(sql, params);

    // Filtro por palabra clave
    if (q && q.trim() !== '') {
      const busqueda = q.trim().toLowerCase();
      clientes = clientes.filter(c => {
        const nom = (c.nombre || '').toLowerCase();
        const doc = (c.documento || '').toLowerCase();
        const tel = (c.telefono || '').toLowerCase();
        const cor = (c.correo || '').toLowerCase();
        const niv = (c.nivel_nombre || '').toLowerCase();
        return nom.includes(busqueda) || doc.includes(busqueda) || tel.includes(busqueda) || cor.includes(busqueda) || niv.includes(busqueda);
      });
    }

    res.json(clientes);
  } catch (error) {
    console.error('Error al listar clientes:', error);
    res.status(500).json({ error: 'Error al obtener el directorio de clientes.' });
  }
});

// Registrar nuevo cliente o asignarle un nivel
app.post('/api/clientes', authenticateToken, async (req, res) => {
  try {
    const { nombre, documento, telefono, correo, nivel_id, notas } = req.body;
    if (!nombre || nombre.trim() === '') {
      return res.status(400).json({ error: 'El nombre del cliente es requerido.' });
    }

    const db = await getDb();
    const nivelId = nivel_id ? parseInt(nivel_id, 10) : null;

    await db.run(`
      INSERT INTO clientes (nombre, documento, telefono, correo, nivel_id, notas)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [nombre.trim(), documento ? documento.trim() : '', telefono ? telefono.trim() : '', correo ? correo.trim() : '', nivelId, notas ? notas.trim() : '']);

    const nuevoCliente = await db.get(`
      SELECT c.*, n.nombre as nivel_nombre, n.descuento_porcentaje as nivel_descuento, n.beneficios as nivel_beneficios, n.color as nivel_color
      FROM clientes c
      LEFT JOIN niveles_especiales n ON c.nivel_id = n.id
      WHERE c.nombre = ? ORDER BY c.id DESC LIMIT 1
    `, [nombre.trim()]);

    res.json({ message: 'Cliente registrado exitosamente.', cliente: nuevoCliente });
  } catch (error) {
    console.error('Error al crear cliente:', error);
    res.status(500).json({ error: 'Error al registrar el cliente.' });
  }
});

// Modificar cliente o reasignar nivel
app.put('/api/clientes/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre, documento, telefono, correo, nivel_id, notas } = req.body;

    const db = await getDb();
    const clienteExistente = await db.get('SELECT * FROM clientes WHERE id = ?', [id]);
    if (!clienteExistente) {
      return res.status(404).json({ error: 'Cliente no encontrado.' });
    }

    const nuevoNombre = nombre !== undefined ? nombre.trim() : clienteExistente.nombre;
    const nuevoDoc = documento !== undefined ? documento.trim() : clienteExistente.documento;
    const nuevoTel = telefono !== undefined ? telefono.trim() : clienteExistente.telefono;
    const nuevoCor = correo !== undefined ? correo.trim() : clienteExistente.correo;
    const nuevoNivel = nivel_id !== undefined ? (nivel_id ? parseInt(nivel_id, 10) : null) : clienteExistente.nivel_id;
    const nuevasNotas = notas !== undefined ? notas.trim() : clienteExistente.notas;

    await db.run(`
      UPDATE clientes
      SET nombre = ?, documento = ?, telefono = ?, correo = ?, nivel_id = ?, notas = ?
      WHERE id = ?
    `, [nuevoNombre, nuevoDoc, nuevoTel, nuevoCor, nuevoNivel, nuevasNotas, id]);

    const clienteActualizado = await db.get(`
      SELECT c.*, n.nombre as nivel_nombre, n.descuento_porcentaje as nivel_descuento, n.beneficios as nivel_beneficios, n.color as nivel_color
      FROM clientes c
      LEFT JOIN niveles_especiales n ON c.nivel_id = n.id
      WHERE c.id = ?
    `, [id]);

    res.json({ message: 'Cliente actualizado exitosamente.', cliente: clienteActualizado });
  } catch (error) {
    console.error('Error al actualizar cliente:', error);
    res.status(500).json({ error: 'Error al actualizar datos del cliente.' });
  }
});

// Eliminar cliente
app.delete('/api/clientes/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const db = await getDb();
    const cliente = await db.get('SELECT * FROM clientes WHERE id = ?', [id]);
    if (!cliente) {
      return res.status(404).json({ error: 'Cliente no encontrado.' });
    }

    await db.run('DELETE FROM clientes WHERE id = ?', [id]);
    res.json({ message: `Cliente "${cliente.nombre}" eliminado correctamente.` });
  } catch (error) {
    console.error('Error al eliminar cliente:', error);
    res.status(500).json({ error: 'Error al eliminar cliente.' });
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
