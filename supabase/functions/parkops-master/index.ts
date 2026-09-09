import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { ...cors, 'content-type': 'application/json' },
});
const env = (name: string) => {
  const value = Deno.env.get(name);
  if (!value) throw new Error(`Missing environment value ${name}`);
  return value;
};
const clean = (value: unknown) => String(value ?? '').trim();
const cleanPhone = (value: unknown) => clean(value).replace(/[^0-9+]/g, '');
const token = () => {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return 'SVX2.' + btoa(String.fromCharCode(...bytes)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
};
const isoDate = (d: Date) => d.toISOString().slice(0, 10);
const addDays = (days: number) => {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + days);
  return isoDate(d);
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  try {
    const url = env('SUPABASE_URL');
    const anon = env('SUPABASE_ANON_KEY');
    const service = env('SUPABASE_SERVICE_ROLE_KEY');
    const admin = createClient(url, service, { auth: { persistSession: false, autoRefreshToken: false } });
    const body = await req.json();
    const action = clean(body.action);

    if (action === 'activate_license') {
      const licenseKey = clean(body.license_key);
      const deviceId = clean(body.device_id);
      if (!licenseKey || !deviceId) return json({ error: 'Licencia e ID del dispositivo son obligatorios' }, 400);
      const { data: lic, error } = await admin
        .from('licencias')
        .select('id,cliente_id,clave,tipo,estado,fecha_vencimiento,dias_gracia,device_id,clientes(nombre_negocio,contacto,celular)')
        .eq('clave', licenseKey)
        .maybeSingle();
      if (error) throw error;
      if (!lic) return json({ error: 'Licencia no encontrada' }, 404);
      if (lic.estado !== 'activa') return json({ error: 'Licencia suspendida o cancelada' }, 403);
      if (clean(lic.device_id) !== deviceId) return json({ error: 'La licencia pertenece a otro dispositivo' }, 403);
      const limit = new Date(`${lic.fecha_vencimiento}T23:59:59Z`);
      limit.setUTCDate(limit.getUTCDate() + Number(lic.dias_gracia || 0));
      if (Date.now() > limit.getTime()) return json({ error: 'Licencia vencida' }, 403);
      const customer: any = Array.isArray((lic as any).clientes) ? (lic as any).clientes[0] : (lic as any).clientes;
      return json({
        ok: true,
        license_id: lic.id,
        plan_code: lic.tipo,
        expires_at: lic.fecha_vencimiento,
        customer_name: customer?.nombre_negocio || customer?.contacto || 'CLIENTE',
      });
    }

    const auth = req.headers.get('authorization') || '';
    if (!auth.startsWith('Bearer ')) return json({ error: 'Unauthorized' }, 401);
    const userClient = createClient(url, anon, { global: { headers: { Authorization: auth } } });
    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) return json({ error: 'Unauthorized' }, 401);
    const { data: ownerRow } = await admin.from('platform_owners').select('user_id').eq('user_id', user.id).eq('active', true).maybeSingle();
    if (!ownerRow) return json({ error: 'Forbidden' }, 403);

    if (action === 'owner_bootstrap') return json({ email: user.email, user_id: user.id });

    if (action === 'owner_dashboard') {
      const [{ data: customers, error: ce }, { data: licenseRows, error: le }] = await Promise.all([
        admin.from('clientes').select('*').order('creado_en', { ascending: false }),
        admin.from('licencias').select('*').order('creado_en', { ascending: false }).limit(2000),
      ]);
      if (ce) throw ce;
      if (le) throw le;
      const organizations = (customers || []).map((c: any) => ({
        id: c.id,
        trade_name: c.nombre_negocio,
        legal_name: c.contacto || c.nombre_negocio,
        phone: c.celular || '',
        email: c.email || '',
        created_at: c.creado_en,
      }));
      const customerMap = new Map(organizations.map((o: any) => [o.id, o]));
      const planMap: Record<string, string> = { mensual: 'monthly', anual: 'annual', vitalicia: 'lifetime', personalizada: 'custom', dia: 'custom', alquiler: 'custom' };
      const licenses = (licenseRows || []).map((l: any) => {
        const c: any = customerMap.get(l.cliente_id);
        return {
          organization_id: l.cliente_id,
          license_id: l.id,
          device_id: l.device_id || '',
          plan_code: planMap[l.tipo] || l.tipo,
          license_key: l.clave,
          revoked_at: l.estado === 'cancelada' ? l.actualizado_en : '',
          status: l.estado,
          expires_at: l.fecha_vencimiento,
          trade_name: c?.trade_name || '—',
          owner_name: c?.legal_name || c?.trade_name || '—',
          phone: c?.phone || '',
        };
      });
      const today = isoDate(new Date());
      const active = licenses.filter((l: any) => l.status === 'activa' && l.expires_at >= today);
      return json({
        metrics: { clients: organizations.length, active_licenses: active.length, active_devices: active.filter((x: any) => x.device_id).length, mrr_cop: 0 },
        organizations,
        licenses,
      });
    }

    if (action === 'create_owner_customer') {
      const name = clean(body.owner_name);
      const phone = cleanPhone(body.phone);
      const email = clean(body.email).toLowerCase() || null;
      if (!name || !phone) return json({ error: 'Nombre del propietario y celular son obligatorios' }, 400);
      const { data: customer, error } = await admin.from('clientes').insert({
        nombre_negocio: name,
        contacto: name,
        celular: phone,
        email,
      }).select().single();
      if (error) throw error;
      return json({ organization: { id: customer.id, trade_name: customer.nombre_negocio, legal_name: customer.contacto, phone: customer.celular, email: customer.email || '', created_at: customer.creado_en } });
    }

    if (action === 'issue_license') {
      const customerId = clean(body.organization_id);
      const deviceId = clean(body.device_id);
      const plan = clean(body.plan_code) || 'annual';
      if (!customerId || !deviceId) return json({ error: 'Cliente y ANDROID_ID son obligatorios' }, 400);
      const { data: customer, error: customerError } = await admin.from('clientes').select('*').eq('id', customerId).single();
      if (customerError) throw customerError;
      let tipo = '';
      let expiry = '';
      if (plan === 'monthly') { tipo = 'mensual'; expiry = addDays(31); }
      else if (plan === 'annual') { tipo = 'anual'; expiry = addDays(366); }
      else if (plan === 'lifetime') { tipo = 'vitalicia'; expiry = '2099-12-31'; }
      else if (plan === 'custom') { const days = Math.max(1, Number(body.days || 1)); tipo = 'personalizada'; expiry = addDays(days); }
      else return json({ error: 'Plan inválido' }, 400);
      const licenseKey = token();
      const { data: lic, error } = await admin.from('licencias').insert({
        cliente_id: customerId,
        clave: licenseKey,
        tipo,
        estado: 'activa',
        fecha_inicio: isoDate(new Date()),
        fecha_vencimiento: expiry,
        dias_gracia: 5,
        device_id: deviceId,
      }).select().single();
      if (error) throw error;
      return json({
        license_id: lic.id,
        license_key: licenseKey,
        expires_at: expiry,
        phone: customer.celular || '',
        owner_name: customer.contacto || customer.nombre_negocio || 'CLIENTE',
      });
    }

    if (action === 'revoke_license') {
      const id = clean(body.license_id);
      if (!id) return json({ error: 'license_id obligatorio' }, 400);
      const { error } = await admin.from('licencias').update({ estado: 'cancelada', actualizado_en: new Date().toISOString() }).eq('id', id);
      if (error) throw error;
      return json({ ok: true });
    }

    return json({ error: 'Unknown action' }, 400);
  } catch (e) {
    console.error(e);
    return json({ error: e instanceof Error ? e.message : 'Internal error' }, 500);
  }
});