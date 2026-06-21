const { Client } = require('pg');

const client = new Client({
  connectionString: 'postgresql://postgres.xeztdeerosdrfwowbixi:Odoo@2026ERP@aws-0-ap-south-1.pooler.supabase.com:6543/postgres'
});

async function run() {
  await client.connect();
  console.log("Connected to DB!");
  try {
    await client.query("ALTER TABLE public.users ADD COLUMN email TEXT;");
    console.log("Added email column");
  } catch(e) { console.error(e.message); }
  try {
    await client.query("ALTER TABLE public.users ADD COLUMN phone TEXT;");
    console.log("Added phone column");
  } catch(e) { console.error(e.message); }
  try {
    await client.query("ALTER TABLE public.users ADD COLUMN address TEXT;");
    console.log("Added address column");
  } catch(e) { console.error(e.message); }
  await client.end();
}
run();
