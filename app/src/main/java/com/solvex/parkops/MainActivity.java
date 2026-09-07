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
import android.util.Base64;
import android.view.View;
import android.view.WindowInsets;
import android.webkit.JavascriptInterface;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Toast;

import java.io.OutputStream;
import java.nio.charset.StandardCharsets;
import java.security.KeyFactory;
import java.security.PublicKey;
import java.security.Signature;
import java.security.spec.X509EncodedKeySpec;

public class MainActivity extends Activity {
    private WebView webView;
    private AndroidBridge bridge;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        getWindow().setStatusBarColor(Color.parseColor("#14171C"));
        getWindow().setNavigationBarColor(Color.parseColor("#1C2128"));
        webView = new WebView(this);
        webView.setBackgroundColor(Color.parseColor("#14171C"));
        webView.setOverScrollMode(View.OVER_SCROLL_NEVER);
        setContentView(webView);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            webView.setOnApplyWindowInsetsListener((v, insets) -> {
                android.graphics.Insets bars = insets.getInsets(WindowInsets.Type.systemBars());
                v.setPadding(bars.left, bars.top, bars.right, bars.bottom);
                return insets;
            });
        } else webView.setFitsSystemWindows(true);

        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setDatabaseEnabled(true);
        settings.setAllowFileAccess(true);
        settings.setAllowContentAccess(true);
        settings.setBuiltInZoomControls(false);
        settings.setDisplayZoomControls(false);
        settings.setSupportZoom(false);
        settings.setMediaPlaybackRequiresUserGesture(true);
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);

        bridge = new AndroidBridge(this);
        webView.addJavascriptInterface(bridge, "AndroidBridge");
        webView.setWebChromeClient(new WebChromeClient());
        webView.setWebViewClient(new WebViewClient() {
            @Override public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                Uri uri = request.getUrl();
                String scheme = uri.getScheme() == null ? "" : uri.getScheme().toLowerCase();
                String host = uri.getHost() == null ? "" : uri.getHost().toLowerCase();
                if (scheme.equals("file")) return false;
                if (scheme.equals("http") || scheme.equals("https") || scheme.equals("mailto") || scheme.equals("tel") || scheme.equals("sms") || scheme.equals("whatsapp")) {
                    openExternal(uri, host); return true;
                }
                return false;
            }
            @SuppressWarnings("deprecation")
            @Override public boolean shouldOverrideUrlLoading(WebView view, String url) {
                Uri uri = Uri.parse(url);
                if ("file".equalsIgnoreCase(uri.getScheme())) return false;
                openExternal(uri, uri.getHost() == null ? "" : uri.getHost()); return true;
            }
        });

        if (bridge.hasValidLicense()) loadLicensedApp(); else loadActivationScreen();
    }

    private void loadLicensedApp() {
        webView.loadUrl("file:///android_asset/index.html");
    }

    private void loadActivationScreen() {
        String html = "<!doctype html><html><head><meta charset='utf-8'><meta name='viewport' content='width=device-width,initial-scale=1'>" +
                "<title>Activación PARKOPS</title><style>" +
                "*{box-sizing:border-box}body{margin:0;background:#14171c;color:#f3f5f7;font-family:Arial,sans-serif;display:flex;min-height:100vh;align-items:center;justify-content:center;padding:24px}" +
                ".card{width:min(620px,100%);background:#1c2128;border:1px solid #343b44;border-radius:20px;padding:28px;box-shadow:0 20px 60px #0008}" +
                "h1{margin:0 0 8px;font-size:28px}.brand{color:#5fd38d;font-weight:800}.muted{color:#a9b2bd;line-height:1.5}" +
                ".idbox{margin:20px 0;background:#11151a;border:1px solid #343b44;border-radius:12px;padding:14px;font-family:monospace;word-break:break-all;font-size:16px}" +
                "textarea{width:100%;min-height:120px;margin-top:10px;background:#11151a;color:#fff;border:1px solid #46505c;border-radius:12px;padding:14px;font-size:14px;resize:vertical}" +
                "button{width:100%;border:0;border-radius:12px;padding:14px 16px;font-size:16px;font-weight:700;cursor:pointer;margin-top:12px;background:#5fd38d;color:#0d1710}" +
                "button.secondary{background:#2a313a;color:#fff;border:1px solid #46505c}.msg{margin-top:14px;min-height:24px;color:#ffcf66}.ok{color:#69e39b}</style></head><body>" +
                "<div class='card'><div class='brand'>SOLVEX SYSTEM JB</div><h1>Activación PARKOPS</h1>" +
                "<p class='muted'>Esta instalación requiere una licencia individual vinculada a este dispositivo. Envíe el ID mostrado al administrador de licencias y pegue aquí la licencia recibida.</p>" +
                "<div class='muted'>ID DEL DISPOSITIVO</div><div id='device' class='idbox'></div>" +
                "<button class='secondary' onclick='AndroidBridge.copyDeviceId()'>Copiar ID del dispositivo</button>" +
                "<label class='muted' style='display:block;margin-top:20px'>LICENCIA</label><textarea id='license' placeholder='Pegue aquí la licencia PARKOPS'></textarea>" +
                "<button onclick='activate()'>Activar esta instalación</button><div id='msg' class='msg'></div></div>" +
                "<script>document.getElementById('device').textContent=AndroidBridge.getDeviceId();function activate(){var k=document.getElementById('license').value.trim();var r=AndroidBridge.activateLicense(k);var m=document.getElementById('msg');m.textContent=r.substring(r.indexOf('|')+1);if(r.indexOf('OK|')===0){m.className='msg ok';setTimeout(function(){AndroidBridge.openLicensedApp()},500)}else{m.className='msg'}}</script>" +
                "</body></html>";
        webView.loadDataWithBaseURL("https://activation.local/", html, "text/html", "UTF-8", null);
    }

    private void openExternal(Uri uri, String host) {
        try {
            Intent intent = new Intent(Intent.ACTION_VIEW, uri);
            if (host.contains("wa.me") || host.contains("whatsapp.com")) {
                intent.setPackage("com.whatsapp");
                try { startActivity(intent); return; } catch (Exception ignored) { intent.setPackage(null); }
            }
            startActivity(intent);
        } catch (Exception e) {
            Toast.makeText(this, "No hay una aplicación disponible para abrir este enlace.", Toast.LENGTH_LONG).show();
        }
    }

    @Override public void onBackPressed() {
        if (webView != null && webView.canGoBack()) webView.goBack(); else super.onBackPressed();
    }

    public static class AndroidBridge {
        private static final String PREFS = "solvex_license";
        private static final String KEY_LICENSE = "license_key";
        private static final String PUBLIC_KEY_DER_B64 = "MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAvXp2hPYZ1ZStB4a6Mhqdhghtmn7F/QVR72yRlzEO69KwY729G0LmqqXIzXaEjrQXBBQ3jGK6s62MAZx7kyTwbM6xj2MwWcLCusEA4RYqDWW0bFZsCJapyMqf6hUvBaAVkT4m9oY7hkZ+aVAsukObeXr1HBUA3pe9Sf17DnRqutGlzFeDR/5NAUBPWrKzURXNiDiWdUhOYF15SzOrEdaS+1qa/RrDefNrxUU/KpPs35PRUkebJmz8ZWji8EjpTLdowErW1zXzo7mXsePqX5acbAv9u0YaItCRg8QwAdDgFoIkYRFY7Lu0T2VI5bD8fnhfqeKeV+IOfTsimPJd5ryhWwIDAQAB";
        private final Context context;
        AndroidBridge(Context context) { this.context = context; }

        @JavascriptInterface public String getDeviceId() {
            String id = Settings.Secure.getString(context.getContentResolver(), Settings.Secure.ANDROID_ID);
            return (id == null || id.trim().isEmpty()) ? "unknown-device" : id;
        }

        @JavascriptInterface public void copyDeviceId() {
            ClipboardManager cm = (ClipboardManager) context.getSystemService(Context.CLIPBOARD_SERVICE);
            if (cm != null) cm.setPrimaryClip(ClipData.newPlainText("PARKOPS Device ID", getDeviceId()));
            ((Activity) context).runOnUiThread(() -> Toast.makeText(context, "ID del dispositivo copiado", Toast.LENGTH_SHORT).show());
        }

        @JavascriptInterface public boolean hasValidLicense() {
            String key = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).getString(KEY_LICENSE, "");
            return validateLicenseInternal(key).startsWith("OK|");
        }

        @JavascriptInterface public String activateLicense(String key) {
            String clean = key == null ? "" : key.trim();
            String result = validateLicenseInternal(clean);
            if (result.startsWith("OK|")) context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit().putString(KEY_LICENSE, clean).apply();
            return result;
        }

        @JavascriptInterface public void openLicensedApp() {
            if (!hasValidLicense()) return;
            ((Activity) context).runOnUiThread(() -> ((MainActivity) context).loadLicensedApp());
        }

        private String validateLicenseInternal(String key) {
            try {
                if (key == null || key.trim().isEmpty()) return "ERROR|Licencia vacía";
                String[] parts = key.trim().split("\\.");
                if (parts.length != 2) return "ERROR|Formato de licencia inválido";
                byte[] payloadBytes = Base64.decode(parts[0], Base64.URL_SAFE | Base64.NO_WRAP | Base64.NO_PADDING);
                byte[] signatureBytes = Base64.decode(parts[1], Base64.URL_SAFE | Base64.NO_WRAP | Base64.NO_PADDING);
                byte[] publicDer = Base64.decode(PUBLIC_KEY_DER_B64, Base64.DEFAULT);
                PublicKey publicKey = KeyFactory.getInstance("RSA").generatePublic(new X509EncodedKeySpec(publicDer));
                Signature verifier = Signature.getInstance("SHA256withRSA");
                verifier.initVerify(publicKey); verifier.update(payloadBytes);
                if (!verifier.verify(signatureBytes)) return "ERROR|Firma de licencia inválida";
                String[] f = new String(payloadBytes, StandardCharsets.UTF_8).split("\\|", -1);
                if (f.length != 6 || !"SVX1".equals(f[0])) return "ERROR|Contenido de licencia inválido";
                String licenseId=f[1], user=f[2], deviceId=f[3], plan=f[4]; long expires=Long.parseLong(f[5]);
                if (!getDeviceId().equals(deviceId)) return "ERROR|La licencia pertenece a otro dispositivo";
                long now=System.currentTimeMillis()/1000L;
                if (expires>0 && now>expires) return "ERROR|La licencia está vencida";
                if (user.trim().isEmpty() || licenseId.trim().isEmpty()) return "ERROR|Licencia incompleta";
                return "OK|Licencia activa · "+user+" · "+plan;
            } catch (Exception e) { return "ERROR|No se pudo validar la licencia"; }
        }

        @JavascriptInterface public void shareText(String text) {
            ((Activity) context).runOnUiThread(() -> {
                Intent send = new Intent(Intent.ACTION_SEND); send.setType("text/plain"); send.putExtra(Intent.EXTRA_TEXT, text);
                context.startActivity(Intent.createChooser(send, "Compartir recibo"));
            });
        }

        @JavascriptInterface public void saveTextFile(String fileName, String mimeType, String content) {
            try {
                String safeName=(fileName==null||fileName.trim().isEmpty())?"parkops_export.txt":fileName.replaceAll("[\\\\/:*?\"<>|]", "_");
                ContentValues values=new ContentValues(); values.put(MediaStore.MediaColumns.DISPLAY_NAME,safeName);
                values.put(MediaStore.MediaColumns.MIME_TYPE,(mimeType==null||mimeType.isEmpty())?"text/plain":mimeType);
                values.put(MediaStore.MediaColumns.RELATIVE_PATH,Environment.DIRECTORY_DOWNLOADS+"/PARKOPS");
                Uri uri=context.getContentResolver().insert(MediaStore.Downloads.EXTERNAL_CONTENT_URI,values);
                if(uri==null) throw new IllegalStateException("No se pudo crear el archivo");
                try(OutputStream out=context.getContentResolver().openOutputStream(uri)){ if(out==null) throw new IllegalStateException("No se pudo abrir el archivo"); out.write(content.getBytes(StandardCharsets.UTF_8)); }
                ((Activity)context).runOnUiThread(()->Toast.makeText(context,"Guardado en Descargas/PARKOPS",Toast.LENGTH_SHORT).show());
            } catch(Exception e){ ((Activity)context).runOnUiThread(()->Toast.makeText(context,"No se pudo guardar el archivo",Toast.LENGTH_LONG).show()); }
        }
    }
}
