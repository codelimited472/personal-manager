import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://pwdtsnuxaavyppkwdpak.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB3ZHRzbnV4YWF2eXBwa3dkcGFrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEwMDYyNDEsImV4cCI6MjA5NjU4MjI0MX0.0FUfPHX4fRCQblKvokcWxPNJF854w3VCKWmukntMKFE'
);

async function checkTasks() {
  // Try to insert a dummy task to see if it fails due to unknown columns
  const dummyTask = {
    id: 'dummy-1234',
    user_id: 'dummy-user',
    workspace_id: 'dummy-ws',
    title: 'Test',
    description: 'Test',
    due_date: '2023-01-01',
    priority: 'low',
    category: 'test',
    status: 'pending',
    is_recurring: false,
    recurrence_rule: '',
    completed_at: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  const { data, error } = await supabase.from('tasks').upsert(dummyTask, { onConflict: 'id' });
  if (error) {
    console.error('Error upserting task:', error);
  } else {
    console.log('Upsert succeeded.');
    await supabase.from('tasks').delete().eq('id', 'dummy-1234');
  }
}

checkTasks();
