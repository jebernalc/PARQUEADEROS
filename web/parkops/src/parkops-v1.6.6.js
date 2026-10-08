/* ============================================================================
   PARKOPS · SOLVEX SYSTEM JB S.A.S.
   Parche v1.6.6 — Servicios adicionales, observaciones e IVA

   Sustituye a v1.6.5 (nunca instalada). Cambios frente a ella:
   · Los valores de casco y baño y la configuración de IVA viven ahora DENTRO
     del acordeón "Tarifas de parqueo", que es donde corresponden. Se guardan
     con el mismo botón de reglas. Ya no existe el acordeón suelto del final.
   · En el formulario de ingreso, el valor de cada servicio NO se muestra
     mientras la casilla esté sin marcar. Aparece al activarla y desaparece
     al desactivarla. Igual en la pantalla de cobro.

   Funciones que aporta sobre 1.6.4:
   1. Ingreso: casillas "DEJA CASCO EN CUSTODIA" y "USA BAÑO" + campo
      OBSERVACIONES (texto libre, multilínea).
   2. Tarifas: valor de casco, valor de baño e IVA (activar, tarifa %, y si
      los precios ya lo incluyen o si se suma al final).
   3. Liquidación y recibo: los servicios se suman al total, el IVA se
      discrimina en línea aparte y las observaciones viajan en el recibo.
   4. En la pantalla de cobro se pueden marcar/desmarcar los servicios y
      editar las observaciones antes de confirmar la salida.

   Todo se guarda en cfg (localStorage) y entra automáticamente en el
   respaldo JSON existente. No toca el licenciamiento ni el backend.
   ========================================================================== */
