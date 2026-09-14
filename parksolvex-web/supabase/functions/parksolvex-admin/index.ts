import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';

const cors={
  'Access-Control-Allow-Origin':'*',
  'Access-Control-Allow-Headers':'authorization, x-client-info, apikey, content-type',
};
const json=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:{...cors,'content-type':'application/json'}});
const clean=(v:unknown)=>String(v??'').trim();
const phone=(v:unknown)=>clean(v).replace(/[^0-9+]/g,'');
const ALLOWED_ROLES=['owner','admin','supervisor','operador','auditor'];

Deno.serve(async(req)=>{
  if(req.method==='OPTIONS')return new Response('ok',{headers:cors});
  try{
    const url=Deno.env.get('SUPABASE_URL')!;
    const anon=Deno.env.get('SUPABASE_ANON_KEY')!;
    const service=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const auth=req.headers.get('authorization')||'';
    if(!auth.startsWith('Bearer '))return json({error:'Unauthorized'},401);
    const userClient=createClient(url,anon,{global:{headers:{Authorization:auth}}});
    const {data:{user},error:userError}=await userClient.auth.getUser();
    if(userError||!user)return json({error:'Unauthorized'},401);
    const admin=createClient(url,service,{auth:{persistSession:false,autoRefreshToken:false}});
    const body=await req.json();
    const action=clean(body.action);
    const {data:platformOwner}=await admin.from('platform_owners').select('user_id').eq('user_id',user.id).eq('active',true).maybeSingle();

    const membership=async(orgId:string)=>{
      if(platformOwner)return {rol:'platform_owner',activo:true};
      const {data,error}=await admin.from('usuario_organizaciones').select('rol,activo').eq('cliente_id',orgId).eq('user_id',user.id).eq('activo',true).maybeSingle();
      if(error)throw error;
      return data;
    };
    const requireOrg=async(orgId:string,roles:string[])=>{
      const m=await membership(orgId);
      if(platformOwner)return 'platform_owner';
      if(!m||!roles.includes(m.rol))throw Object.assign(new Error('No tienes permisos para esta acción'),{status:403});
      return m.rol;
    };
    const assignedSites=async(orgId:string,uid:string)=>{
      const {data,error}=await admin.from('usuario_sedes').select('sede_id').eq('cliente_id',orgId).eq('user_id',uid).eq('activo',true);
      if(error)throw error;
      return (data||[]).map((x:any)=>x.sede_id);
    };
    const requireSite=async(orgId:string,siteId:string,roles:string[])=>{
      const role=await requireOrg(orgId,roles);
      if(platformOwner||role==='owner'||role==='admin')return;
      const sites=await assignedSites(orgId,user.id);
      if(!sites.includes(siteId))throw Object.assign(new Error('No estás asignado a esta sede'),{status:403});
    };
    const findOrInvite=async(email:string,metadata:any={})=>{
      const normalized=email.toLowerCase();let found:any=null;
      for(let page=1;page<=20&&!found;page++){
        const {data,error}=await admin.auth.admin.listUsers({page,perPage:100});if(error)throw error;
        found=(data.users||[]).find((u:any)=>String(u.email||'').toLowerCase()===normalized);
        if((data.users||[]).length<100)break;
      }
      if(found)return found;
      const invite=await admin.auth.admin.inviteUserByEmail(normalized,{data:metadata});
      if(invite.error)throw invite.error;
      return invite.data.user;
    };
    const setUserSites=async(orgId:string,uid:string,siteIds:string[])=>{
      await admin.from('usuario_sedes').update({activo:false}).eq('cliente_id',orgId).eq('user_id',uid);
      for(const sid of siteIds){
        const {data:site}=await admin.from('sedes').select('id').eq('id',sid).eq('cliente_id',orgId).eq('activa',true).maybeSingle();
        if(!site)continue;
        await admin.from('usuario_sedes').upsert({cliente_id:orgId,sede_id:sid,user_id:uid,activo:true},{onConflict:'cliente_id,sede_id,user_id'});
      }
    };

    if(action==='bootstrap'){
      if(platformOwner){
        const {data,error}=await admin.from('clientes').select('id,nombre_negocio,contacto,celular,email,estado,sedes(id,nombre,codigo,activa,direccion,telefono,nit)').order('creado_en',{ascending:false});if(error)throw error;
        return json({platform_owner:true,user:{id:user.id,email:user.email},organizations:data||[]});
      }
      const {data,error}=await admin.from('usuario_organizaciones').select('cliente_id,rol,nombre,celular,activo,clientes(id,nombre_negocio,contacto,celular,email,estado)').eq('user_id',user.id).eq('activo',true);if(error)throw error;
      const out=[];
      for(const m of data||[]){
        const {data:sites}=await admin.from('sedes').select('id,nombre,codigo,activa,direccion,telefono,nit').eq('cliente_id',m.cliente_id).eq('activa',true).order('created_at');
        let permitted=sites||[];
        if(!['owner','admin'].includes(m.rol)){
          const ids=await assignedSites(m.cliente_id,user.id);permitted=(sites||[]).filter((s:any)=>ids.includes(s.id));
        }
        out.push({...m,sites:permitted});
      }
      return json({platform_owner:false,user:{id:user.id,email:user.email},organizations:out});
    }

    if(action==='dashboard'){
      const orgId=clean(body.organization_id),siteId=clean(body.site_id);if(!orgId||!siteId)return json({error:'organization_id y site_id son obligatorios'},400);
      await requireSite(orgId,siteId,ALLOWED_ROLES);
      const [entries,monthly,closures,shifts,config,rates,methods,devices]=await Promise.all([
        admin.from('ingresos_parqueadero').select('*').eq('sede_id',siteId).order('entrada_at',{ascending:false}).limit(1000),
        admin.from('mensualidades_parqueadero').select('*').eq('sede_id',siteId).order('hasta',{ascending:false}).limit(500),
        admin.from('cierres_caja').select('*').eq('sede_id',siteId).order('fecha_hasta',{ascending:false}).limit(100),
        admin.from('turnos_operacion').select('*').eq('sede_id',siteId).order('inicio_at',{ascending:false}).limit(100),
        admin.from('configuracion_parqueadero').select('*').eq('sede_id',siteId).maybeSingle(),
        admin.from('tarifas_parqueadero').select('*').eq('sede_id',siteId).order('tipo_vehiculo'),
        admin.from('medios_pago_parqueadero').select('*').eq('sede_id',siteId).order('orden'),
        admin.from('dispositivos').select('*').eq('sede_id',siteId).order('created_at')
      ]);
      return json({entries:entries.data||[],monthly:monthly.data||[],closures:closures.data||[],shifts:shifts.data||[],config:config.data||null,rates:rates.data||[],payment_methods:methods.data||[],devices:devices.data||[]});
    }

    if(action==='list_users'){
      const orgId=clean(body.organization_id);await requireOrg(orgId,['owner','admin','supervisor','auditor']);
      const {data,error}=await admin.from('usuario_organizaciones').select('*').eq('cliente_id',orgId).order('created_at');if(error)throw error;
      const users=[];
      for(const m of data||[]){const u=await admin.auth.admin.getUserById(m.user_id);users.push({...m,email:u.data.user?.email||'',site_ids:await assignedSites(orgId,m.user_id)});}
      return json({users});
    }

    if(action==='invite_user'){
      const orgId=clean(body.organization_id),email=clean(body.email).toLowerCase(),role=clean(body.role)||'operador';await requireOrg(orgId,['owner','admin']);
      if(!email)return json({error:'Correo obligatorio'},400);if(!ALLOWED_ROLES.includes(role)||role==='owner')return json({error:'Rol inválido'},400);
      const {data:lic}=await admin.from('licencias').select('max_usuarios').eq('cliente_id',orgId).eq('estado','activa').order('creado_en',{ascending:false}).limit(1).maybeSingle();
      const {count}=await admin.from('usuario_organizaciones').select('*',{count:'exact',head:true}).eq('cliente_id',orgId).eq('activo',true);
      if(lic&&Number(count||0)>=Number(lic.max_usuarios||10))return json({error:'Se alcanzó el máximo de usuarios permitido por la licencia'},403);
      const u=await findOrInvite(email,{parksolvex_org:orgId,parksolvex_role:role,display_name:clean(body.name)});
      const {error}=await admin.from('usuario_organizaciones').upsert({cliente_id:orgId,user_id:u.id,rol:role,nombre:clean(body.name)||email,celular:phone(body.phone)||null,activo:true},{onConflict:'cliente_id,user_id'});if(error)throw error;
      const siteIds=Array.isArray(body.site_ids)?body.site_ids.map(clean).filter(Boolean):[];await setUserSites(orgId,u.id,siteIds);
      return json({ok:true,user_id:u.id,email,role,site_ids:siteIds});
    }

    if(action==='set_user'){
      const orgId=clean(body.organization_id),uid=clean(body.user_id);await requireOrg(orgId,['owner','admin']);if(!uid)return json({error:'user_id obligatorio'},400);
      const updates:any={};if(body.role!==undefined){const r=clean(body.role);if(!ALLOWED_ROLES.includes(r)||r==='owner')return json({error:'Rol inválido'},400);updates.rol=r;}if(body.active!==undefined)updates.activo=!!body.active;if(body.name!==undefined)updates.nombre=clean(body.name);if(body.phone!==undefined)updates.celular=phone(body.phone);
      if(Object.keys(updates).length){const {error}=await admin.from('usuario_organizaciones').update(updates).eq('cliente_id',orgId).eq('user_id',uid);if(error)throw error;}
      if(Array.isArray(body.site_ids))await setUserSites(orgId,uid,body.site_ids.map(clean).filter(Boolean));
      return json({ok:true});
    }

    if(action==='create_site'){
      const orgId=clean(body.organization_id);await requireOrg(orgId,['owner','admin']);
      const {data:lic}=await admin.from('licencias').select('max_sedes').eq('cliente_id',orgId).eq('estado','activa').order('creado_en',{ascending:false}).limit(1).maybeSingle();
      const {count}=await admin.from('sedes').select('*',{count:'exact',head:true}).eq('cliente_id',orgId).eq('activa',true);
      if(lic&&Number(count||0)>=Number(lic.max_sedes||1))return json({error:'Se alcanzó el máximo de sedes permitido por la licencia'},403);
      const {data:s,error}=await admin.from('sedes').insert({cliente_id:orgId,nombre:clean(body.name)||'Nueva sede',codigo:clean(body.code)||null,direccion:clean(body.address)||null,telefono:phone(body.phone)||null,nit:clean(body.nit)||null}).select().single();if(error)throw error;
      await admin.from('configuracion_parqueadero').insert({cliente_id:orgId,sede_id:s.id,nombre:s.nombre,telefono:s.telefono});
      const defaults:any={carro:[200,22000,180000],moto:[140,11000,90000],bicicleta:[10,3000,35000],patineta:[10,3000,35000]};for(const [tipo,v] of Object.entries(defaults) as any)await admin.from('tarifas_parqueadero').insert({cliente_id:orgId,sede_id:s.id,tipo_vehiculo:tipo,valor_minuto:v[0],tope_dia:v[1],mensualidad:v[2]});
      const methods:any=[['efectivo','Efectivo en caja',true],['nequi','Nequi',true],['daviplata','Daviplata',true],['breb','Bre-B',true],['pse','PSE / botón de pago',false],['transferencia','Transferencia bancaria',false],['qr','Código QR Bancolombia',false]];for(let i=0;i<methods.length;i++)await admin.from('medios_pago_parqueadero').insert({cliente_id:orgId,sede_id:s.id,codigo:methods[i][0],nombre:methods[i][1],activo:methods[i][2],orden:(i+1)*10});
      return json({ok:true,site:s});
    }

    if(action==='update_site'){
      const orgId=clean(body.organization_id),siteId=clean(body.site_id);await requireOrg(orgId,['owner','admin']);
      const updates:any={};for(const [src,dst] of [['name','nombre'],['code','codigo'],['address','direccion'],['phone','telefono'],['nit','nit']] as any)if(body[src]!==undefined)updates[dst]=clean(body[src])||null;if(body.active!==undefined)updates.activa=!!body.active;
      const {data,error}=await admin.from('sedes').update(updates).eq('cliente_id',orgId).eq('id',siteId).select().single();if(error)throw error;return json({ok:true,site:data});
    }

    if(action==='save_site_configuration'){
      const orgId=clean(body.organization_id),siteId=clean(body.site_id);await requireOrg(orgId,['owner','admin']);
      const c=body.config||{};const {error}=await admin.from('configuracion_parqueadero').upsert({cliente_id:orgId,sede_id:siteId,nombre:clean(c.nombre)||'Parqueadero',nit:clean(c.nit)||null,direccion:clean(c.direccion)||null,telefono:clean(c.telefono)||null,prefijo:clean(c.prefijo)||'PQ-',gracia_min:Number(c.gracia_min||0),redondeo:Number(c.redondeo||50),recarga:c.recarga||{},plantilla_ingreso:clean(c.plantilla_ingreso)||null,plantilla_pago:clean(c.plantilla_pago)||null,raw_cfg:c},{onConflict:'sede_id'});if(error)throw error;
      if(Array.isArray(body.rates))for(const r of body.rates){await admin.from('tarifas_parqueadero').upsert({cliente_id:orgId,sede_id:siteId,tipo_vehiculo:clean(r.tipo_vehiculo),valor_minuto:Number(r.valor_minuto||0),tope_dia:Number(r.tope_dia||0),mensualidad:Number(r.mensualidad||0),activa:r.activa!==false,raw_tarifa:r},{onConflict:'sede_id,tipo_vehiculo'});}
      if(Array.isArray(body.payment_methods))for(let i=0;i<body.payment_methods.length;i++){const m=body.payment_methods[i];await admin.from('medios_pago_parqueadero').upsert({cliente_id:orgId,sede_id:siteId,codigo:clean(m.codigo),nombre:clean(m.nombre),activo:m.activo!==false,dato:clean(m.dato)||null,enlace:clean(m.enlace)||null,key_type:clean(m.key_type)||null,holder:clean(m.holder)||null,orden:Number(m.orden||(i+1)*10),metadata:m},{onConflict:'sede_id,codigo'});}
      return json({ok:true});
    }

    if(action==='open_turn'){
      const orgId=clean(body.organization_id),siteId=clean(body.site_id);await requireSite(orgId,siteId,['owner','admin','supervisor','operador']);
      const {data:open}=await admin.from('turnos_operacion').select('id').eq('cliente_id',orgId).eq('sede_id',siteId).eq('user_id',user.id).eq('estado','abierto').maybeSingle();if(open)return json({error:'Ya tienes un turno abierto en esta sede'},409);
      const {data,error}=await admin.from('turnos_operacion').insert({cliente_id:orgId,sede_id:siteId,user_id:user.id,apertura_caja:Number(body.opening_cash||0),notas:clean(body.notes)||null}).select().single();if(error)throw error;return json({ok:true,shift:data});
    }

    if(action==='close_turn'){
      const orgId=clean(body.organization_id),siteId=clean(body.site_id),shiftId=clean(body.shift_id);await requireSite(orgId,siteId,['owner','admin','supervisor','operador']);
      let q:any=admin.from('turnos_operacion').update({fin_at:new Date().toISOString(),estado:'cerrado',cierre_caja:body.closing_cash==null?null:Number(body.closing_cash),notas:clean(body.notes)||null}).eq('cliente_id',orgId).eq('sede_id',siteId).eq('id',shiftId);if(!platformOwner){const role=await requireOrg(orgId,['owner','admin','supervisor','operador']);if(!['owner','admin','supervisor'].includes(role))q=q.eq('user_id',user.id);}const {data,error}=await q.select().single();if(error)throw error;return json({ok:true,shift:data});
    }

    return json({error:'Unknown action'},400);
  }catch(e:any){console.error(e);return json({error:e instanceof Error?e.message:'Internal error'},Number(e?.status)||500);}
});