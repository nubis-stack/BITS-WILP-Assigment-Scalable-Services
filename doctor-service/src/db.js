const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_NAME || 'doctor_db',
  max: 10
});

const schema = `
CREATE TABLE IF NOT EXISTS doctors (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  specialization VARCHAR(60) NOT NULL,
  email VARCHAR(120) UNIQUE NOT NULL,
  phone VARCHAR(15),
  consultation_fee NUMERIC(8,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS slots (
  id SERIAL PRIMARY KEY,
  doctor_id INT NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
  slot_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  status VARCHAR(10) NOT NULL DEFAULT 'OPEN',
  UNIQUE (doctor_id, slot_date, start_time)
);
`;

// postgres container can take a few seconds to accept connections,
// so keep retrying for a while instead of crashing on first attempt
async function initDb(retries = 10) {
  for (let i = 1; i <= retries; i++) {
    try {
      await pool.query(schema);
      console.log('db ready');
      return;
    } catch (err) {
      console.log(`db not ready (attempt ${i}/${retries}): ${err.message}`);
      if (i === retries) throw err;
      await new Promise(r => setTimeout(r, 3000));
    }
  }
}

module.exports = { pool, initDb };
