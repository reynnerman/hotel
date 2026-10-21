// Configuración de base de datos híbrida (PostgreSQL en producción y SQLite de respaldo local)
require('dotenv').config();
const path = require('path');
const { Pool } = require('pg');

let isPostgres = false;
let pool = null;
let sqliteDb = null;

if (process.env.DATABASE_URL) {
  pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
      rejectUnauthorized: false
    },
    connectionTimeoutMillis: 4000 // Tiempo límite para evitar bloqueos si la nube no responde
  });
}

// Convertidor de parámetros para compatibilidad total entre PostgreSQL ($1, $2) y SQLite (?)
function convertSqlForPg(sql) {
  let index = 1;
  return sql.replace(/\?/g, () => `$${index++}`);
}

function convertSqlForSqlite(sql) {
  return sql.replace(/\$\d+/g, '?');
}

// Implementación del objeto de base de datos
const db = {
  get: async (sql, params = []) => {
    if (isPostgres) {
      const res = await pool.query(convertSqlForPg(sql), params);
      return res.rows[0];
    } else {
      const stmt = sqliteDb.prepare(convertSqlForSqlite(sql));
      return stmt.get(...params);
    }
  },
  all: async (sql, params = []) => {
    if (isPostgres) {
      const res = await pool.query(convertSqlForPg(sql), params);
      return res.rows;
    } else {
      const stmt = sqliteDb.prepare(convertSqlForSqlite(sql));
      return stmt.all(...params);
    }
  },
  run: async (sql, params = []) => {
    const trimmed = sql.trim().toUpperCase();
    if (isPostgres) {
      let finalSql = sql;
      if (trimmed === 'BEGIN TRANSACTION') finalSql = 'BEGIN';
      const res = await pool.query(convertSqlForPg(finalSql), params);
      return { changes: res.rowCount };
    } else {
      if (trimmed === 'BEGIN TRANSACTION' || trimmed === 'BEGIN') {
        sqliteDb.exec('BEGIN TRANSACTION');
        return { changes: 0 };
      }
      if (trimmed === 'COMMIT') {
        sqliteDb.exec('COMMIT');
        return { changes: 0 };
      }
      if (trimmed === 'ROLLBACK') {
        sqliteDb.exec('ROLLBACK');
        return { changes: 0 };
      }
      const stmt = sqliteDb.prepare(convertSqlForSqlite(sql));
      const res = stmt.run(...params);
      return { changes: Number(res.changes), lastInsertRowid: Number(res.lastInsertRowid) };
    }
  },
  prepare: async (sql) => {
    if (isPostgres) {
      const convertedSql = convertSqlForPg(sql);
      return {
        run: async (params = []) => {
          return await pool.query(convertedSql, params);
        },
        finalize: async () => {}
      };
    } else {
      const stmt = sqliteDb.prepare(convertSqlForSqlite(sql));
      return {
        run: async (params = []) => {
          return stmt.run(...params);
        },
        finalize: async () => {}
      };
    }
  }
};

let setupPromise = null;

async function getDb() {
  if (!setupPromise) {
    setupPromise = setupDatabase();
  }
  await setupPromise;
  return db;
}

// Migración y datos iniciales para la tabla de inventario
async function initInventoryTable() {
  const tableSql = isPostgres
    ? `
      CREATE TABLE IF NOT EXISTS inventario (
        id SERIAL PRIMARY KEY,
        codigo VARCHAR(50) UNIQUE,
        nombre VARCHAR(150) NOT NULL,
        caracteristica VARCHAR(100) NOT NULL,
        sub_caracteristica VARCHAR(100) NOT NULL,
        estado VARCHAR(50) NOT NULL DEFAULT 'Disponible',
        asignado_tipo VARCHAR(30),
        asignado_a VARCHAR(100),
        cantidad INT NOT NULL DEFAULT 1,
        notas TEXT,
        fecha_registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        fecha_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `
    : `
      CREATE TABLE IF NOT EXISTS inventario (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        codigo TEXT UNIQUE,
        nombre TEXT NOT NULL,
        caracteristica TEXT NOT NULL,
        sub_caracteristica TEXT NOT NULL,
        estado TEXT NOT NULL DEFAULT 'Disponible',
        asignado_tipo TEXT,
        asignado_a TEXT,
        cantidad INTEGER NOT NULL DEFAULT 1,
        notas TEXT,
        fecha_registro DATETIME DEFAULT CURRENT_TIMESTAMP,
        fecha_actualizacion DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `;

  if (isPostgres) {
    await pool.query(tableSql);
    const resCount = await pool.query('SELECT COUNT(*) as c FROM inventario');
    if (parseInt(resCount.rows[0].c, 10) === 0) {
      await sembrarInventarioInicial();
    }
  } else {
    sqliteDb.exec(tableSql);
    const countRow = sqliteDb.prepare('SELECT COUNT(*) as c FROM inventario').get();
    if (Number(countRow.c) === 0) {
      await sembrarInventarioInicial();
    }
  }
}

