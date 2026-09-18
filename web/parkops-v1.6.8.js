(()=>{'use strict';
function openMonthly(r){return !!r&&r.isMonthly===true&&!r.salida}
function repair(){let changed=false;try{ingresos.forEach(r=>{if(openMonthly(r)){if(r.occupiesSlot!==true){r.occupiesSlot=true;changed=true}if(r.status!=='EN_PATIO'&&r.status!=='LIQUIDADO'){r.status='EN_PATIO';changed=true}}});if(changed&&typeof sIng==='function')sIng()}catch(e){console.error('PARKOPS v1.6.8 monthly repair',e)}return changed}
if(typeof tarjetaAuto==='function'){const base=tarjetaAuto;tarjetaAuto=function(i){let raw=base(i);if(openMonthly(i)&&!raw.includes('MENSUALIDAD · EN PATIO')){const badge='<span class="chip" style="margin-left:5px;background:#2563eb;color:#fff;font-weight:800">MENSUALIDAD · EN PATIO</span>';raw=raw.replace('</div></div>',badge+'</div></div>')}return raw}}
function init(){repair();window.Parkops168={version:'1.6.8',repairMonthlyOccupancy:repair}}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();