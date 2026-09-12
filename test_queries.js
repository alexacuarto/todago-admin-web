import { createClient } from '@supabase/supabase-js';

const supabaseUrl = '';
const supabaseAnonKey = '';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testQueries() {
  console.log("Fetching OpenAPI schema...");
  try {
    const res = await fetch(`${supabaseUrl}/rest/v1/`, {
      headers: {
        'apikey': supabaseAnonKey
      }
    });
    const schema = await res.json();
    console.log("Schema definitions keys:", Object.keys(schema.definitions || {}));
  } catch (e) {
    console.error("Error fetching schema:", e);
  }
}

testQueries();
