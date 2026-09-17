(()=>{'use strict';
const getBrand=()=>{try{return window.Parkops164Pro?.config?.().branding||{}}catch{return{}}};
function headerBrand(){
  const h=document.querySelector('header'),name=document.getElementById('hNombre');if(!h||!name)return;
  const b=getBrand();
  document.querySelectorAll('.parkops-client-logo').forEach(x=>x.remove());
  const old=h.querySelector('.icono');if(old)old.style.display=(b.enabled&&b.logo)?'none':'';
  let img=h.querySelector('.parkops-header-client-logo');
  if(!b.enabled||!b.logo){if(img)img.remove();return;}
  if(!img){img=document.createElement('img');img.className='parkops-header-client-logo';img.alt='Logo del parqueadero';img.style.cssText='width:38px;height:38px;max-width:52px;max-height:42px;object-fit:contain;flex:none;border-radius:6px;background:transparent;pointer-events:none';h.insertBefore(img,name.parentElement)}
  if(img.src!==b.logo)img.src=b.logo;
}
function moveLogoConfig(){
  const name=document.getElementById('aNombre'),file=document.getElementById('logoFile164');if(!name||!file||document.getElementById('brandAtParkingData164'))return;
  const body=name.closest('.cuerpo');if(!body)return;
  const wrap=document.createElement('div');wrap.id='brandAtParkingData164';wrap.style.cssText='margin:12px 0 4px;padding:12px;border:1px solid var(--linea);border-radius:12px';
  wrap.innerHTML='<h3 style="margin:0 0 8px">Logo del parqueadero</h3><p class="nota">El logo configurado reemplaza el ícono amarillo del encabezado y aparece inmediatamente antes del nombre del parqueadero.</p>';
  const enabled=document.getElementById('logoEnabled164');
  const preview=document.getElementById('logoPreview164');
  const save=document.getElementById('saveLogo164'),remove=document.getElementById('removeLogo164');
  const nodes=[enabled?.closest('label'),file.closest('.campo'),preview,save?.parentElement];
  nodes.forEach(n=>{if(n&&n.isConnected)wrap.appendChild(n)});
  name.closest('.campo')?.insertAdjacentElement('afterend',wrap);
  if(save){save.addEventListener('click',()=>setTimeout(headerBrand,0))}
  if(remove){remove.addEventListener('click',()=>setTimeout(headerBrand,0))}
}
let queued=false;function reconcile(){queued=false;moveLogoConfig();headerBrand()}
function schedule(){if(queued)return;queued=true;setTimeout(reconcile,0)}
function init(){reconcile();new MutationObserver(ms=>{if(ms.some(m=>[...m.addedNodes].some(n=>n.nodeType===1&&(n.classList?.contains('parkops-client-logo')||n.id==='proSettings164'||n.querySelector?.('#proSettings164')))))schedule()}).observe(document.body,{childList:true,subtree:true});window.Parkops164BrandFinal={version:'1.6.4',reconcile}}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();