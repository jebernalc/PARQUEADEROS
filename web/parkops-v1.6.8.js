(()=>{'use strict';
function isOpen(r){return !!r&&!r.salida&&r.occupiesSlot!==false}
function fixMonthly(){let changed=false;try{ingresos.forEach(r=>{if(r?.isMonthly&&!r.salida){if(r.occupiesSlot!==true){r.occupiesSlot=true;changed=true}if(!r.status||r.status==='SALIDO'){r.status='EN_PATIO';changed=true}}});if(changed&&typeof sIng==='function')sIng()}catch(e){console.error('PARKOPS monthly occupancy repair',e)}return changed}
function monthlyBadge(raw,i){if(!i?.isMonthly||!isOpen(i)||raw.includes('MENSUALIDAD · EN PATIO'))return raw;const b='<span class="chip" style="margin-left:5px;background:#2563eb;color:#fff;font-weight:800">MENSUALIDAD · EN PATIO</span>';return raw.replace('</div></div>',b+'</div></div>')}
if(typeof tarjetaAuto==='function'){const base=tarjetaAuto;tarjetaAuto=function(i){return monthlyBadge(base(i),i)}}
if(typeof pintarPatio==='function'){const base=pintarPatio;pintarPatio=function(){fixMonthly();return base.apply(this,arguments)}}
if(typeof refrescar==='function'){const base=refrescar;refrescar=function(){fixMonthly();return base.apply(this,arguments)}}
function init(){fixMonthly();if(typeof refrescar==='function')refrescar();window.Parkops168={version:'1.6.8',features:['monthly-occupancy-in-patio','monthly-capacity-count','monthly-badge']}}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();