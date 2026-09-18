(()=>{'use strict';
const money=n=>typeof pesos==='function'?pesos(+n||0):'$ '+Math.round(+n||0).toLocaleString('es-CO');
const previousLiquidar=liquidar;
liquidar=function(entrada,fin,tipo,placa,electrico,kwh){
 const out=previousLiquidar(entrada,fin,tipo,placa,electrico,kwh);
 const reg=ingresos.find(x=>x.placa===placa&&!x.salida);
 if(!reg||reg.isCourtesy)return out;
 const casco=reg.helmetSelected?Math.max(0,+reg.helmetFee||0):0;
 const bano=reg.bathroomSelected?Math.max(0,+reg.bathroomFee||0):0;
 const pct=Math.max(0,+reg.vatPercent||0);
 const base=Math.max(0,+out.total||0),subtotal=base+casco+bano,iva=Math.round(subtotal*pct/100);
 out.casco=casco;out.bano=bano;out.subtotal=subtotal;out.iva=iva;out.ivaPorcentaje=pct;out.total=subtotal+iva;
 out.lineas=[...(out.lineas||[])];
 if(casco)out.lineas.push('Guarda casco: '+money(casco));
 if(bano)out.lineas.push('Uso de baño: '+money(bano));
 if(pct){out.lineas.push('Subtotal: '+money(subtotal));out.lineas.push('IVA '+pct+'%: '+money(iva))}
 return out;
};
const previousReceipt=datosRecibo;
datosRecibo=function(reg,liq){
 const d=previousReceipt(reg,liq);
 d.observaciones=reg.observations||'';
 d.guardaCasco=reg.helmetSelected?(+reg.helmetFee||0):0;
 d.usoBano=reg.bathroomSelected?(+reg.bathroomFee||0):0;
 d.ivaPorcentaje=+reg.vatPercent||0;
 return d;
};
window.Parkops165={version:'1.6.5',features:['casco','bano','observaciones','iva']};
})();