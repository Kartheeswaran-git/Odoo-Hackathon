import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase credentials in .env");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function seed() {
  console.log("Seeding data...");

  const parties = [
    { name: "Bharath", party_type: "Customer", phone: "9876543210", address: "Chennai" },
    { name: "Mukesh", party_type: "Supplier", phone: "8765432109", address: "Bangalore" },
    { name: "Karthees", party_type: "Customer", phone: "7654321098", address: "Hyderabad" },
    { name: "Kiruba", party_type: "Supplier", phone: "6543210987", address: "Mumbai" }
  ];

  for (const p of parties) {
    await supabase.from('module_records').insert({ module_name: 'parties', data: p });
  }

  const products = [
    { name: "Wooden Dining Table", code: "PROD-001", price: "12000", cost_price: "8000", quantity: "15", unit: "Units" },
    { name: "Office Desk", code: "PROD-002", price: "5500", cost_price: "3500", quantity: "30", unit: "Units" },
    { name: "Ergonomic Chair", code: "PROD-003", price: "8500", cost_price: "5000", quantity: "45", unit: "Units" },
    { name: "Teakwood Wardrobe", code: "PROD-004", price: "24000", cost_price: "16000", quantity: "10", unit: "Units" }
  ];

  for (const p of products) {
    await supabase.from('module_records').insert({ module_name: 'items', data: p });
  }

  console.log("Seeding complete!");
}

seed();
