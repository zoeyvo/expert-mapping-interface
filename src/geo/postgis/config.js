const { Pool } = require('pg');

const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'expert_mapping',
  password: 'postgres',
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