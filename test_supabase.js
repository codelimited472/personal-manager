const url = 'https://pwdtsnuxaavyppkwdpak.supabase.co/rest/v1/vehicles';
const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB3ZHRzbnV4YWF2eXBwa3dkcGFrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEwMDYyNDEsImV4cCI6MjA5NjU4MjI0MX0.0FUfPHX4fRCQblKvokcWxPNJF854w3VCKWmukntMKFE';

async function run() {
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'apikey': key,
      'Authorization': `Bearer ${key}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation'
    },
    body: JSON.stringify({
      id: 'a8a8a8a8-a8a8-48a8-a8a8-a8a8a8a8a8a8',
      user_id: 'a8a8a8a8-a8a8-48a8-a8a8-a8a8a8a8a8a8', // mock valid uuid
      name: 'Test',
      registration_number: 'TEST-1234',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
  });
  const text = await res.text();
  console.log("Status:", res.status);
  console.log("Response:", text);
}

run();
