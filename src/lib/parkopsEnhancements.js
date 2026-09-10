export const VEHICLE_TYPES = ['AUTO','MOTO','BICICLETA','PATINETA'];
export const PROFILES = ['SOCIO','INVITADO','CORTESIA','HUESPED','EMPLEADO','CONTRATISTA','AUTORIZADO','GENERAL'];

export const DEFAULT_RATES = {
  SOCIO: { AUTO:0, MOTO:0, BICICLETA:0, PATINETA:0 },
  INVITADO: { AUTO:35000, MOTO:21000, BICICLETA:0, PATINETA:0 },
  CORTESIA: { AUTO:0, MOTO:0, BICICLETA:0, PATINETA:0 },
  GENERAL: { MOTO:9200, BICICLETA:0, PATINETA:0 }
};

export function normalizeWhatsApp(value='') { return value.replace(/\D/g,''); }
export function cop(value=0) { return new Intl.NumberFormat('es-CO',{style:'currency',currency:'COP',maximumFractionDigits:0}).format(Number(value)||0); }

export function calculateParkingRate({profile='GENERAL', vehicleType='AUTO', rates=DEFAULT_RATES, courtesy=false}) {
  if (courtesy || profile === 'CORTESIA' || profile === 'SOCIO') return 0;
  return Number(rates?.[profile]?.[vehicleType] ?? rates?.GENERAL?.[vehicleType] ?? 0);
}

export function calculateChargingRate(minutes, chargingRates=[]) {
  const mins = Math.max(0, Number(minutes)||0);
  const options = [...chargingRates].filter(x=>x.activo!==false).sort((a,b)=>Number(a.minutos)-Number(b.minutos));
  const selected = options.find(x=>mins <= Number(x.minutos)) || options.at(-1);
  return selected ? Number(selected.valor)||0 : 0;
}

export function digitalReceiptText(ticket) {
  return [
    'PARKOPS · RECIBO DIGITAL',
    `Recibo: ${ticket.receiptNo || ticket.id || '-'}`,
    `Placa/ID: ${ticket.plate || '-'}`,
    `Tipo: ${ticket.vehicleType || '-'}`,
    `Perfil: ${ticket.profile || '-'}`,
    `Ingreso: ${ticket.entry || '-'}`,
    `Salida: ${ticket.exit || '-'}`,
    ticket.chargingMinutes ? `Recarga eléctrica: ${ticket.chargingMinutes} min` : null,
    `Parqueadero: ${cop(ticket.parkingAmount)}`,
    ticket.chargingAmount ? `Recarga: ${cop(ticket.chargingAmount)}` : null,
    `TOTAL: ${cop((Number(ticket.parkingAmount)||0)+(Number(ticket.chargingAmount)||0))}`,
    'Comprobante digital. Gracias.'
  ].filter(Boolean).join('\n');
}

export function whatsappReceiptUrl(phone, ticket) {
  const number = normalizeWhatsApp(phone);
  return `https://wa.me/${number}?text=${encodeURIComponent(digitalReceiptText(ticket))}`;
}
