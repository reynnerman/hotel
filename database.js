require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

// Función de ayuda para convertir el formato de variables de SQLite (?) a PostgreSQL ($1, $2...)
function convertSql(sql) {
  let index = 1;
  return sql.replace(/\?/g, () => `$${index++}`);
}

// Objeto "Mock" que imita la librería de SQLite pero usa pg por debajo
const db = {
  get: async (sql, params = []) => {
    const res = await pool.query(convertSql(sql), params);
    return res.rows[0]; // SQLite db.get devuelve el primer resultado
  },
  all: async (sql, params = []) => {
    const res = await pool.query(convertSql(sql), params);
    return res.rows; // SQLite db.all devuelve todos
  },
  run: async (sql, params = []) => {
    // BEGIN TRANSACTION / COMMIT / ROLLBACK los pasamos directamente
    if (sql.trim().toUpperCase() === 'BEGIN TRANSACTION') sql = 'BEGIN';
    const res = await pool.query(convertSql(sql), params);
    return { changes: res.rowCount }; // SQLite db.run devuelve object con 'changes'
  },
  prepare: async (sql) => {
    // Imita la función prepare de SQLite
    const convertedSql = convertSql(sql);
    return {
      run: async (params = []) => {
        return await pool.query(convertedSql, params);
      },
      finalize: async () => {}
    };
  }
};

async function getDb() {
  return db;
}

async function setupDatabase() {
  try {
    // Hacemos un ping a la base de datos para asegurar conexión
    await pool.query('SELECT 1');
    console.log("¡Conectado exitosamente a PostgreSQL (Supabase)!");
  } catch (error) {
    console.error("Error fatal: No se pudo conectar a Supabase.", error);
    throw error;
  }
}

module.exports = {
  setupDatabase,
  getDb
};
