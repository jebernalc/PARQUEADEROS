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
  const name=document.getElementById('aNombre'),file=document.getElementById('logoFile164');if(!name||!file)return;
  let wrap=document.getElementById('brandAtParkingData164');
  if(!wrap){
    const body=name.closest('.cuerpo');if(!body)return;
    wrap=document.createElement('div');wrap.id='brandAtParkingData164';wrap.style.cssText='margin:12px 0 4px;padding:12px;border:1px solid var(--linea);border-radius:12px';
    wrap.innerHTML='<h3 style="margin:0 0 8px">Logo personalizado del parqueadero</h3><p class="nota">Selecciona una imagen de la galería. Al guardarla reemplaza el ícono amarillo y aparece antes del nombre del parqueadero.</p><button type="button" class="btn" id="openLogoGallery164" style="width:100%;min-height:48px;pointer-events:auto;touch-action:manipulation">SELECCIONAR IMAGEN DE GALERÍA</button><div id="logoGalleryStatus164" class="nota" style="margin-top:7px">PNG, JPG, WEBP o GIF · máximo 1 MB</div>';
    const enabled=document.getElementById('logoEnabled164');
    const preview=document.getElementById('logoPreview164');
    const save=document.getElementById('saveLogo164'),remove=document.getElementById('removeLogo164');
    const nodes=[enabled?.closest('label'),file.closest('.campo'),preview,save?.parentElement];
    nodes.forEach(n=>{if(n&&n.isConnected)wrap.appendChild(n)});
    name.closest('.campo')?.insertAdjacentElement('afterend',wrap);
  }
  file.style.cssText='position:absolute!important;width:1px!important;height:1px!important;opacity:0!important;pointer-events:none!important';
  const open=wrap.querySelector('#openLogoGallery164');
  if(open&&!open.dataset.bound){open.dataset.bound='1';open.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();const input=document.getElementById('logoFile164');if(!input)return;input.value='';input.click()},{passive:false})}
  if(!file.dataset.brandBound){file.dataset.brandBound='1';file.addEventListener('change',()=>{const s=document.getElementById('logoGalleryStatus164');if(s)s.textContent=file.files?.[0]?`Imagen seleccionada: ${file.files[0].name}`:'No se seleccionó ninguna imagen'})}
  const save=document.getElementById('saveLogo164'),remove=document.getElementById('removeLogo164');
  if(save&&!save.dataset.headerBound){save.dataset.headerBound='1';save.addEventListener('click',()=>setTimeout(headerBrand,0))}
  if(remove&&!remove.dataset.headerBound){remove.dataset.headerBound='1';remove.addEventListener('click',()=>setTimeout(headerBrand,0))}
}
let queued=false;function reconcile(){queued=false;moveLogoConfig();headerBrand()}
function schedule(){if(queued)return;queued=true;setTimeout(reconcile,0)}
function init(){reconcile();new MutationObserver(ms=>{if(ms.some(m=>[...m.addedNodes].some(n=>n.nodeType===1&&(n.id==='proSettings164'||n.id==='v-ajustes'||n.querySelector?.('#proSettings164,#v-ajustes')))))schedule()}).observe(document.body,{childList:true,subtree:true});window.Parkops164BrandFinal={version:'1.6.4',reconcile}}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();