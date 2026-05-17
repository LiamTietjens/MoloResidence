import { createClient } from '@supabase/supabase-js';

export const supabase = createClient(
  'https://nnioylxenaqnhgwdflrn.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5uaW95bHhlbmFxbmhnd2RmbHJuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg5NDM5MjIsImV4cCI6MjA5NDUxOTkyMn0.WJVMkabUSab7SduDmDmg_07XeOZ3lLQCxbI12YpBYcU'
);