(() => {
'use strict';

const V = '1.6.6';

/* ── utilidades locales ─────────────────────────────────────────────────── */
const $  = s => document.querySelector(s);
const esc = v => String(v == null ? '' : v)
  .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
const money = n => (typeof pesos === 'function')
  ? pesos(n) : '$' + Math.round(n || 0).toLocaleString('es-CO');
function toast(m, t = 'ok'){ if (typeof avisar === 'function') avisar(m, t); }
const num = (v, d = 0) => { const n = Number(v); return Number.isFinite(n) ? n : d; };

/* ── configuración: valores por defecto y saneamiento ───────────────────── */
const SERVICIOS_BASE = { cascoOn:true, cascoValor:0, cascoEtq:'Custodia de casco',
                         banoOn:true,  banoValor:0,  banoEtq:'Uso de baño' };
const IVA_BASE       = { enabled:false, tasa:19, incluido:false };

function ensure(){
  if (typeof cfg !== 'object' || !cfg) return null;
  cfg.servicios = Object.assign({}, SERVICIOS_BASE, cfg.servicios || {});
  cfg.iva       = Object.assign({}, IVA_BASE,       cfg.iva       || {});
  cfg.servicios.cascoValor = Math.max(0, Math.round(num(cfg.servicios.cascoValor)));
  cfg.servicios.banoValor  = Math.max(0, Math.round(num(cfg.servicios.banoValor)));
  cfg.iva.tasa = Math.min(100, Math.max(0, num(cfg.iva.tasa, 19)));
  return cfg;
}
function guardar(){ if (typeof sCfg === 'function') sCfg(); }

/* ── motor de cálculo ───────────────────────────────────────────────────── */
function valorCasco(){ ensure(); return cfg.servicios.cascoOn ? cfg.servicios.cascoValor : 0; }
function valorBano (){ ensure(); return cfg.servicios.banoOn  ? cfg.servicios.banoValor  : 0; }

/** Servicios adicionales cobrados a un registro. */
function servicios(reg){
  ensure();
  const l = []; let valor = 0;
  if (!reg) return { valor:0, lineas:l };
  if (reg.casco && cfg.servicios.cascoOn){
    const v = cfg.servicios.cascoValor;
    valor += v;
    l.push(`${cfg.servicios.cascoEtq}: ${v ? money(v) : 'sin costo'}`);
  }
  if (reg.bano && cfg.servicios.banoOn){
    const v = cfg.servicios.banoValor;
    valor += v;
    l.push(`${cfg.servicios.banoEtq}: ${v ? money(v) : 'sin costo'}`);
  }
  return { valor, lineas:l };
}

/**
 * Aplica IVA sobre una base.
 *  - modo "incluido": el valor cobrado no cambia; se discrimina base e impuesto.
 *  - modo "adicional": el impuesto se suma al valor cobrado.
 */
function aplicarIVA(base){
  ensure();
  const t = cfg.iva.tasa / 100;
  if (!cfg.iva.enabled || t <= 0 || base <= 0)
    return { total:base, iva:0, neto:base, lineas:[] };
  if (cfg.iva.incluido){
    const neto = base / (1 + t), iva = base - neto;
    return { total:base, iva, neto, lineas:[
      `Base gravable: ${money(neto)}`,
      `IVA ${cfg.iva.tasa}% incluido: ${money(iva)}`
    ]};
  }
  const iva = base * t;
  return { total:base + iva, iva, neto:base, lineas:[
    `Subtotal: ${money(base)}`,
    `IVA ${cfg.iva.tasa}%: ${money(iva)}`
  ]};
}

/** Toma la liquidación base y le suma servicios, IVA, redondeo y observaciones. */
function decorar(base, reg){
  ensure();
  const out = Object.assign({}, base);
  out.lineas = (base.lineas || []).slice();

  // La cortesía no cobra parqueo ni servicios.
  const sv = (reg && reg.isCourtesy) ? { valor:0, lineas:[] } : servicios(reg);
  sv.lineas.forEach(l => out.lineas.push(l));

  const subtotal = Math.max(0, num(base.total)) + sv.valor;
  const iv = aplicarIVA(subtotal);
  iv.lineas.forEach(l => out.lineas.push(l));

  const rd = Math.max(1, Math.round(num(cfg.redondeo, 1)));
  const total = Math.ceil(iv.total / rd) * rd;
  if (rd > 1 && total !== Math.round(iv.total))
    out.lineas.push(`Redondeo a ${money(rd)}: ${money(total)}`);

  const obs = (reg && (reg.observaciones || reg.obs)) || '';
  if (obs) out.lineas.push(`Observaciones: ${obs}`);

  out.total          = total;
  out.servicios      = sv.valor;
  out.valorServicios = sv.valor;
  out.iva            = iv.iva;
  out.valorIva       = iv.iva;
  out.baseGravable   = iv.neto;
  out.observaciones  = obs;
  return out;
}

function activo(placa){
  try { return ingresos.find(r => r.placa === placa && !r.salida) || null; }
  catch { return null; }
}

/* ── formulario de ingreso ──────────────────────────────────────────────── */
let pendiente = { casco:false, bano:false, obs:'' };

function anclaIngreso(){
  const vista = $('#v-ingreso'); if (!vista) return null;
  const extra164 = $('#entryExtra164'); if (extra164) return extra164;
  const obs = $('#obs'); if (obs) return obs.closest('.fila') || obs.closest('.campo');
  return $('#tipos');
}

function mountEntry(){
  ensure();
  if (!$('#v-ingreso') || $('#svc166')) return;
  const ancla = anclaIngreso(); if (!ancla) return;

  // La antigua "Nota" de una línea queda reemplazada por OBSERVACIONES.
  const viejo = $('#obs');
  if (viejo){ const c = viejo.closest('.campo'); if (c) c.style.display = 'none'; }

  const el = document.createElement('div');
  el.id = 'svc166';
  el.className = 'tarjeta';
  el.style.cssText = 'margin:14px 0;padding:14px;border:2px solid var(--linea);border-radius:14px';
  el.innerHTML = `
    <h2 style="margin:0 0 10px">Servicios adicionales y observaciones</h2>
    <label class="nota" style="display:flex;gap:10px;align-items:center;text-transform:none;font-size:14px;margin-bottom:10px;cursor:pointer">
      <input type="checkbox" id="chkCasco166" style="width:22px;height:22px;flex:none">
      <span><b>DEJA CASCO EN CUSTODIA</b><span id="lblCasco166"></span></span>
    </label>
    <label class="nota" style="display:flex;gap:10px;align-items:center;text-transform:none;font-size:14px;margin-bottom:12px;cursor:pointer">
      <input type="checkbox" id="chkBano166" style="width:22px;height:22px;flex:none">
      <span><b>USA BAÑO</b><span id="lblBano166"></span></span>
    </label>
    <div class="campo">
      <label for="obs166">Observaciones</label>
      <textarea id="obs166" rows="3" placeholder="Estado del vehículo, accesorios, novedades, autorizaciones…"
        style="width:100%;padding:12px;font-size:15px;border-radius:10px;border:1px solid var(--linea);font-family:inherit;resize:vertical"></textarea>
      <div class="nota">Queda guardada en el registro y se imprime en el recibo.</div>
    </div>
    <div id="svcTotal166" class="nota" hidden
      style="padding:9px;border:1px solid var(--linea);border-radius:9px;text-transform:none"></div>`;
  ancla.insertAdjacentElement('afterend', el);

  $('#chkCasco166').addEventListener('change', pintarEntrada);
  $('#chkBano166').addEventListener('change', pintarEntrada);
  pintarEntrada();
}

/**
 * Los valores solo se muestran cuando la casilla está marcada.
 * Sin marcar no se ve ninguna cifra.
 */
function pintarEntrada(){
  if (!$('#svc166')) return;
  ensure();

  const cOn = !!$('#chkCasco166')?.checked;
  const bOn = !!$('#chkBano166')?.checked;
  const vc  = cOn ? valorCasco() : 0;
  const vb  = bOn ? valorBano()  : 0;

  const etiqueta = (nodo, activa, valor) => {
    if (!nodo) return;
    if (!activa){ nodo.textContent = ''; nodo.hidden = true; return; }
    nodo.hidden = false;
    nodo.innerHTML = valor
      ? ` — <b style="color:var(--ambar)">${money(valor)}</b>`
      : ' — <b>sin costo</b>';
  };
  etiqueta($('#lblCasco166'), cOn, vc);
  etiqueta($('#lblBano166'),  bOn, vb);

  const box = $('#svcTotal166'); if (!box) return;
  const suma = vc + vb;
  if (!cOn && !bOn){ box.hidden = true; box.innerHTML = ''; return; }
  box.hidden = false;
  box.innerHTML = suma > 0
    ? `<b>Servicios adicionales:</b> ${money(suma)}${cfg.iva.enabled
        ? (cfg.iva.incluido ? ' (IVA incluido)' : ` + IVA ${cfg.iva.tasa}%`) : ''}` +
      ' — se cobran al liquidar la salida.'
    : 'Servicios marcados sin costo: quedan registrados pero no suman al total.';
}

/* ── tarifas: los valores viven dentro del acordeón "Tarifas de parqueo" ─── */
function mountTarifas(){
  ensure();

  // Limpieza: si quedó el acordeón suelto de una versión anterior, se retira.
  document.getElementById('cfgSvc165')?.remove();
  document.getElementById('cfgSvc166')?.remove();

  const btn = $('#btnReglas');                 // botón del acordeón de tarifas
  if (!btn || $('#svcTarifas166')) return;

  const d = document.createElement('div');
  d.id = 'svcTarifas166';
  d.innerHTML = `
    <div class="sep"></div>
    <h3 style="margin:0 0 8px;font-size:15px">Servicios adicionales</h3>
    <p class="nota" style="margin-bottom:12px;text-transform:none">
      Se cobran una sola vez por ingreso, cuando el operario marca la casilla al registrar
      el vehículo. Déjalos en cero si el servicio es gratuito: la casilla se sigue viendo
      y queda registrada, pero no suma al total.</p>

    <div class="fila">
      <div class="campo">
        <label for="sCascoValor166">Custodia de casco</label>
        <input id="sCascoValor166" type="number" min="0" step="500" inputmode="numeric"
          value="${cfg.servicios.cascoValor}">
      </div>
      <div class="campo">
        <label for="sBanoValor166">Uso de baño</label>
        <input id="sBanoValor166" type="number" min="0" step="500" inputmode="numeric"
          value="${cfg.servicios.banoValor}">
      </div>
    </div>

    <label class="nota" style="display:flex;gap:9px;align-items:flex-start;text-transform:none;font-size:13px;margin-bottom:7px">
      <input type="checkbox" id="sCascoOn166" style="width:20px;height:20px;flex:none;margin-top:1px"
        ${cfg.servicios.cascoOn ? 'checked' : ''}>
      <span>Ofrecer y cobrar la custodia de casco</span></label>
    <label class="nota" style="display:flex;gap:9px;align-items:flex-start;text-transform:none;font-size:13px">
      <input type="checkbox" id="sBanoOn166" style="width:20px;height:20px;flex:none;margin-top:1px"
        ${cfg.servicios.banoOn ? 'checked' : ''}>
      <span>Ofrecer y cobrar el uso de baño</span></label>

    <div class="sep"></div>
    <h3 style="margin:0 0 8px;font-size:15px">IVA</h3>
    <p class="legal" style="margin-bottom:12px"><b>Solo si eres responsable de IVA.</b>
      El servicio de parqueadero está gravado a la tarifa general en Colombia, pero únicamente
      debe liquidarlo quien tenga esa responsabilidad. Si no es tu caso, deja el interruptor
      apagado. Verifica tu condición ante la DIAN antes de activarlo.</p>

    <label class="nota" style="display:flex;gap:9px;align-items:flex-start;text-transform:none;font-size:13px;margin-bottom:10px">
      <input type="checkbox" id="ivaOn166" style="width:20px;height:20px;flex:none;margin-top:1px"
        ${cfg.iva.enabled ? 'checked' : ''}>
      <span>Liquidar IVA en los recibos</span></label>

    <div class="fila">
      <div class="campo">
        <label for="ivaTasa166">Tarifa de IVA (%)</label>
        <input id="ivaTasa166" type="number" min="0" max="100" step="0.5" inputmode="decimal"
          value="${cfg.iva.tasa}">
      </div>
      <div class="campo">
        <label for="ivaModo166">Cómo se aplica</label>
        <select id="ivaModo166">
          <option value="adicional" ${cfg.iva.incluido ? '' : 'selected'}>Se suma al total</option>
          <option value="incluido"  ${cfg.iva.incluido ? 'selected' : ''}>Ya está incluido en las tarifas</option>
        </select>
      </div>
    </div>
    <div id="ivaAyuda166" class="nota" style="text-transform:none;padding:9px;border:1px solid var(--linea);border-radius:9px"></div>`;

  btn.parentElement.insertBefore(d, btn);
  btn.textContent = 'Guardar tarifas y reglas';

  const ayuda = () => {
    const on   = $('#ivaOn166').checked;
    const tasa = Math.min(100, Math.max(0, num($('#ivaTasa166').value, 0)));
    const inc  = $('#ivaModo166').value === 'incluido';
    const box  = $('#ivaAyuda166'); if (!box) return;
    if (!on){ box.textContent = 'Los recibos no discriminan IVA. El total es el valor de las tarifas.'; return; }
    box.innerHTML = inc
      ? `El total no cambia. El recibo discrimina la base gravable y el <b>IVA ${tasa}% incluido</b>. Ejemplo: se cobran ${money(10000)}, de los cuales ${money(10000 - 10000/(1+tasa/100))} son IVA.`
      : `El recibo muestra el subtotal y le <b>suma ${tasa}%</b>. Ejemplo: subtotal ${money(10000)} + IVA ${money(10000*tasa/100)} = <b>${money(10000*(1+tasa/100))}</b>.`;
  };
  ['#ivaOn166','#ivaTasa166','#ivaModo166'].forEach(s => {
    const n = $(s); if (n){ n.addEventListener('change', ayuda); n.addEventListener('input', ayuda); }
  });
  ayuda();

  // Un solo botón guarda las reglas del núcleo y estas tarifas de servicio.
  btn.addEventListener('click', () => {
    ensure();
    cfg.servicios.cascoValor = Math.max(0, Math.round(num($('#sCascoValor166').value)));
    cfg.servicios.banoValor  = Math.max(0, Math.round(num($('#sBanoValor166').value)));
    cfg.servicios.cascoOn    = $('#sCascoOn166').checked;
    cfg.servicios.banoOn     = $('#sBanoOn166').checked;
    cfg.iva.enabled  = $('#ivaOn166').checked;
    cfg.iva.tasa     = Math.min(100, Math.max(0, num($('#ivaTasa166').value, 19)));
    cfg.iva.incluido = $('#ivaModo166').value === 'incluido';
    guardar();
    pintarEntrada();
    ayuda();
  });
}

/* ── panel de cobro: editar servicios y observaciones antes de la salida ── */
function mountLiq(id, simMin){
  ensure();
  const panel = $('#panelLiq'); if (!panel || !panel.firstElementChild) return;
  const reg = ingresos.find(i => i.id === id); if (!reg) return;
  if (panel.querySelector('#liqSvc166')) return;

  const esMens = simMin === 'mes';

  // En la simulación mensual el total lo arma el núcleo sin servicios ni IVA: lo recalculamos.
  if (esMens){
    try {
      const tm = tarifas[reg.tipo] || tarifas.carro;
      const lineas = [`Mensualidad completa: ${money(tm.mes)}`];
      let total = tm.mes, recarga = 0;
      if (reg.electrico){
        recarga = num(cfg.recarga && cfg.recarga.mes);
        lineas.push(recarga ? `Recarga eléctrica ilimitada: + ${money(recarga)}`
                            : 'Recarga eléctrica no incluida en la mensualidad');
        total += recarga;
      }
      const liq = decorar({ total, parqueo:tm.mes, recarga, min:0, lineas, mens:false }, reg);
      const caja = panel.querySelector('.liq');
      if (caja) caja.innerHTML =
        `<div class="tot">${money(liq.total)}</div>
         <div class="det">${liq.lineas.map(l => '· ' + esc(l)).join('<br>')}
         ${liq.recarga ? `<br><br>Parqueo ${money(liq.parqueo)} + recarga ${money(liq.recarga)}` : ''}</div>`;
    } catch {}
  }

  const el = document.createElement('div');
  el.id = 'liqSvc166';
  el.style.cssText = 'border:1px solid var(--linea);border-radius:12px;padding:12px;margin:12px 0';
  el.innerHTML = `
    <b style="display:block;margin-bottom:9px">Servicios y observaciones</b>
    <label class="nota" style="display:flex;gap:9px;align-items:center;text-transform:none;font-size:13px;margin-bottom:7px;cursor:pointer">
      <input type="checkbox" id="liqCasco166" style="width:20px;height:20px;flex:none" ${reg.casco ? 'checked' : ''}>
      <span>Dejó casco en custodia<span id="liqLblCasco166"></span></span></label>
    <label class="nota" style="display:flex;gap:9px;align-items:center;text-transform:none;font-size:13px;margin-bottom:10px;cursor:pointer">
      <input type="checkbox" id="liqBano166" style="width:20px;height:20px;flex:none" ${reg.bano ? 'checked' : ''}>
      <span>Usó el baño<span id="liqLblBano166"></span></span></label>
    <div class="campo" style="margin:0">
      <label for="liqObs166">Observaciones</label>
      <textarea id="liqObs166" rows="2" placeholder="Novedades de la salida…"
        style="width:100%;padding:11px;font-size:14px;border-radius:10px;border:1px solid var(--linea);font-family:inherit;resize:vertical">${esc(reg.observaciones || reg.obs || '')}</textarea>
    </div>`;

  const liqBox = panel.querySelector('.liq');
  if (liqBox) liqBox.insertAdjacentElement('afterend', el);
  else panel.firstElementChild.appendChild(el);

  // También aquí: la cifra aparece solo si la casilla está marcada.
  const pintarLiq = () => {
    const puesta = (nodo, activa, valor) => {
      if (!nodo) return;
      nodo.innerHTML = activa ? (valor ? ` · <b>${money(valor)}</b>` : ' · <b>sin costo</b>') : '';
    };
    puesta($('#liqLblCasco166'), $('#liqCasco166').checked, valorCasco());
    puesta($('#liqLblBano166'),  $('#liqBano166').checked,  valorBano());
  };
  pintarLiq();

  const aplicar = () => {
    reg.casco = $('#liqCasco166').checked;
    reg.bano  = $('#liqBano166').checked;
    if (typeof sIng === 'function') sIng();
    mostrarLiquidacion(id, simMin);
  };
  $('#liqCasco166').addEventListener('change', aplicar);
  $('#liqBano166').addEventListener('change', aplicar);
  $('#liqObs166').addEventListener('change', () => {
    const t = $('#liqObs166').value.trim();
    reg.observaciones = t; reg.obs = t;
    if (typeof sIng === 'function') sIng();
    toast('Observaciones actualizadas', 'ok');
  });

  // Al confirmar la salida, dejar el desglose guardado en el registro para la caja.
  const btn = panel.querySelector('#btnConfirmar');
  if (btn) btn.addEventListener('click', () => setTimeout(() => {
    try {
      ensure();
      const t = cfg.iva.enabled ? cfg.iva.tasa / 100 : 0;
      reg.valorServicios = reg.isCourtesy ? 0 : servicios(reg).valor;
      reg.valorIva = (t > 0 && reg.valor > 0) ? reg.valor - reg.valor / (1 + t) : 0;
      reg.baseGravable = Math.max(0, (reg.valor || 0) - reg.valorIva);
      if (typeof sIng === 'function') sIng();
    } catch {}
  }, 0));
}

/* ── enganches sobre el núcleo ──────────────────────────────────────────── */

/* 1. Liquidación: servicios + IVA + observaciones sobre lo que calcule 1.6.4 */
if (typeof liquidar === 'function'){
  const prev = liquidar;
  liquidar = function(entrada, fin, tipo, placa, electrico, kwh){
    const base = prev(entrada, fin, tipo, placa, electrico, kwh);
    return decorar(base, activo(placa));
  };
}

/* 2. Ingreso: capturar casillas y observaciones en el registro nuevo */
if (typeof registrarEntrada === 'function'){
  const prev = registrarEntrada;
  registrarEntrada = function(enviar){
    if (!$('#svc166')) mountEntry();
    const casco = !!$('#chkCasco166')?.checked;
    const bano  = !!$('#chkBano166')?.checked;
    const obs   = ($('#obs166')?.value || '').trim();

    // El recibo de ingreso se arma dentro de prev(): dejamos los datos accesibles.
    pendiente = { casco, bano, obs };
    const viejo = $('#obs'); if (viejo) viejo.value = obs;

    const antes = new Set(ingresos.map(r => r.id));
    prev(enviar);

    const reg = ingresos.find(r => !antes.has(r.id));
    pendiente = { casco:false, bano:false, obs:'' };
    if (!reg) return;

    reg.casco = casco;
    reg.bano  = bano;
    reg.observaciones = obs;
    if (obs) reg.obs = obs;
    if (typeof sIng === 'function') sIng();

    if ($('#chkCasco166')) $('#chkCasco166').checked = false;
    if ($('#chkBano166'))  $('#chkBano166').checked  = false;
    if ($('#obs166'))      $('#obs166').value = '';
    pintarEntrada();
    if (typeof refrescar === 'function') refrescar();
  };
}

/* 3. Recibos: tokens nuevos y bloque de servicios en el comprobante de ingreso */
if (typeof datosRecibo === 'function'){
  const prev = datosRecibo;
  datosRecibo = function(reg, liq){
    const d = prev(reg, liq);
    ensure();
    const r = reg || {};
    const casco = (r.casco !== undefined) ? r.casco : pendiente.casco;
    const bano  = (r.bano  !== undefined) ? r.bano  : pendiente.bano;
    const obs   = r.observaciones || r.obs || pendiente.obs || '';

    const extra = [];
    if (casco && cfg.servicios.cascoOn)
      extra.push(`${cfg.servicios.cascoEtq}: ${valorCasco() ? money(valorCasco()) : 'sin costo'}`);
    if (bano && cfg.servicios.banoOn)
      extra.push(`${cfg.servicios.banoEtq}: ${valorBano() ? money(valorBano()) : 'sin costo'}`);

    d.casco         = casco ? 'SÍ' : 'NO';
    d.bano          = bano  ? 'SÍ' : 'NO';
    d.servicios     = extra.join('\n');
    d.observaciones = obs;
    d.iva           = liq ? money(liq.valorIva || 0) : '';
    d.baseGravable  = liq ? money(liq.baseGravable || 0) : '';

    // Comprobante de ingreso: se anexa al bloque de tarifa, que sí está en la plantilla.
    if (!liq){
      const bloque = [];
      if (extra.length) bloque.push('*SERVICIOS ADICIONALES*\n' + extra.join('\n'));
      if (obs)          bloque.push('*OBSERVACIONES*\n' + obs);
      if (bloque.length) d.tarifa = (d.tarifa || '') + '\n\n' + bloque.join('\n\n');
    }
    return d;
  };
}

/* 4. Texto de tarifa: solo la advertencia de IVA.
      Los valores de los servicios NO se listan aquí; aparecen únicamente
      cuando el servicio se toma, en el bloque SERVICIOS ADICIONALES. */
if (typeof textoTarifa === 'function'){
  const prev = textoTarifa;
  textoTarifa = function(tipo, electrico){
    let s = prev(tipo, electrico);
    ensure();
    if (cfg.iva.enabled)
      s += `\n${cfg.iva.incluido ? `Tarifas con IVA ${cfg.iva.tasa}% incluido`
                                 : `A las tarifas se les suma IVA ${cfg.iva.tasa}%`}`;
    return s;
  };
}

/* 5. Panel de cobro: inyectar controles después de que el núcleo lo pinte */
if (typeof mostrarLiquidacion === 'function'){
  const prev = mostrarLiquidacion;
  mostrarLiquidacion = function(id, simMin){
    prev(id, simMin);
    try { mountLiq(id, simMin); } catch {}
  };
}

/* ── arranque y re-montaje ──────────────────────────────────────────────── */
function init(){
  if (typeof cfg !== 'object' || !cfg){ setTimeout(init, 120); return; }
  ensure();
  mountEntry();
  mountTarifas();

  // Observador con antirrebote: no escribe si los módulos ya están montados,
  // para no realimentar el propio MutationObserver.
  let pend = 0;
  const mo = new MutationObserver(() => {
    if (pend) return;
    if ($('#svc166') && $('#svcTarifas166')) return;
    pend = setTimeout(() => { pend = 0; try { mountEntry(); mountTarifas(); } catch {} }, 60);
  });
  mo.observe(document.documentElement, { childList:true, subtree:true });

  window.Parkops166 = { version:V, servicios, aplicarIVA, decorar, ensure, pintarEntrada };
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
else init();

})();
