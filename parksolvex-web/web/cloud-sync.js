(()=>{
'use strict';
const SUPABASE_URL='https://epadzsrfsvckyjugcvpd.supabase.co';
const PUBLISHABLE_KEY='sb_publishable_PxFa4vMqovqCIDOwEsoiBQ_2q2jETc_';
const LICENSE_KEY='parkops.web.license_key';
const DEVICE_KEY='parkops.web.device_id';
const CURSOR_KEY='parksolvex.web.sync.cursor';
const HASH_KEY='parksolvex.web.sync.hash';
const KEYS={cfg:'pqe_cfg',tarifas:'pqe_tarifas',clientes:'pqe_clientes',ingresos:'pqe_ingresos',mensualidades:'pqe_mens'};
let busy=false;
const read=(k,d)=>{try{return JSON.parse(localStorage.getItem(k)||JSON.stringify(d))}catch{return d}};
const write=(k,v)=>localStorage.setItem(k,JSON.stringify(v));
const snapshot=()=>({cfg:read(KEYS.cfg,{}),tarifas:read(KEYS.tarifas,{}),clientes:read(KEYS.clientes,[]),ingresos:read(KEYS.ingresos,[]),mensualidades:read(KEYS.mensualidades,[])});
const stable=x=>JSON.stringify(x);
async function call(action,extra={}){
  const license_key=localStorage.getItem(LICENSE_KEY)||'';
  const device_id=localStorage.getItem(DEVICE_KEY)||'';
  if(!license_key||!device_id)throw new Error('PARKSOLVEX Web no está activado');
  const r=await fetch(`${SUPABASE_URL}/functions/v1/parkops-master`,{method:'POST',headers:{'content-type':'application/json','apikey':PUBLISHABLE_KEY},body:JSON.stringify({action,license_key,device_id,app_version:'1.5.3-web',...extra})});
  const data=await r.json().catch(()=>({}));
  if(!r.ok||data.error)throw new Error(data.error||`HTTP ${r.status}`);
  return data;
}
function mergeBy(local,remote,key,preferRemote){const m=new Map((local||[]).map(x=>[key(x),x]));for(const r of remote||[]){const k=key(r);if(!k)continue;const l=m.get(k);m.set(k,!l||preferRemote(l,r)?r:l)}return [...m.values()]}
function fromCloud(data){
  if(data.config){const raw=data.config.raw_cfg||{};const methods=(data.payment_methods||[]).map(m=>m.metadata&&Object.keys(m.metadata).length?m.metadata:{id:m.codigo,n:m.nombre,on:m.activo,dato:m.dato||'',link:m.enlace||'',app:m.app_package||undefined,keyType:m.key_type||'',holder:m.holder||''});write(KEYS.cfg,{...read(KEYS.cfg,{}),...raw,medios:methods.length?methods:(raw.medios||read(KEYS.cfg,{}).medios)});}
  if(Array.isArray(data.rates)&&data.rates.length){const t={...read(KEYS.tarifas,{})};for(const r of data.rates)t[r.tipo_vehiculo]=r.raw_tarifa&&Object.keys(r.raw_tarifa).length?r.raw_tarifa:{min:Number(r.valor_minuto||0),dia:Number(r.tope_dia||0),mes:Number(r.mensualidad||0)};write(KEYS.tarifas,t)}
  const rc=(data.customers||[]).map(x=>x.metadata&&Object.keys(x.metadata).length?x.metadata:{placa:x.placa,nombre:x.nombre||'',celular:x.celular||'',tipo:x.tipo_vehiculo||''});
  if(rc.length)write(KEYS.clientes,mergeBy(read(KEYS.clientes,[]),rc,x=>String(x.placa||'').toUpperCase(),()=>true));
  const rm=(data.monthly||[]).map(x=>x.metadata&&Object.keys(x.metadata).length?x.metadata:{placa:x.placa,desde:x.desde,hasta:x.hasta,valor:Number(x.valor||0),incluyeRecarga:!!x.incluye_recarga,tipo:x.tipo_vehiculo||'',nombre:x.nombre||'',celular:x.celular||''});
  if(rm.length)write(KEYS.mensualidades,mergeBy(read(KEYS.mensualidades,[]),rm,x=>`${String(x.placa||'').toUpperCase()}|${x.desde||''}|${x.hasta||''}`,()=>true));
  const ri=(data.entries||[]).map(x=>x.raw_record&&Object.keys(x.raw_record).length?x.raw_record:{id:x.local_id||x.id,recibo:x.recibo,placa:x.placa,tipo:x.tipo_vehiculo,electrico:!!x.electrico,kwh:Number(x.kwh||0),nombre:x.nombre||'',celular:x.celular||'',obs:x.observaciones||'',entrada:new Date(x.entrada_at).getTime(),salida:x.salida_at?new Date(x.salida_at).getTime():null,valor:x.valor_total==null?null:Number(x.valor_total),valorParqueo:x.valor_parqueo==null?null:Number(x.valor_parqueo),valorRecarga:x.valor_recarga==null?null:Number(x.valor_recarga),medio:x.medio_pago||null,operario:x.operario||''});
  if(ri.length)write(KEYS.ingresos,mergeBy(read(KEYS.ingresos,[]),ri,x=>String(x.recibo||''),(l,r)=>!!r.salida&&!l.salida));
}
async function sync(force=false){
  if(busy||navigator.onLine===false)return false;
  if(!localStorage.getItem(LICENSE_KEY)||!localStorage.getItem(DEVICE_KEY))return false;
  busy=true;
  try{
    const snap=snapshot(),hash=stable(snap),last=localStorage.getItem(HASH_KEY)||'';
    if(force||hash!==last){await call('sync_push',{payload:snap});localStorage.setItem(HASH_KEY,hash)}
    const since=localStorage.getItem(CURSOR_KEY)||'';
    const pulled=await call('sync_pull',{since});fromCloud(pulled);if(pulled.cursor)localStorage.setItem(CURSOR_KEY,pulled.cursor);
    window.dispatchEvent(new CustomEvent('parksolvex:sync',{detail:{ok:true,cursor:pulled.cursor}}));return true;
  }catch(e){window.dispatchEvent(new CustomEvent('parksolvex:sync',{detail:{ok:false,error:String(e?.message||e)}}));return false}
  finally{busy=false}
}
async function bootstrap(){try{const x=await call('device_bootstrap');window.dispatchEvent(new CustomEvent('parksolvex:bootstrap',{detail:x}));await sync(true);return x}catch{return null}}
window.ParkSolvexCloud={sync,bootstrap,snapshot,version:'1.0.0'};
window.addEventListener('online',()=>setTimeout(()=>sync(true),500));
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(bootstrap,900));else setTimeout(bootstrap,900);
setInterval(()=>sync(false),15000);
})();
