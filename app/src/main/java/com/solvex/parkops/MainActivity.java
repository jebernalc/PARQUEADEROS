package com.solvex.parkops;

import android.app.Activity;
import android.content.ClipData;
import android.content.ClipboardManager;
import android.content.ContentValues;
import android.content.Context;
import android.content.Intent;
import android.graphics.Color;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.Environment;
import android.provider.MediaStore;
import android.provider.Settings;
import android.view.View;
import android.view.WindowInsets;
import android.webkit.JavascriptInterface;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Toast;

import org.json.JSONObject;

import java.io.BufferedReader;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

public class MainActivity extends Activity {
    private static final String SUPABASE_URL="https://epadzsrfsvckyjugcvpd.supabase.co";
    private static final String PUBLISHABLE_KEY="sb_publishable_PxFa4vMqovqCIDOwEsoiBQ_2q2jETc_";
    private WebView webView;
    private AndroidBridge bridge;

    @Override protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        getWindow().setStatusBarColor(Color.parseColor("#14171C"));
        getWindow().setNavigationBarColor(Color.parseColor("#1C2128"));
        webView=new WebView(this);webView.setBackgroundColor(Color.parseColor("#14171C"));webView.setOverScrollMode(View.OVER_SCROLL_NEVER);setContentView(webView);
        if(Build.VERSION.SDK_INT>=Build.VERSION_CODES.R){webView.setOnApplyWindowInsetsListener((v,insets)->{android.graphics.Insets bars=insets.getInsets(WindowInsets.Type.systemBars());v.setPadding(bars.left,bars.top,bars.right,bars.bottom);return insets;});}else webView.setFitsSystemWindows(true);
        WebSettings settings=webView.getSettings();settings.setJavaScriptEnabled(true);settings.setDomStorageEnabled(true);settings.setDatabaseEnabled(true);settings.setAllowFileAccess(true);settings.setAllowContentAccess(true);settings.setBuiltInZoomControls(false);settings.setDisplayZoomControls(false);settings.setSupportZoom(false);settings.setMediaPlaybackRequiresUserGesture(true);settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        bridge=new AndroidBridge(this);webView.addJavascriptInterface(bridge,"AndroidBridge");webView.setWebChromeClient(new WebChromeClient());webView.setWebViewClient(new WebViewClient(){
            @Override public boolean shouldOverrideUrlLoading(WebView view,WebResourceRequest request){Uri uri=request.getUrl();String scheme=uri.getScheme()==null?"":uri.getScheme().toLowerCase();String host=uri.getHost()==null?"":uri.getHost().toLowerCase();if(scheme.equals("file"))return false;if(scheme.equals("http")||scheme.equals("https")||scheme.equals("mailto")||scheme.equals("tel")||scheme.equals("sms")||scheme.equals("whatsapp")){openExternal(uri,host);return true;}return false;}
            @SuppressWarnings("deprecation") @Override public boolean shouldOverrideUrlLoading(WebView view,String url){Uri uri=Uri.parse(url);if("file".equalsIgnoreCase(uri.getScheme()))return false;openExternal(uri,uri.getHost()==null?"":uri.getHost());return true;}
        });
        if(bridge.hasValidLicense())loadLicensedApp();else loadActivationScreen();
    }

    private void loadLicensedApp(){webView.loadUrl("file:///android_asset/index.html");}

    private void loadActivationScreen(){
        String saved=bridge.getSavedLicense();
        String html="<!doctype html><html><head><meta charset='utf-8'><meta name='viewport' content='width=device-width,initial-scale=1'><title>Activación PARKOPS</title><style>"+
                "*{box-sizing:border-box}body{margin:0;background:#14171c;color:#f3f5f7;font-family:Arial,sans-serif;display:flex;min-height:100vh;align-items:center;justify-content:center;padding:24px}.card{width:min(620px,100%);background:#1c2128;border:1px solid #343b44;border-radius:20px;padding:28px;box-shadow:0 20px 60px #0008}h1{margin:0 0 8px;font-size:28px}.brand{color:#5fd38d;font-weight:800}.muted{color:#a9b2bd;line-height:1.5}.idbox{margin:20px 0;background:#11151a;border:1px solid #343b44;border-radius:12px;padding:14px;font-family:monospace;word-break:break-all;font-size:16px}textarea{width:100%;min-height:110px;margin-top:10px;background:#11151a;color:#fff;border:1px solid #46505c;border-radius:12px;padding:14px;font-size:14px;resize:vertical}button{width:100%;border:0;border-radius:12px;padding:14px 16px;font-size:16px;font-weight:700;cursor:pointer;margin-top:12px;background:#5fd38d;color:#0d1710}button.secondary{background:#2a313a;color:#fff;border:1px solid #46505c}.msg{margin-top:14px;min-height:24px;color:#ffcf66}.ok{color:#69e39b}</style></head><body>"+
                "<div class='card'><div class='brand'>SOLVEX SYSTEM JB</div><h1>Activación PARKOPS</h1><p class='muted'>Esta instalación requiere una licencia única vinculada a este teléfono. Copia el ID, envíalo al administrador y pega la licencia recibida.</p><div class='muted'>ID DEL DISPOSITIVO</div><div id='device' class='idbox'></div><button class='secondary' onclick='AndroidBridge.copyDeviceId()'>Copiar ID del dispositivo</button><label class='muted' style='display:block;margin-top:20px'>LICENCIA</label><textarea id='license' placeholder='Pegue aquí la licencia PARKOPS'></textarea><button id='activate' onclick='activate()'>Validar y activar</button><div id='msg' class='msg'></div></div>"+
                "<script>document.getElementById('device').textContent=AndroidBridge.getDeviceId();document.getElementById('license').value="+JSONObject.quote(saved)+";function activate(){var k=document.getElementById('license').value.trim(),m=document.getElementById('msg'),b=document.getElementById('activate');if(!k){m.textContent='Pega la licencia recibida';return}b.disabled=true;m.textContent='Validando licencia con SOLVEX…';AndroidBridge.activateLicenseAsync(k)}function onLicenseResult(ok,msg){var m=document.getElementById('msg'),b=document.getElementById('activate');m.textContent=msg;m.className=ok?'msg ok':'msg';b.disabled=false;if(ok)setTimeout(function(){AndroidBridge.openLicensedApp()},500)}</script></body></html>";
        webView.loadDataWithBaseURL("https://activation.local/",html,"text/html","UTF-8",null);
    }

    private void openExternal(Uri uri,String host){try{Intent intent=new Intent(Intent.ACTION_VIEW,uri);if(host.contains("wa.me")||host.contains("whatsapp.com")){intent.setPackage("com.whatsapp");try{startActivity(intent);return;}catch(Exception ignored){intent.setPackage(null);}}startActivity(intent);}catch(Exception e){Toast.makeText(this,"No hay una aplicación disponible para abrir este enlace.",Toast.LENGTH_LONG).show();}}
    @Override public void onBackPressed(){if(webView!=null&&webView.canGoBack())webView.goBack();else super.onBackPressed();}

    public static class AndroidBridge {
        private static final String PREFS="solvex_license",KEY_LICENSE="license_key",KEY_EXPIRY="expires_at";
        private final MainActivity context;
        private final ExecutorService io=Executors.newSingleThreadExecutor();
        AndroidBridge(MainActivity context){this.context=context;}
        @JavascriptInterface public String getDeviceId(){String id=Settings.Secure.getString(context.getContentResolver(),Settings.Secure.ANDROID_ID);return(id==null||id.trim().isEmpty())?"unknown-device":id;}
        @JavascriptInterface public void copyDeviceId(){ClipboardManager cm=(ClipboardManager)context.getSystemService(Context.CLIPBOARD_SERVICE);if(cm!=null)cm.setPrimaryClip(ClipData.newPlainText("PARKOPS Device ID",getDeviceId()));context.runOnUiThread(()->Toast.makeText(context,"ID del dispositivo copiado",Toast.LENGTH_SHORT).show());}
        @JavascriptInterface public String getSavedLicense(){return context.getSharedPreferences(PREFS,Context.MODE_PRIVATE).getString(KEY_LICENSE,"");}
        @JavascriptInterface public boolean hasValidLicense(){String key=getSavedLicense(),expiry=context.getSharedPreferences(PREFS,Context.MODE_PRIVATE).getString(KEY_EXPIRY,"");if(key.isEmpty()||expiry.isEmpty())return false;try{return !LocalDate.now().isAfter(LocalDate.parse(expiry));}catch(Exception e){return false;}}
        @JavascriptInterface public void activateLicenseAsync(String key){String clean=key==null?"":key.trim();io.execute(()->{boolean ok=false;String message;try{JSONObject body=new JSONObject().put("action","activate_license").put("license_key",clean).put("device_id",getDeviceId());JSONObject r=request(body);if(!r.optBoolean("ok",false))throw new Exception(r.optString("error","Licencia inválida"));String expiry=r.optString("expires_at","");String customer=r.optString("customer_name","CLIENTE");context.getSharedPreferences(PREFS,Context.MODE_PRIVATE).edit().putString(KEY_LICENSE,clean).putString(KEY_EXPIRY,expiry).apply();ok=true;message="Licencia activa · "+customer+" · vence "+expiry;}catch(Exception e){message=e.getMessage()==null?"No se pudo validar la licencia":e.getMessage();}final boolean result=ok;final String msg=message;context.runOnUiThread(()->context.webView.evaluateJavascript("window.onLicenseResult("+result+","+JSONObject.quote(msg)+")",null));});}
        private JSONObject request(JSONObject body)throws Exception{HttpURLConnection c=(HttpURLConnection)new URL(SUPABASE_URL+"/functions/v1/parkops-master").openConnection();c.setRequestMethod("POST");c.setConnectTimeout(15000);c.setReadTimeout(20000);c.setDoOutput(true);c.setRequestProperty("Content-Type","application/json");c.setRequestProperty("apikey",PUBLISHABLE_KEY);try(OutputStream os=c.getOutputStream()){os.write(body.toString().getBytes(StandardCharsets.UTF_8));}int code=c.getResponseCode();InputStream is=code>=200&&code<300?c.getInputStream():c.getErrorStream();StringBuilder sb=new StringBuilder();if(is!=null)try(BufferedReader br=new BufferedReader(new InputStreamReader(is,StandardCharsets.UTF_8))){String line;while((line=br.readLine())!=null)sb.append(line);}c.disconnect();JSONObject r=sb.length()==0?new JSONObject():new JSONObject(sb.toString());if(code<200||code>=300)throw new Exception(r.optString("error","HTTP "+code));return r;}
        @JavascriptInterface public void openLicensedApp(){if(!hasValidLicense())return;context.runOnUiThread(context::loadLicensedApp);}
        @JavascriptInterface public void shareText(String text){context.runOnUiThread(()->{Intent send=new Intent(Intent.ACTION_SEND);send.setType("text/plain");send.putExtra(Intent.EXTRA_TEXT,text);context.startActivity(Intent.createChooser(send,"Compartir recibo"));});}
        @JavascriptInterface public void saveTextFile(String fileName,String mimeType,String content){try{String safeName=(fileName==null||fileName.trim().isEmpty())?"parkops_export.txt":fileName.replaceAll("[\\\\/:*?\"<>|]","_");ContentValues values=new ContentValues();values.put(MediaStore.MediaColumns.DISPLAY_NAME,safeName);values.put(MediaStore.MediaColumns.MIME_TYPE,(mimeType==null||mimeType.isEmpty())?"text/plain":mimeType);values.put(MediaStore.MediaColumns.RELATIVE_PATH,Environment.DIRECTORY_DOWNLOADS+"/PARKOPS");Uri uri=context.getContentResolver().insert(MediaStore.Downloads.EXTERNAL_CONTENT_URI,values);if(uri==null)throw new IllegalStateException("No se pudo crear el archivo");try(OutputStream out=context.getContentResolver().openOutputStream(uri)){if(out==null)throw new IllegalStateException("No se pudo abrir el archivo");out.write(content.getBytes(StandardCharsets.UTF_8));}context.runOnUiThread(()->Toast.makeText(context,"Guardado en Descargas/PARKOPS",Toast.LENGTH_SHORT).show());}catch(Exception e){context.runOnUiThread(()->Toast.makeText(context,"No se pudo guardar el archivo",Toast.LENGTH_LONG).show());}}
    }
}
