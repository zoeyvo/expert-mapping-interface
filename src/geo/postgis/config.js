const { Pool } = require('pg');

const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'emi_experts',
  password: 'emisecrets',
  port: 5432,
});

module.exports = {
  pool,
  // Common table names
  tables: {
    researchers: 'researchers',
    locations: 'locations',
    works: 'works'
  }
}; 