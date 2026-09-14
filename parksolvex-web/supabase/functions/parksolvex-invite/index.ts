import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';
const cors={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'authorization, x-client-info, apikey, content-type'};
const json=(b:unknown,s=200)=>new Response(JSON.stringify(b),{status:s,headers:{...cors,'content-type':'application/json'}});
const clean=(v:unknown)=>String(v??'').trim();
Deno.serve(async(req)=>{
 if(req.method==='OPTIONS')return new Response('ok',{headers:cors});
 try{
  const url=Deno.env.get('SUPABASE_URL')!,anon=Deno.env.get('SUPABASE_ANON_KEY')!,service=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const auth=req.headers.get('authorization')||'';if(!auth.startsWith('Bearer '))return json({error:'Unauthorized'},401);
  const uc=createClient(url,anon,{global:{headers:{Authorization:auth}}});const {data:{user}}=await uc.auth.getUser();if(!user)return json({error:'Unauthorized'},401);
  const admin=createClient(url,service,{auth:{persistSession:false,autoRefreshToken:false}});const body=await req.json();const orgId=clean(body.organization_id),email=clean(body.email).toLowerCase(),role=clean(body.role)||'operador';
  const {data:po}=await admin.from('platform_owners').select('user_id').eq('user_id',user.id).eq('active',true).maybeSingle();
  if(!po){const {data:m}=await admin.from('usuario_organizaciones').select('rol').eq('cliente_id',orgId).eq('user_id',user.id).eq('activo',true).maybeSingle();if(!m||!['owner','admin'].includes(m.rol))return json({error:'Forbidden'},403)}
  if(!email)return json({error:'Correo obligatorio'},400);if(!['admin','supervisor','operador','auditor'].includes(role))return json({error:'Rol inválido'},400);
  const {data:lic}=await admin.from('licencias').select('max_usuarios').eq('cliente_id',orgId).eq('estado','activa').order('creado_en',{ascending:false}).limit(1).maybeSingle();const {count}=await admin.from('usuario_organizaciones').select('*',{count:'exact',head:true}).eq('cliente_id',orgId).eq('activo',true);if(lic&&Number(count||0)>=Number(lic.max_usuarios||10))return json({error:'Se alcanzó el máximo de usuarios permitido por la licencia'},403);
  let found:any=null;for(let page=1;page<=20&&!found;page++){const {data}=await admin.auth.admin.listUsers({page,perPage:100});found=(data.users||[]).find((u:any)=>String(u.email||'').toLowerCase()===email);if((data.users||[]).length<100)break}
  let target=found;if(!target){const invite=await admin.auth.admin.inviteUserByEmail(email,{redirectTo:'https://jebernalc.github.io/PARQUEADEROS/admin/activate.html',data:{parksolvex_org:orgId,parksolvex_role:role,display_name:clean(body.name)}});if(invite.error)throw invite.error;target=invite.data.user}
  await admin.from('usuario_organizaciones').upsert({cliente_id:orgId,user_id:target.id,rol:role,nombre:clean(body.name)||email,celular:clean(body.phone)||null,activo:true},{onConflict:'cliente_id,user_id'});
  await admin.from('usuario_sedes').update({activo:false}).eq('cliente_id',orgId).eq('user_id',target.id);for(const sid of (Array.isArray(body.site_ids)?body.site_ids:[])){const id=clean(sid);const {data:s}=await admin.from('sedes').select('id').eq('cliente_id',orgId).eq('id',id).eq('activa',true).maybeSingle();if(s)await admin.from('usuario_sedes').upsert({cliente_id:orgId,sede_id:id,user_id:target.id,activo:true},{onConflict:'cliente_id,sede_id,user_id'})}
  return json({ok:true,user_id:target.id,email,role,invited:!found,activation_url:'https://jebernalc.github.io/PARQUEADEROS/admin/activate.html'});
 }catch(e){return json({error:e instanceof Error?e.message:'Internal error'},500)}
});