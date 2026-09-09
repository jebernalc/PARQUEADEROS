package com.solvex.parkops.owner;

import android.app.Activity;
import android.content.ClipData;
import android.content.ClipboardManager;
import android.content.Intent;
import android.graphics.Color;
import android.net.Uri;
import android.os.Bundle;
import android.text.Editable;
import android.text.InputType;
import android.text.TextWatcher;
import android.view.ViewGroup;
import android.widget.ArrayAdapter;
import android.widget.Button;
import android.widget.EditText;
import android.widget.LinearLayout;
import android.widget.ScrollView;
import android.widget.Spinner;
import android.widget.TextView;
import android.widget.Toast;

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.BufferedReader;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

public class MainActivity extends Activity {
    private static final int BG=Color.rgb(20,23,28), CARD=Color.rgb(28,33,40), TEXT=Color.WHITE, MUTED=Color.LTGRAY;
    private static final String SUPABASE_URL="https://epadzsrfsvckyjugcvpd.supabase.co";
    private static final String PUBLISHABLE_KEY="sb_publishable_PxFa4vMqovqCIDOwEsoiBQ_2q2jETc_";
    private static final String DEFAULT_EMAIL="jebernalc2036@gmail.com";
    private final ExecutorService io=Executors.newSingleThreadExecutor();
    private LinearLayout root;
    private String token="";
    private final List<JSONObject> organizations=new ArrayList<>(), licenses=new ArrayList<>();

