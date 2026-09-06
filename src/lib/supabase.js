import { createClient } from '@supabase/supabase-js';
const url=import.meta.env.VITE_SUPABASE_URL;
const anonKey=import.meta.env.VITE_SUPABASE_ANON_KEY;
export const backendConfigured=Boolean(url&&anonKey);
export const supabase=backendConfigured?createClient(url,anonKey,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}}):null;
export function subscribeToOperations(organizationId,onChange){
  if(!supabase||!organizationId)return()=>{};
  const channel=supabase.channel('parkops-live')
    .on('postgres_changes',{event:'*',schema:'public',table:'parking_tickets',filter:'organization_id=eq.'+organizationId},onChange)
    .on('postgres_changes',{event:'*',schema:'public',table:'payments',filter:'organization_id=eq.'+organizationId},onChange).subscribe();
  return()=>supabase.removeChannel(channel);
}
