import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
async function run() {
  const { data, error } = await supabase.from('module_records').select('*').limit(1);
  if (error) console.log(error);
  // Can't directly query pg_policies via postgrest. Let's just create an admin client to insert.
}
run();
