// @ts-nocheck
const { createClient } = supabase;
const supabaseUrl = 'https://wrlcsqrorcnjvtmgmvtn.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndybGNzcXJvcmNuanZ0bWdtdnRuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjExNzU4NzEsImV4cCI6MjA3Njc1MTg3MX0.M14Uvo34OyZSdVAdgiuBced8_-FmU0MBxK3m_kxdgxs';
export const supabaseClient = createClient(supabaseUrl, supabaseKey);
