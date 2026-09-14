(()=>{
'use strict';
const VERSION='1.5.3-web';
const SUPABASE_URL='https://epadzsrfsvckyjugcvpd.supabase.co';
const PUBLISHABLE_KEY='sb_publishable_PxFa4vMqovqCIDOwEsoiBQ_2q2jETc_';
const DEVICE_KEY='parkops.web.device_id';
const LICENSE_KEY='parkops.web.license_key';
const EXPIRES_KEY='parkops.web.expires_at';
const CUSTOMER_KEY='parkops.web.customer_name';

function storageAvailable(){
  try{const k='__parkops_web_test__';localStorage.setItem(k,'1');localStorage.removeItem(k);return true}catch{return false}
}
const persistent=storageAvailable();
function getDeviceId(){
  if(!persistent)return 'WEB-NO-STORAGE';
  let id=localStorage.getItem(DEVICE_KEY);
  if(!id){
    const raw=(globalThis.crypto&&crypto.randomUUID)?crypto.randomUUID():`${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`;
    id='WEB-'+raw.toUpperCase();
    localStorage.setItem(DEVICE_KEY,id);
  }
  return id;
}
function expiryDate(value){
  const raw=String(value||'').trim();
  if(!raw)return null;
  if(/^\d{4}-\d{2}-\d{2}$/.test(raw))return new Date(raw+'T23:59:59');
  const d=new Date(raw);return Number.isNaN(d.getTime())?null:d;
}
function validLocal(){
  if(!persistent)return false;
  const key=localStorage.getItem(LICENSE_KEY)||'';
  const exp=expiryDate(localStorage.getItem(EXPIRES_KEY)||'');
  return !!key&&!!exp&&Date.now()<=exp.getTime();
}
function esc(s){return String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));}
async function copyText(text){
  try{if(navigator.clipboard&&window.isSecureContext){await navigator.clipboard.writeText(text);return true}}catch{}
  const t=document.createElement('textarea');t.value=text;t.style.position='fixed';t.style.opacity='0';document.body.appendChild(t);t.select();let ok=false;try{ok=document.execCommand('copy')}catch{}t.remove();return ok;
}
function removeGate(){document.getElementById('parkops-web-license-gate')?.remove();document.documentElement.style.removeProperty('overflow')}
function gateMessage(msg,isError=false){const e=document.getElementById('parkops-web-msg');if(!e)return;e.textContent=msg||'';e.style.color=isError?'#ff8d8d':'#ffcf66'}
async function activateLicense(key){
  if(!persistent)throw new Error('Este navegador no permite almacenamiento local. Activa cookies/almacenamiento del sitio o usa una ventana normal.');
  if(navigator.onLine===false)throw new Error('Necesitas conexión a internet para activar la licencia por primera vez.');
  const device_id=getDeviceId();
  const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),20000);
  try{
    const r=await fetch(`${SUPABASE_URL}/functions/v1/parkops-master`,{
      method:'POST',signal:controller.signal,
      headers:{'Content-Type':'application/json','apikey':PUBLISHABLE_KEY},
      body:JSON.stringify({action:'activate_license',license_key:String(key||'').trim(),device_id})
    });
    let data={};try{data=await r.json()}catch{}
    if(!r.ok||!data.ok)throw new Error(data.error||`No fue posible activar la licencia (${r.status})`);
    if(!data.expires_at)throw new Error('La licencia fue validada pero no devolvió fecha de vencimiento. Contacta al administrador.');
    localStorage.setItem(LICENSE_KEY,String(key||'').trim());
    localStorage.setItem(EXPIRES_KEY,String(data.expires_at));
    localStorage.setItem(CUSTOMER_KEY,String(data.customer_name||'CLIENTE'));
    return data;
  }finally{clearTimeout(timer)}
}
function showGate(){
  if(document.getElementById('parkops-web-license-gate'))return;
  document.documentElement.style.overflow='hidden';
  const deviceId=getDeviceId();
  const d=document.createElement('div');d.id='parkops-web-license-gate';
  d.style.cssText='position:fixed;inset:0;z-index:2147483647;background:#14171c;color:#f3f5f7;font-family:Arial,sans-serif;display:flex;min-height:100vh;align-items:center;justify-content:center;padding:24px;overflow:auto';
  d.innerHTML=`<div style="width:min(620px,100%);background:#1c2128;border:1px solid #343b44;border-radius:20px;padding:28px;box-shadow:0 20px 60px #0008">
    <div style="color:#5fd38d;font-weight:800">SOLVEX SYSTEM JB</div>
    <h1 style="margin:0 0 8px;font-size:28px">Activación PARKOPS Web</h1>
    <p style="color:#a9b2bd;line-height:1.5">Esta instalación web requiere una licencia única vinculada a este navegador. Copia el ID, envíalo al administrador y pega la licencia recibida.</p>
    <div style="color:#a9b2bd">ID DEL NAVEGADOR</div>
    <div id="parkops-web-device" style="margin:20px 0;background:#11151a;border:1px solid #343b44;border-radius:12px;padding:14px;font-family:monospace;word-break:break-all;font-size:16px">${esc(deviceId)}</div>
    <button id="parkops-web-copy" style="width:100%;border:1px solid #46505c;border-radius:12px;padding:14px 16px;font-size:16px;font-weight:700;cursor:pointer;background:#2a313a;color:#fff">Copiar ID del navegador</button>
    <label style="color:#a9b2bd;display:block;margin-top:20px">LICENCIA</label>
    <textarea id="parkops-web-key" placeholder="Pegue aquí la licencia PARKOPS" style="box-sizing:border-box;width:100%;min-height:110px;margin-top:10px;background:#11151a;color:#fff;border:1px solid #46505c;border-radius:12px;padding:14px;font-size:14px;resize:vertical"></textarea>
    <button id="parkops-web-activate" style="width:100%;border:0;border-radius:12px;padding:14px 16px;font-size:16px;font-weight:700;cursor:pointer;margin-top:12px;background:#5fd38d;color:#0d1710">Validar y activar</button>
    <div id="parkops-web-msg" style="margin-top:14px;min-height:24px;color:#ffcf66"></div>
    <div style="margin-top:10px;color:#7f8994;font-size:11px">PARKOPS ${VERSION} · La licencia y los datos operativos quedan guardados en este navegador.</div>
  </div>`;
  document.body.appendChild(d);
  const key=d.querySelector('#parkops-web-key');
  if(persistent)key.value=localStorage.getItem(LICENSE_KEY)||'';
  d.querySelector('#parkops-web-copy').onclick=async()=>gateMessage(await copyText(deviceId)?'ID copiado. Envíalo al administrador de licencias.':'No se pudo copiar automáticamente. Mantén presionado el ID para copiarlo.',false);
  d.querySelector('#parkops-web-activate').onclick=async()=>{
    const btn=d.querySelector('#parkops-web-activate');const value=key.value.trim();
    if(!value){gateMessage('Pega la licencia recibida.',true);return}
    btn.disabled=true;btn.textContent='Validando licencia con SOLVEX…';gateMessage('Validando…');
    try{const x=await activateLicense(value);gateMessage(`Licencia activa · ${x.customer_name||'CLIENTE'} · vence ${x.expires_at||''}`);setTimeout(removeGate,450)}
    catch(e){gateMessage(e?.name==='AbortError'?'Tiempo de espera agotado. Revisa tu conexión.':(e?.message||'No se pudo validar la licencia.'),true)}
    finally{btn.disabled=false;btn.textContent='Validar y activar'}
  };
}
function registerSW(){if('serviceWorker' in navigator&&location.protocol==='https:')navigator.serviceWorker.register('./sw.js',{scope:'./'}).catch(()=>{})}
function boot(){
  registerSW();
  if(validLocal())removeGate();else showGate();
  window.ParkopsWeb={version:VERSION,deviceId:getDeviceId,activateLicense,licenseValid:validLocal,customer:()=>persistent?(localStorage.getItem(CUSTOMER_KEY)||''):'' ,clearLicense(){if(persistent){localStorage.removeItem(LICENSE_KEY);localStorage.removeItem(EXPIRES_KEY);localStorage.removeItem(CUSTOMER_KEY)}showGate()}};
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
