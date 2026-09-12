import { createClient } from '@supabase/supabase-js';

const supabaseUrl = '';
const supabaseAnonKey = '';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkReferences() {
  const incompleteIds = [
    '86070532-0bab-48a8-be1e-db10003a9c3e',
    'a77902bd-2d4d-4006-a9a8-a00918bf3414',
    '54eede35-97e4-4bb7-92cc-b93688069001',
    'fc89e8bb-3cc3-45e1-9a91-c596022f0052',
    '2c016ded-613f-4782-b981-9886da7176c2',
    '7f4a43f6-9d77-46a3-81ee-6560eae8b10c',
    '79c864fc-2ad7-4587-b62c-53493d2250b6',
    '42822414-ead6-44b4-a3ca-520c33cfa641',
    'a08165ce-0db1-402c-b2fd-820321b7dde1'
  ];

  for (const id of incompleteIds) {
    console.log(`Checking ID: ${id}`);
    const { data: b } = await supabase.from('bookings').select('id').or(`passenger_id.eq.${id},driver_id.eq.${id}`);
    const { data: p } = await supabase.from('passengers').select('id').eq('profile_id', id);
    const { data: d } = await supabase.from('drivers').select('id').eq('profile_id', id);
    console.log(`  Bookings: ${b?.length || 0}, Passengers: ${p?.length || 0}, Drivers: ${d?.length || 0}`);
  }
}

checkReferences();