    @Override protected void onCreate(Bundle b){super.onCreate(b);getWindow().setStatusBarColor(BG);showLogin();}
    private TextView txt(String s,int sp){TextView v=new TextView(this);v.setText(s);v.setTextColor(TEXT);v.setTextSize(sp);v.setPadding(0,9,0,9);return v;}
    private EditText input(String h){EditText e=new EditText(this);e.setHint(h);e.setTextColor(TEXT);e.setHintTextColor(MUTED);e.setSingleLine(true);return e;}
    private Button btn(String s){Button b=new Button(this);b.setText(s);return b;}
    private void shell(){ScrollView sc=new ScrollView(this);sc.setBackgroundColor(BG);root=new LinearLayout(this);root.setOrientation(LinearLayout.VERTICAL);root.setPadding(26,24,26,40);sc.addView(root,new ScrollView.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT,ViewGroup.LayoutParams.WRAP_CONTENT));setContentView(sc);}
    private void toast(String s){runOnUiThread(()->Toast.makeText(this,s,Toast.LENGTH_LONG).show());}
    private LinearLayout card(){LinearLayout c=new LinearLayout(this);c.setOrientation(LinearLayout.VERTICAL);c.setPadding(18,14,18,14);c.setBackgroundColor(CARD);LinearLayout.LayoutParams lp=new LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT,ViewGroup.LayoutParams.WRAP_CONTENT);lp.setMargins(0,8,0,8);c.setLayoutParams(lp);return c;}

    private void showLogin(){
        shell();root.addView(txt("SOLVEX · OWNER LICENSE MANAGER",25));TextView s=txt("Administración privada de clientes y licencias PARKOPS",14);s.setTextColor(MUTED);root.addView(s);
        EditText email=input("Correo del propietario"),pass=input("Contraseña");pass.setInputType(InputType.TYPE_CLASS_TEXT|InputType.TYPE_TEXT_VARIATION_PASSWORD);
        email.setText(getPreferences(MODE_PRIVATE).getString("email",DEFAULT_EMAIL));
        root.addView(email);root.addView(pass);
        Button login=btn("INGRESAR COMO PROPIETARIO"),recover=btn("RECUPERAR CONTRASEÑA");root.addView(login);root.addView(recover);
        TextView info=txt("La conexión con Supabase ya está configurada. Solo necesitas tu correo y contraseña.",13);info.setTextColor(MUTED);root.addView(info);
        login.setOnClickListener(v->{String em=email.getText().toString().trim(),pw=pass.getText().toString();if(em.isEmpty()||pw.isEmpty()){toast("Completa correo y contraseña");return;}getPreferences(MODE_PRIVATE).edit().putString("email",em).apply();login.setEnabled(false);io.execute(()->login(em,pw));});
        recover.setOnClickListener(v->{String em=email.getText().toString().trim();if(em.isEmpty()){toast("Escribe el correo del propietario");return;}recover.setEnabled(false);io.execute(()->recoverPassword(em,recover));});
    }

    private void recoverPassword(String email,Button button){
        try{request("POST",SUPABASE_URL+"/auth/v1/recover",new JSONObject().put("email",email),false);toast("Correo de recuperación solicitado. Revisa la bandeja de entrada y spam de "+email+".");}
        catch(Exception e){toast("No se pudo solicitar la recuperación: "+e.getMessage());}
        finally{runOnUiThread(()->button.setEnabled(true));}
    }

    private void login(String email,String password){try{JSONObject r=request("POST",SUPABASE_URL+"/auth/v1/token?grant_type=password",new JSONObject().put("email",email).put("password",password),false);token=r.optString("access_token","");if(token.isEmpty())throw new Exception(r.optString("error_description",r.optString("msg","No se pudo iniciar sesión")));JSONObject boot=master(new JSONObject().put("action","owner_bootstrap"));if(boot.has("error"))throw new Exception(boot.optString("error"));loadDashboard();}catch(Exception e){toast("Acceso rechazado: "+e.getMessage());runOnUiThread(this::showLogin);}}

    private void loadDashboard() throws Exception{
        JSONObject d=master(new JSONObject().put("action","owner_dashboard"));if(d.has("error"))throw new Exception(d.optString("error"));organizations.clear();licenses.clear();JSONArray oa=d.optJSONArray("organizations"),la=d.optJSONArray("licenses");if(oa!=null)for(int i=0;i<oa.length();i++)organizations.add(oa.getJSONObject(i));if(la!=null)for(int i=0;i<la.length();i++)licenses.add(la.getJSONObject(i));JSONObject metrics=d.optJSONObject("metrics");runOnUiThread(()->showHome(metrics));
    }

    private void showHome(JSONObject metrics){
        shell();root.addView(txt("SOLVEX · ADMINISTRADOR DE LICENCIAS",23));if(metrics!=null)root.addView(txt("Clientes: "+metrics.optInt("clients")+"   ·   Licencias activas: "+metrics.optInt("active_licenses")+"   ·   Dispositivos: "+metrics.optInt("active_devices"),14));
        Button newCustomer=btn("+ REGISTRAR NUEVO CLIENTE"),generate=btn("GENERAR NUEVA LICENCIA"),clients=btn("CLIENTES Y LICENCIAS"),refresh=btn("ACTUALIZAR INFORMACIÓN"),logout=btn("CERRAR SESIÓN");
        root.addView(newCustomer);root.addView(generate);root.addView(clients);root.addView(refresh);root.addView(logout);
        TextView info=txt("Flujo: registrar cliente → copiar ANDROID_ID desde PARKOPS → generar licencia → enviar por WhatsApp. La licencia queda ligada a ese dispositivo.",14);info.setTextColor(MUTED);root.addView(info);
        newCustomer.setOnClickListener(v->showNewCustomer());generate.setOnClickListener(v->showGenerator(-1));clients.setOnClickListener(v->showClients());refresh.setOnClickListener(v->io.execute(()->{try{loadDashboard();}catch(Exception e){toast(e.getMessage());}}));logout.setOnClickListener(v->{token="";showLogin();});
    }

    private void showNewCustomer(){
        shell();root.addView(txt("REGISTRAR NUEVO CLIENTE",23));EditText name=input("Nombre del propietario / cliente"),phone=input("Celular con indicativo, ej. 573001234567"),email=input("Correo del cliente (opcional)");phone.setInputType(InputType.TYPE_CLASS_PHONE);email.setInputType(InputType.TYPE_TEXT_VARIATION_EMAIL_ADDRESS);root.addView(name);root.addView(phone);root.addView(email);Button save=btn("GUARDAR CLIENTE"),back=btn("VOLVER");root.addView(save);root.addView(back);back.setOnClickListener(v->showHome(null));
        save.setOnClickListener(v->{String n=name.getText().toString().trim(),p=cleanPhone(phone.getText().toString()),em=email.getText().toString().trim();if(n.isEmpty()||p.isEmpty()){toast("Nombre y celular son obligatorios");return;}save.setEnabled(false);io.execute(()->{try{JSONObject r=master(new JSONObject().put("action","create_owner_customer").put("owner_name",n).put("phone",p).put("email",em));if(r.has("error"))throw new Exception(r.optString("error"));toast("Cliente registrado correctamente");loadDashboard();}catch(Exception e){toast("No se pudo registrar: "+e.getMessage());runOnUiThread(()->save.setEnabled(true));}});});
    }

    private void showGenerator(int preset){
        shell();root.addView(txt("GENERAR LICENCIA ÚNICA",23));if(organizations.isEmpty()){root.addView(txt("Primero registra un cliente.",16));Button b=btn("REGISTRAR CLIENTE");root.addView(b);b.setOnClickListener(v->showNewCustomer());return;}
        List<String> names=new ArrayList<>();for(JSONObject o:organizations)names.add(o.optString("trade_name","Cliente")+" · "+o.optString("phone","sin celular"));Spinner clients=new Spinner(this);clients.setAdapter(new ArrayAdapter<>(this,android.R.layout.simple_spinner_dropdown_item,names));if(preset>=0&&preset<names.size())clients.setSelection(preset);root.addView(clients);
        EditText device=input("ANDROID_ID enviado por el cliente");root.addView(device);Spinner plan=new Spinner(this);String[] plans={"annual","monthly","lifetime","custom"};plan.setAdapter(new ArrayAdapter<>(this,android.R.layout.simple_spinner_dropdown_item,plans));root.addView(plan);EditText days=input("Días, solo para custom");days.setInputType(InputType.TYPE_CLASS_NUMBER);root.addView(days);
        Button gen=btn("GENERAR LICENCIA"),copy=btn("COPIAR LICENCIA"),wa=btn("ENVIAR POR WHATSAPP AL CLIENTE");TextView result=txt("",13);result.setTextIsSelectable(true);result.setPadding(14,16,14,16);result.setBackgroundColor(CARD);copy.setEnabled(false);wa.setEnabled(false);root.addView(gen);root.addView(result);root.addView(copy);root.addView(wa);final String[] holder={"","","",""};
        gen.setOnClickListener(v->{int pos=clients.getSelectedItemPosition();String dev=device.getText().toString().trim(),pl=(String)plan.getSelectedItem();if(dev.isEmpty()){toast("Pega el ANDROID_ID");return;}gen.setEnabled(false);io.execute(()->{try{JSONObject q=new JSONObject().put("action","issue_license").put("organization_id",organizations.get(pos).getString("id")).put("device_id",dev).put("plan_code",pl);if("custom".equals(pl)){String ds=days.getText().toString().trim();if(ds.isEmpty())throw new Exception("Indica los días");q.put("days",Integer.parseInt(ds));}JSONObject r=master(q);if(r.has("error"))throw new Exception(r.optString("error"));holder[0]=r.getString("license_key");holder[1]=r.optString("license_id");holder[2]=r.optString("owner_name",organizations.get(pos).optString("trade_name","Cliente"));holder[3]=r.optString("phone",organizations.get(pos).optString("phone",""));String exp=r.optString("expires_at","");runOnUiThread(()->{result.setText("Cliente: "+holder[2]+"\nLicencia ID: "+holder[1]+"\nVence: "+exp+"\n\n"+holder[0]);copy.setEnabled(true);wa.setEnabled(true);gen.setEnabled(true);});}catch(Exception e){toast("No se pudo generar: "+e.getMessage());runOnUiThread(()->gen.setEnabled(true));}});});
        copy.setOnClickListener(v->copyLicense(holder[0]));wa.setOnClickListener(v->sendWhatsApp(holder[3],holder[2],holder[1],holder[0]));Button back=btn("VOLVER");root.addView(back);back.setOnClickListener(v->showHome(null));
    }

    private void showClients(){shell();root.addView(txt("CLIENTES Y LICENCIAS",23));EditText search=input("Buscar por nombre, celular, ID dispositivo o licencia");root.addView(search);LinearLayout list=new LinearLayout(this);list.setOrientation(LinearLayout.VERTICAL);root.addView(list);renderClients(list,"");search.addTextChangedListener(new TextWatcher(){public void beforeTextChanged(CharSequence s,int st,int c,int a){}public void onTextChanged(CharSequence s,int st,int b,int c){renderClients(list,s.toString());}public void afterTextChanged(Editable e){}});Button back=btn("VOLVER");root.addView(back);back.setOnClickListener(v->showHome(null));}

    private void renderClients(LinearLayout list,String query){
        list.removeAllViews();String q=query==null?"":query.trim().toLowerCase(Locale.ROOT);int shown=0;
        for(int oi=0;oi<organizations.size();oi++){JSONObject o=organizations.get(oi);String id=o.optString("id"),name=o.optString("trade_name",o.optString("legal_name","Cliente")),phone=o.optString("phone","");List<JSONObject> own=new ArrayList<>();for(JSONObject l:licenses)if(id.equals(l.optString("organization_id")))own.add(l);StringBuilder hay=new StringBuilder(name).append(' ').append(phone);for(JSONObject l:own)hay.append(' ').append(l.optString("device_id")).append(' ').append(l.optString("license_id")).append(' ').append(l.optString("license_key"));if(!q.isEmpty()&&!hay.toString().toLowerCase(Locale.ROOT).contains(q))continue;shown++;LinearLayout c=card();c.addView(txt(name,18));TextView ph=txt("Celular: "+(phone.isEmpty()?"—":phone)+"   ·   Licencias: "+own.size(),13);ph.setTextColor(MUTED);c.addView(ph);int pos=oi;Button newLic=btn("NUEVA LICENCIA PARA ESTE CLIENTE");c.addView(newLic);newLic.setOnClickListener(v->showGenerator(pos));for(JSONObject l:own){LinearLayout lc=card();String lid=l.optString("license_id"),dev=l.optString("device_id"),plan=l.optString("plan_code"),key=l.optString("license_key"),rev=l.optString("revoked_at","");lc.addView(txt(lid+" · "+plan+(rev.isEmpty()?"":" · CANCELADA"),14));TextView d=txt("Dispositivo: "+dev+" · Vence: "+l.optString("expires_at","—"),12);d.setTextColor(MUTED);lc.addView(d);Button resend=btn("REENVIAR ESTA LICENCIA POR WHATSAPP"),copy=btn("COPIAR LICENCIA"),revoke=btn("CANCELAR LICENCIA");lc.addView(resend);lc.addView(copy);lc.addView(revoke);resend.setEnabled(!key.isEmpty()&&!phone.isEmpty()&&rev.isEmpty());copy.setEnabled(!key.isEmpty());revoke.setEnabled(rev.isEmpty());resend.setOnClickListener(v->sendWhatsApp(phone,name,lid,key));copy.setOnClickListener(v->copyLicense(key));revoke.setOnClickListener(v->io.execute(()->{try{JSONObject r=master(new JSONObject().put("action","revoke_license").put("license_id",lid));if(r.has("error"))throw new Exception(r.optString("error"));toast("Licencia cancelada");loadDashboard();}catch(Exception e){toast("No se pudo cancelar: "+e.getMessage());}}));c.addView(lc);}list.addView(c);}
        if(shown==0){TextView n=txt("No se encontraron clientes o licencias.",15);n.setTextColor(MUTED);list.addView(n);}
    }

    private void copyLicense(String key){if(key==null||key.isEmpty())return;ClipboardManager cm=(ClipboardManager)getSystemService(CLIPBOARD_SERVICE);cm.setPrimaryClip(ClipData.newPlainText("Licencia PARKOPS",key));toast("Licencia copiada");}
    private String cleanPhone(String p){if(p==null)return "";String x=p.replaceAll("[^0-9]","");if(x.startsWith("00"))x=x.substring(2);return x;}
    private void sendWhatsApp(String phone,String name,String licenseId,String license){String p=cleanPhone(phone);if(p.isEmpty()){toast("El cliente no tiene celular registrado");return;}String msg="Hola "+name+", esta es su licencia PARKOPS.\n\nLicencia ID: "+licenseId+"\n\n"+license+"\n\nEsta licencia corresponde al dispositivo registrado. Guárdela para futuras reinstalaciones en el mismo equipo.";Uri u=Uri.parse("https://wa.me/"+p+"?text="+Uri.encode(msg));try{Intent i=new Intent(Intent.ACTION_VIEW,u);i.setPackage("com.whatsapp");startActivity(i);}catch(Exception e){try{startActivity(new Intent(Intent.ACTION_VIEW,u));}catch(Exception ex){toast("No se pudo abrir WhatsApp");}}}

    private JSONObject master(JSONObject body)throws Exception{return request("POST",SUPABASE_URL+"/functions/v1/parkops-master",body,true);}
    private JSONObject request(String method,String endpoint,JSONObject body,boolean auth)throws Exception{HttpURLConnection c=(HttpURLConnection)new URL(endpoint).openConnection();c.setRequestMethod(method);c.setConnectTimeout(15000);c.setReadTimeout(20000);c.setDoOutput(true);c.setRequestProperty("Content-Type","application/json");c.setRequestProperty("apikey",PUBLISHABLE_KEY);if(auth)c.setRequestProperty("Authorization","Bearer "+token);try(OutputStream os=c.getOutputStream()){os.write(body.toString().getBytes(StandardCharsets.UTF_8));}int code=c.getResponseCode();InputStream is=code>=200&&code<300?c.getInputStream():c.getErrorStream();StringBuilder sb=new StringBuilder();if(is!=null)try(BufferedReader br=new BufferedReader(new InputStreamReader(is,StandardCharsets.UTF_8))){String line;while((line=br.readLine())!=null)sb.append(line);}c.disconnect();JSONObject r=sb.length()==0?new JSONObject():new JSONObject(sb.toString());if(code<200||code>=300)throw new Exception(r.optString("error",r.optString("msg",r.optString("error_description","HTTP "+code))));return r;}
}
