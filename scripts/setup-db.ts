import { neon } from '@neondatabase/serverless';
import { readFileSync } from 'fs';
import { join } from 'path';

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error('DATABASE_URL environment variable is required');
    process.exit(1);
  }

  const sql = neon(databaseUrl);
  const schema = readFileSync(join(__dirname, 'setup-db.sql'), 'utf-8');

  // Split by semicolons and execute each statement
  const statements = schema.split(';').map(s => s.trim()).filter(Boolean);

  for (const statement of statements) {
    console.log('Executing:', statement.substring(0, 60) + '...');
    await sql.query(statement);
  }

  console.log('Database setup complete!');
}

main().catch((err) => {
  console.error('Setup failed:', err);
  process.exit(1);
});
