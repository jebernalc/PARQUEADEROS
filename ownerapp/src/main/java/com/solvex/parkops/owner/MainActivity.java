package com.solvex.parkops.owner;

import android.app.Activity;
import android.content.ClipData;
import android.content.ClipboardManager;
import android.content.Context;
import android.content.Intent;
import android.graphics.Color;
import android.net.Uri;
import android.os.Bundle;
import android.text.InputType;
import android.view.Gravity;
import android.view.View;
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
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

public class MainActivity extends Activity {
    private static final int BG = Color.rgb(20,23,28), CARD = Color.rgb(28,33,40), TEXT = Color.WHITE;
    private final ExecutorService io = Executors.newSingleThreadExecutor();
    private LinearLayout root;
    private String supabaseUrl, anonKey, token;
    private final List<String> orgIds = new ArrayList<>(), orgNames = new ArrayList<>();

    @Override protected void onCreate(Bundle b) {
        super.onCreate(b);
        getWindow().setStatusBarColor(BG);
        showLogin();
    }

    private TextView title(String s, int sp) {
        TextView v=new TextView(this); v.setText(s); v.setTextColor(TEXT); v.setTextSize(sp); v.setPadding(0,10,0,10); return v;
    }
    private EditText input(String hint) {
        EditText e=new EditText(this); e.setHint(hint); e.setTextColor(TEXT); e.setHintTextColor(Color.LTGRAY); e.setSingleLine(true); return e;
    }
    private Button button(String text) { Button b=new Button(this); b.setText(text); return b; }
    private void shell() {
        ScrollView sc=new ScrollView(this); sc.setBackgroundColor(BG);
        root=new LinearLayout(this); root.setOrientation(LinearLayout.VERTICAL); root.setPadding(28,28,28,40);
        sc.addView(root,new ScrollView.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT,ViewGroup.LayoutParams.WRAP_CONTENT)); setContentView(sc);
    }
    private void toast(String s){runOnUiThread(()->Toast.makeText(this,s,Toast.LENGTH_LONG).show());}

    private void showLogin(){
        shell();
        root.addView(title("SOLVEX · LICENSE MANAGER",26));
        root.addView(title("Consola privada del propietario",16));
        TextView help=title("Genera licencias únicas para PARKOPS. La clave privada permanece protegida en el servidor maestro.",14); help.setTextColor(Color.LTGRAY); root.addView(help);
        EditText url=input("Supabase Project URL"); EditText key=input("Supabase anon/publishable key"); EditText email=input("Correo del propietario"); EditText pass=input("Contraseña"); pass.setInputType(InputType.TYPE_CLASS_TEXT|InputType.TYPE_TEXT_VARIATION_PASSWORD);
        String savedUrl=getPreferences(MODE_PRIVATE).getString("url",""); String savedKey=getPreferences(MODE_PRIVATE).getString("key","");
        url.setText(savedUrl); key.setText(savedKey);
        root.addView(url); root.addView(key); root.addView(email); root.addView(pass);
        Button login=button("INGRESAR COMO PROPIETARIO"); root.addView(login);
        login.setOnClickListener(v->{
            supabaseUrl=url.getText().toString().trim().replaceAll("/+$",""); anonKey=key.getText().toString().trim();
            String em=email.getText().toString().trim(), pw=pass.getText().toString();
            if(supabaseUrl.isEmpty()||anonKey.isEmpty()||em.isEmpty()||pw.isEmpty()){toast("Completa todos los campos");return;}
            getPreferences(MODE_PRIVATE).edit().putString("url",supabaseUrl).putString("key",anonKey).apply();
            login.setEnabled(false); io.execute(()->login(em,pw));
        });
    }

    private void login(String email,String password){
        try{
            JSONObject req=new JSONObject().put("email",email).put("password",password);
            JSONObject res=request("POST",supabaseUrl+"/auth/v1/token?grant_type=password",req,false);
            token=res.optString("access_token",""); if(token.isEmpty()) throw new Exception(res.optString("error_description","No se pudo iniciar sesión"));
            JSONObject boot=master(new JSONObject().put("action","owner_bootstrap")); if(boot.has("error")) throw new Exception(boot.optString("error"));
            loadDashboard();
        }catch(Exception e){toast("Acceso rechazado: "+e.getMessage()); runOnUiThread(this::showLogin);}
    }

    private void loadDashboard() throws Exception{
        JSONObject d=master(new JSONObject().put("action","owner_dashboard")); if(d.has("error")) throw new Exception(d.optString("error"));
        JSONArray a=d.optJSONArray("organizations"); orgIds.clear(); orgNames.clear();
        if(a!=null) for(int i=0;i<a.length();i++){JSONObject o=a.getJSONObject(i); orgIds.add(o.getString("id")); orgNames.add(o.optString("trade_name",o.optString("legal_name","Cliente")));}
        runOnUiThread(()->showGenerator(d.optJSONObject("metrics")));
    }

    private void showGenerator(JSONObject metrics){
        shell(); root.addView(title("SOLVEX · GENERADOR DE LICENCIAS",24));
        if(metrics!=null){root.addView(title("Clientes: "+metrics.optInt("clients")+"   ·   Licencias activas: "+metrics.optInt("active_licenses"),14));}
        if(orgNames.isEmpty()){TextView x=title("No hay clientes creados. Créelos primero desde la consola maestra web.",16); x.setTextColor(Color.YELLOW); root.addView(x); return;}
        Spinner clients=new Spinner(this); ArrayAdapter<String> ca=new ArrayAdapter<>(this,android.R.layout.simple_spinner_dropdown_item,orgNames); clients.setAdapter(ca); root.addView(clients);
        EditText device=input("ANDROID_ID enviado por el comprador"); EditText label=input("Nombre del dispositivo (opcional)"); root.addView(device); root.addView(label);
        Spinner plan=new Spinner(this); String[] plans={"annual","monthly","lifetime","custom"}; plan.setAdapter(new ArrayAdapter<>(this,android.R.layout.simple_spinner_dropdown_item,plans)); root.addView(plan);
        EditText days=input("Días (solo para custom)"); days.setInputType(InputType.TYPE_CLASS_NUMBER); root.addView(days);
        Button gen=button("GENERAR LICENCIA ÚNICA"); root.addView(gen);
        TextView result=title("",13); result.setTextIsSelectable(true); result.setPadding(12,18,12,18); result.setBackgroundColor(CARD); root.addView(result);
        Button copy=button("COPIAR LICENCIA"); Button share=button("COMPARTIR"); Button wa=button("ENVIAR POR WHATSAPP"); copy.setEnabled(false); share.setEnabled(false); wa.setEnabled(false); root.addView(copy); root.addView(share); root.addView(wa);
        final String[] keyHolder={""};
        gen.setOnClickListener(v->{String dev=device.getText().toString().trim(); if(dev.isEmpty()){toast("Pega el ANDROID_ID");return;} gen.setEnabled(false); io.execute(()->{
            try{String p=(String)plan.getSelectedItem(); JSONObject q=new JSONObject().put("action","issue_license").put("organization_id",orgIds.get(clients.getSelectedItemPosition())).put("device_id",dev).put("label",label.getText().toString().trim()).put("plan_code",p); if("custom".equals(p)) q.put("days",Integer.parseInt(days.getText().toString().trim())); JSONObject r=master(q); if(r.has("error"))throw new Exception(r.optString("error")); String k=r.getString("license_key"), lid=r.optString("license_id"); keyHolder[0]=k; runOnUiThread(()->{result.setText("Licencia: "+lid+"\n\n"+k); copy.setEnabled(true); share.setEnabled(true); wa.setEnabled(true); gen.setEnabled(true);});}catch(Exception e){toast("No se pudo generar: "+e.getMessage());runOnUiThread(()->gen.setEnabled(true));}
        });});
        copy.setOnClickListener(v->{ClipboardManager cm=(ClipboardManager)getSystemService(CLIPBOARD_SERVICE);cm.setPrimaryClip(ClipData.newPlainText("Licencia PARKOPS",keyHolder[0]));toast("Licencia copiada");});
        share.setOnClickListener(v->shareLicense(keyHolder[0],false)); wa.setOnClickListener(v->shareLicense(keyHolder[0],true));
        Button refresh=button("ACTUALIZAR CLIENTES"); root.addView(refresh); refresh.setOnClickListener(v->io.execute(()->{try{loadDashboard();}catch(Exception e){toast(e.getMessage());}}));
        Button logout=button("CERRAR SESIÓN"); root.addView(logout); logout.setOnClickListener(v->{token=null;showLogin();});
    }

    private void shareLicense(String license,boolean whatsapp){
        if(license==null||license.isEmpty())return; String txt="Licencia PARKOPS:\n"+license;
        try{Intent i=new Intent(Intent.ACTION_SEND); i.setType("text/plain"); i.putExtra(Intent.EXTRA_TEXT,txt); if(whatsapp)i.setPackage("com.whatsapp"); startActivity(whatsapp?i:Intent.createChooser(i,"Enviar licencia"));}
        catch(Exception e){if(whatsapp){Intent i=new Intent(Intent.ACTION_VIEW, Uri.parse("https://wa.me/?text="+Uri.encode(txt)));startActivity(i);}else toast("No se pudo compartir");}
    }

    private JSONObject master(JSONObject body)throws Exception{return request("POST",supabaseUrl+"/functions/v1/parkops-master",body,true);}
    private JSONObject request(String method,String endpoint,JSONObject body,boolean auth)throws Exception{
        HttpURLConnection c=(HttpURLConnection)new URL(endpoint).openConnection(); c.setRequestMethod(method); c.setConnectTimeout(15000); c.setReadTimeout(20000); c.setDoOutput(true); c.setRequestProperty("Content-Type","application/json"); c.setRequestProperty("apikey",anonKey); if(auth)c.setRequestProperty("Authorization","Bearer "+token);
        try(OutputStream os=c.getOutputStream()){os.write(body.toString().getBytes(StandardCharsets.UTF_8));}
        int code=c.getResponseCode(); InputStream is=code>=200&&code<300?c.getInputStream():c.getErrorStream(); StringBuilder sb=new StringBuilder(); if(is!=null)try(BufferedReader br=new BufferedReader(new InputStreamReader(is,StandardCharsets.UTF_8))){String line;while((line=br.readLine())!=null)sb.append(line);} c.disconnect();
        JSONObject r=sb.length()==0?new JSONObject():new JSONObject(sb.toString()); if(code<200||code>=300)throw new Exception(r.optString("error",r.optString("msg","HTTP "+code))); return r;
    }
}
