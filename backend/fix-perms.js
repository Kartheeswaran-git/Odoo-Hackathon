import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function fix() {
  const { data: users } = await supabase.from('users').select('id');
  if (!users) return;
  for (const u of users) {
    await supabase.from('user_module_permissions').upsert({ user_id: u.id, module_name: 'bill_of_materials', can_view: true, can_create: true, can_edit: true, can_delete: true });
    await supabase.from('user_module_permissions').upsert({ user_id: u.id, module_name: 'manage_users', can_view: true, can_create: true, can_edit: true, can_delete: true });
    await supabase.from('user_module_permissions').upsert({ user_id: u.id, module_name: 'purchases', can_view: true, can_create: true, can_edit: true, can_delete: true });
    await supabase.from('user_module_permissions').upsert({ user_id: u.id, module_name: 'manufacturing', can_view: true, can_create: true, can_edit: true, can_delete: true });
  }
  console.log('Permissions fixed!');
}
fix();
