(()=>{
'use strict';
const VERSION='1.5.1-web';
const SUPABASE_URL='https://epadzsrfsvckyjugcvpd.supabase.co';
const PUBLISHABLE_KEY='sb_publishable_PxFa4vMqovqCIDOwEsoiBQ_2q2jETc_';
const DEVICE_KEY='parkops.web.device_id';
const LICENSE_KEY='parkops.web.license_key';
const EXPIRES_KEY='parkops.web.expires_at';
const CUSTOMER_KEY='parkops.web.customer_name';

function getDeviceId(){
  let id=localStorage.getItem(DEVICE_KEY);
  if(!id){
    const raw=(globalThis.crypto&&crypto.randomUUID)?crypto.randomUUID():`${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`;
    id='WEB-'+raw.toUpperCase();
    localStorage.setItem(DEVICE_KEY,id);
  }
  return id;
}
function validLocal(){
  const key=localStorage.getItem(LICENSE_KEY)||'';
  const exp=localStorage.getItem(EXPIRES_KEY)||'';
  if(!key||!exp)return false;
  const limit=new Date(`${exp}T23:59:59`);
  return !Number.isNaN(limit.getTime())&&Date.now()<=limit.getTime();
}
function esc(s){return String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));}
async function copyText(text){
  try{await navigator.clipboard.writeText(text);return true}catch(e){
    const t=document.createElement('textarea');t.value=text;t.style.position='fixed';t.style.opacity='0';document.body.appendChild(t);t.select();const ok=document.execCommand('copy');t.remove();return ok;
  }
}
function removeGate(){document.getElementById('parkops-web-license-gate')?.remove();document.documentElement.style.removeProperty('overflow');}
function gateMessage(msg,isError=false){const e=document.getElementById('parkops-web-msg');if(!e)return;e.textContent=msg||'';e.style.color=isError?'#b91c1c':'#475569';}
async function activateLicense(key){
  if(!navigator.onLine)throw new Error('Necesitas conexión a internet únicamente para activar la licencia por primera vez.');
  const device_id=getDeviceId();
  const r=await fetch(`${SUPABASE_URL}/functions/v1/parkops-master`,{
    method:'POST',
    headers:{'Content-Type':'application/json','apikey':PUBLISHABLE_KEY},
    body:JSON.stringify({action:'activate_license',license_key:key,device_id})
  });
  let data={};try{data=await r.json()}catch{}
  if(!r.ok||!data.ok)throw new Error(data.error||`No fue posible activar la licencia (${r.status})`);
  localStorage.setItem(LICENSE_KEY,key);
  localStorage.setItem(EXPIRES_KEY,data.expires_at||'');
  localStorage.setItem(CUSTOMER_KEY,data.customer_name||'CLIENTE');
  return data;
}
function showGate(){
  if(document.getElementById('parkops-web-license-gate'))return;
  document.documentElement.style.overflow='hidden';
  const deviceId=getDeviceId();
  const d=document.createElement('div');
  d.id='parkops-web-license-gate';
  d.style.cssText='position:fixed;inset:0;z-index:2147483647;background:linear-gradient(145deg,#0f172a,#111827 55%,#172554);display:grid;place-items:center;padding:18px;font-family:system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif';
  d.innerHTML=`<div style="width:min(560px,100%);background:#fff;color:#0f172a;border-radius:22px;padding:24px;box-shadow:0 24px 70px #0008">
    <div style="font-size:12px;font-weight:800;letter-spacing:.12em;color:#475569">SOLVEX SYSTEM JB</div>
    <h1 style="margin:7px 0 4px;font-size:28px">Activación PARKOPS Web</h1>
    <p style="margin:0 0 18px;color:#64748b;line-height:1.45">La versión web conserva la experiencia PARKOPS y funciona en iPhone, Android, Windows, macOS, Linux y navegadores modernos.</p>
    <label style="display:block;font-size:13px;font-weight:700;margin-bottom:6px">ID de este navegador</label>
    <div style="display:flex;gap:8px"><input id="parkops-web-device" readonly value="${esc(deviceId)}" style="flex:1;min-width:0;padding:11px;border:1px solid #cbd5e1;border-radius:10px;background:#f8fafc"><button id="parkops-web-copy" style="padding:0 14px;border:0;border-radius:10px;background:#e2e8f0;font-weight:800">Copiar</button></div>
    <p style="font-size:12px;color:#64748b;margin:7px 0 16px">Envía este ID para generar una licencia web para este navegador.</p>
    <label style="display:block;font-size:13px;font-weight:700;margin-bottom:6px">Licencia</label>
    <textarea id="parkops-web-key" rows="3" placeholder="Pega aquí la licencia recibida" style="width:100%;box-sizing:border-box;padding:11px;border:1px solid #cbd5e1;border-radius:10px;resize:vertical"></textarea>
    <button id="parkops-web-activate" style="width:100%;margin-top:12px;padding:13px;border:0;border-radius:11px;background:#0f172a;color:#fff;font-weight:900;font-size:15px">ACTIVAR PARKOPS WEB</button>
    <div id="parkops-web-msg" style="min-height:20px;margin-top:11px;font-size:13px;color:#475569"></div>
    <div style="margin-top:8px;font-size:11px;color:#94a3b8">Versión ${VERSION}. La licencia queda almacenada únicamente en este navegador.</div>
  </div>`;
  document.body.appendChild(d);
  d.querySelector('#parkops-web-copy').onclick=async()=>{await copyText(deviceId);gateMessage('ID copiado. Envíalo al administrador de licencias.')};
  d.querySelector('#parkops-web-activate').onclick=async()=>{
    const btn=d.querySelector('#parkops-web-activate');
    const key=d.querySelector('#parkops-web-key').value.trim();
    if(!key){gateMessage('Pega la licencia para continuar.',true);return;}
    btn.disabled=true;btn.textContent='VALIDANDO...';gateMessage('Validando licencia con PARKOPS...');
    try{const x=await activateLicense(key);gateMessage(`Licencia activa para ${x.customer_name||'cliente'}.`);setTimeout(removeGate,450)}
    catch(e){gateMessage(e.message||'No fue posible activar.',true)}
    finally{btn.disabled=false;btn.textContent='ACTIVAR PARKOPS WEB'}
  };
}
function addWebBadge(){
  if(document.getElementById('parkops-web-badge'))return;
  const b=document.createElement('div');b.id='parkops-web-badge';b.textContent='WEB';b.title='PARKOPS Web';b.style.cssText='position:fixed;top:10px;right:10px;z-index:2147483000;background:#0f172a;color:#fff;border-radius:999px;padding:5px 9px;font:800 10px system-ui;opacity:.82;pointer-events:none';document.body.appendChild(b);
}
function registerSW(){if('serviceWorker' in navigator){navigator.serviceWorker.register('./sw.js').catch(()=>{});}}
function boot(){
  addWebBadge();registerSW();
  if(validLocal()) removeGate(); else showGate();
  window.ParkopsWeb={version:VERSION,deviceId:getDeviceId,activateLicense,clearLicense(){localStorage.removeItem(LICENSE_KEY);localStorage.removeItem(EXPIRES_KEY);localStorage.removeItem(CUSTOMER_KEY);showGate();}};
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
})();