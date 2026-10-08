/* ============================================================================
   PARKOPS · SOLVEX SYSTEM JB S.A.S.
   Capa web v1.0 — adapta la versión 1.6.6 para correr en cualquier navegador

   Qué hace:
   1. Añade al final de Ajustes el "Centro de descargas y accesos": los dos APK
      y el enlace a la consola de licencias, igual que en la app de cotizaciones.
   2. Marca en la cabecera que se está usando la versión web.
   3. Sustituye los puentes propios de Android que aquí no existen:
      · El cobro con app de pagos (AndroidPagos) no está en el navegador: se
        muestran los datos para copiar, que es lo que el operario necesita.
      · Guardar y compartir archivos usa la descarga normal del navegador.
   4. Permite instalar la página en la pantalla de inicio del celular.

   CONFIGURACIÓN: edite el bloque RUTAS de abajo con las direcciones reales
   donde publique cada archivo. Si deja los tres archivos en la misma carpeta
   del servidor, los valores por defecto ya funcionan.
   ========================================================================== */
(() => {
'use strict';

const V = 'web-1.0';

/* ── RUTAS · edite aquí ──────────────────────────────────────────────────── */
const RUTAS = {
  apkOperacion : './PARKOPS-OPERACION-v1_6_6.apk',
  apkLicencias : './SOLVEX-LICENCIAS-v1_4_0.apk',
  consolaLic   : './licencias.html'
};
/* ───────────────────────────────────────────────────────────────────────── */

const $ = s => document.querySelector(s);
const esc = v => String(v == null ? '' : v)
  .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
function toast(m, t = 'ok'){ if (typeof avisar === 'function') avisar(m, t); }

const EN_PREVIA = /claude\.ai$|claudeusercontent\.com$/.test(location.hostname);

/* La clase .btn trae display:block, que gana sobre el atributo hidden del
   navegador. Sin esta regla, un botón oculto se seguiría viendo. */
(function estilos(){
  if (document.getElementById('estilosWeb10')) return;
  const s = document.createElement('style');
  s.id = 'estilosWeb10';
  s.textContent = '.btn[hidden],a.btn[hidden]{display:none!important}'
    + '#centroWeb a.btn{text-decoration:none}';
  document.head.appendChild(s);
})();

/* ── Marca de versión web en la cabecera ────────────────────────────────── */
function marcarWeb(){
  if ($('#webBadge')) return;
  const h = document.querySelector('header'); if (!h) return;
  const b = document.createElement('span');
  b.id = 'webBadge';
  b.textContent = 'web';
  b.style.cssText = 'margin-left:7px;font-size:10px;padding:2px 7px;border-radius:20px;'
    + 'background:#2a3340;color:var(--tinta2);letter-spacing:.05em;flex:none';
  h.appendChild(b);
}

/* ── Centro de descargas y accesos ──────────────────────────────────────── */
function mountCentro(){
  const vista = $('#v-ajustes');
  if (!vista || $('#centroWeb')) return;

  const d = document.createElement('details');
  d.className = 'acordeon';
  d.id = 'centroWeb';
  d.innerHTML = `
    <summary>Aplicaciones y accesos</summary>
    <div class="cuerpo">
      <p class="nota" style="margin-bottom:14px;text-transform:none">
        Esta misma operación funciona en el navegador y en el celular. Los datos de cada
        una son independientes: lo que registre aquí no aparece en la app instalada.</p>

      <div class="sep"></div>
      <h3 style="margin:0 0 4px;font-size:15px">Para el operario de la caseta</h3>
      <p class="nota" style="margin-bottom:10px;text-transform:none">
        Instale esta aplicación en el celular que va a trabajar sin internet.</p>
      <a class="btn" id="dlOperacion" href="${esc(RUTAS.apkOperacion)}" download
         style="display:block;text-align:center;text-decoration:none;margin-bottom:6px">
         Descargar PARKOPS Operación 1.6.6</a>
      <p class="nota" style="margin-bottom:16px;text-transform:none">
        Android pedirá permiso para instalar desde el navegador. Es normal: la aplicación
        no está en Play Store porque es de uso propio.</p>

      <div class="sep"></div>
      <h3 style="margin:0 0 4px;font-size:15px">Para el propietario y el administrador de sedes</h3>
      <p class="nota" style="margin-bottom:10px;text-transform:none">
        Desde aquí se registran los clientes y se generan las licencias que activan cada
        celular. El propietario ve todo; el administrador de sedes gestiona clientes y
        licencias con su propio usuario.</p>
      <a class="btn sec" id="abrirLic" href="${esc(RUTAS.consolaLic)}" target="_blank" rel="noopener"
         style="display:block;text-align:center;text-decoration:none;margin-bottom:6px">
         Abrir la consola de licencias</a>
      <a class="btn sec" id="dlLicencias" href="${esc(RUTAS.apkLicencias)}" download
         style="display:block;text-align:center;text-decoration:none">
         Descargar SOLVEX Licencias 1.4.0</a>

      <div class="sep"></div>
      <h3 style="margin:0 0 8px;font-size:15px">Quién usa cada cosa</h3>
      <div class="scroll"><table>
        <thead><tr><th>Persona</th><th>Herramienta</th></tr></thead>
        <tbody>
          <tr><td>Operario de caseta</td><td>PARKOPS Operación, en el celular</td></tr>
          <tr><td>Supervisor en sitio</td><td>Esta misma página, en cualquier navegador</td></tr>
          <tr><td>Propietario del parqueadero</td><td>Consola de licencias, con su usuario</td></tr>
          <tr><td>Administrador de sedes</td><td>Consola de licencias, con usuario de administrador</td></tr>
        </tbody></table></div>

      <div class="sep"></div>
      <button class="btn sec" id="btnInstalarWeb" hidden>Instalar esta página en el celular</button>
      <p class="nota" id="notaInstalar" style="text-transform:none">
        En el celular puede añadir esta página a la pantalla de inicio desde el menú del
        navegador; se abre como una aplicación más.</p>
    </div>`;
  vista.appendChild(d);

  if (EN_PREVIA){
    ['dlOperacion','dlLicencias','abrirLic'].forEach(id => {
      const a = $('#'+id); if (!a) return;
      a.addEventListener('click', e => {
        e.preventDefault();
        toast('La vista previa no descarga archivos. Funciona al publicarlo en su dominio.', 'err');
      });
    });
    d.querySelector('.cuerpo').insertAdjacentHTML('afterbegin',
      `<p class="legal" style="margin-bottom:12px">Está viendo la vista previa. Los botones de
        descarga quedan activos cuando publique esta página en su servidor, con los dos APK
        y la consola de licencias en la misma carpeta.</p>`);
  }

  if (botonInstalar) prepararInstalacion();
}

/* ── Instalación en pantalla de inicio ──────────────────────────────────── */
let botonInstalar = null;
window.addEventListener('beforeinstallprompt', e => {
  e.preventDefault();
  botonInstalar = e;
  prepararInstalacion();
});
function prepararInstalacion(){
  const b = $('#btnInstalarWeb'); if (!b || !botonInstalar) return;
  b.hidden = false;
  const n = $('#notaInstalar');
  if (n) n.textContent = 'Se instala como una aplicación más, con su propio ícono.';
  b.onclick = async () => {
    try { botonInstalar.prompt(); await botonInstalar.userChoice; botonInstalar = null; b.hidden = true; }
    catch {}
  };
}

/* ── Sustitutos de los puentes de Android ───────────────────────────────── */

/* Guardar archivo: en el celular lo hacía AndroidBridge; aquí, descarga normal. */
if (typeof window.bajar !== 'function'){
  window.bajar = function(contenido, nombre, tipo){
    try {
      const a = document.createElement('a');
      a.href = URL.createObjectURL(new Blob([contenido], { type: tipo || 'text/plain' }));
      a.download = nombre || 'parkops.txt';
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(a.href), 4000);
    } catch { toast('Este navegador no permitió descargar el archivo', 'err'); }
  };
}

/* En el navegador no existe la app de pagos: se muestran los datos para copiar. */
function ajustarPagos(){
  const cont = $('#rPagosApps');
  if (!cont || cont.dataset.web === '1') return;
  if (window.AndroidPagos && window.AndroidPagos.pagar) return;  // está en el celular
  cont.dataset.web = '1';
  const nota = $('#rPagosNota');
  if (nota){
    nota.hidden = false;
    nota.textContent = 'Desde el navegador no se abre la app de pagos. Los datos van en el '
      + 'recibo de WhatsApp para que el cliente pague desde su propio celular.';
  }
}

/* ── Arranque ───────────────────────────────────────────────────────────── */
function init(){
  if (!document.querySelector('header')){ setTimeout(init, 150); return; }
  marcarWeb();
  mountCentro();
  ajustarPagos();

  let pend = 0;
  const mo = new MutationObserver(() => {
    if (pend) return;
    if ($('#centroWeb') && $('#webBadge')) { ajustarPagos(); return; }
    pend = setTimeout(() => { pend = 0; try { marcarWeb(); mountCentro(); ajustarPagos(); } catch {} }, 70);
  });
  mo.observe(document.documentElement, { childList:true, subtree:true });

  window.ParkopsWeb = { version:V, rutas:RUTAS };
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
else init();

})();