// Sembrado de datos de demostración si el inventario está vacío
async function sembrarInventarioInicial() {
  const items = [
    { codigo: 'INV-PIL-001', nombre: 'Pila Alcalina', caracteristica: 'Tipo', sub_caracteristica: 'AA', estado: 'Disponible', asignado_tipo: null, asignado_a: null, cantidad: 48, notas: 'Caja en almacén para cerraduras electrónicas y controles' },
    { codigo: 'INV-PIL-002', nombre: 'Pila Alcalina', caracteristica: 'Tipo', sub_caracteristica: 'AAA', estado: 'Disponible', asignado_tipo: null, asignado_a: null, cantidad: 36, notas: 'Para mandos a distancia de TV y aire acondicionado' },
    { codigo: 'INV-COL-001', nombre: 'Colchón Ortopédico', caracteristica: 'Medida', sub_caracteristica: 'King', estado: 'Asignado', asignado_tipo: 'habitacion', asignado_a: '101', cantidad: 1, notas: 'Asignado a Suite Presidencial' },
    { codigo: 'INV-COL-002', nombre: 'Colchón Ortopédico', caracteristica: 'Medida', sub_caracteristica: 'Queen', estado: 'Asignado', asignado_tipo: 'habitacion', asignado_a: '201', cantidad: 1, notas: 'Habitación Matrimonial Piso 2' },
    { codigo: 'INV-COL-003', nombre: 'Colchón Ortopédico', caracteristica: 'Medida', sub_caracteristica: 'Individual', estado: 'Para Cambio', asignado_tipo: 'habitacion', asignado_a: '104', cantidad: 1, notas: 'Resortes desgastados, programado cambio de lote' },
    { codigo: 'INV-SEC-001', nombre: 'Secador de Cabello', caracteristica: 'Potencia', sub_caracteristica: '1800W Profesional', estado: 'Dañado', asignado_tipo: 'departamento', asignado_a: 'Mantenimiento', cantidad: 1, notas: 'Falso contacto en cable de alimentación' },
    { codigo: 'INV-AIR-001', nombre: 'Aire Acondicionado Split', caracteristica: 'Capacidad', sub_caracteristica: '18000 BTU', estado: 'Mantenimiento', asignado_tipo: 'habitacion', asignado_a: '302', cantidad: 1, notas: 'Mantenimiento preventivo de filtros y gas refrigerante' },
    { codigo: 'INV-TEL-001', nombre: 'Televisor Smart 4K', caracteristica: 'Pulgadas', sub_caracteristica: '55 Pulgadas', estado: 'Asignado', asignado_tipo: 'habitacion', asignado_a: '205', cantidad: 1, notas: 'Montaje en pared con soporte seguro' },
    { codigo: 'INV-RAD-001', nombre: 'Radio Transmisor Walkie Talkie', caracteristica: 'Banda', sub_caracteristica: 'UHF/VHF 5W', estado: 'Asignado', asignado_tipo: 'departamento', asignado_a: 'Seguridad', cantidad: 4, notas: 'Equipo de comunicación para turno de vigilancia' },
    { codigo: 'INV-ASP-001', nombre: 'Aspiradora Industrial', caracteristica: 'Uso', sub_caracteristica: 'Húmedo y Seco', estado: 'Mantenimiento', asignado_tipo: 'departamento', asignado_a: 'Limpieza', cantidad: 1, notas: 'En servicio técnico para sustitución de filtro HEPA' }
  ];

  for (const item of items) {
    await db.run(
      'INSERT INTO inventario (codigo, nombre, caracteristica, sub_caracteristica, estado, asignado_tipo, asignado_a, cantidad, notas) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [item.codigo, item.nombre, item.caracteristica, item.sub_caracteristica, item.estado, item.asignado_tipo, item.asignado_a, item.cantidad, item.notas]
    );
  }
}

async function setupDatabase() {
  if (pool) {
    try {
      await pool.query('SELECT 1');
      isPostgres = true;
      console.log('¡Conectado exitosamente a PostgreSQL (Supabase / Seenode)!');
      await initInventoryTable();
      return;
    } catch (error) {
      console.warn('Aviso: No se pudo conectar a PostgreSQL en la nube (' + error.message + ').');
      console.log('Activando base de datos SQLite local (hotel.sqlite)...');
    }
  }

  // Respaldo local usando SQLite
  try {
    const { DatabaseSync } = require('node:sqlite');
    const localDbPath = path.join(__dirname, 'hotel.sqlite');
    sqliteDb = new DatabaseSync(localDbPath);
    isPostgres = false;
    console.log('¡Conectado exitosamente a la base de datos local SQLite (hotel.sqlite)!');
    await initInventoryTable();
  } catch (sqliteErr) {
    console.error('Error fatal: No se pudo inicializar ninguna base de datos.', sqliteErr);
    throw sqliteErr;
  }
}

module.exports = {
  setupDatabase,
  getDb
};
