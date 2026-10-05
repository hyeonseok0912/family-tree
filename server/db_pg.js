import pkg from "pg";
const { Pool } = pkg;
// SQL DATE is a calendar date, not a timestamp.
pkg.types.setTypeParser(1082, value => value);
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  connectionTimeoutMillis: 10000,
  idleTimeoutMillis: 30000,
  max: 10,
});
export default pool;
