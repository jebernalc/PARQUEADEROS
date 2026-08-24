package com.solvex.parkops;

import android.app.Activity;
import android.content.ContentValues;
import android.content.Context;
import android.content.Intent;
import android.graphics.Color;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.Environment;
import android.provider.MediaStore;
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

public class MainActivity extends Activity {
    private WebView webView;

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
        } else {
            webView.setFitsSystemWindows(true);
        }

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

        webView.addJavascriptInterface(new AndroidBridge(this), "AndroidBridge");
        webView.setWebChromeClient(new WebChromeClient());
        webView.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                Uri uri = request.getUrl();
                String scheme = uri.getScheme() == null ? "" : uri.getScheme().toLowerCase();
                String host = uri.getHost() == null ? "" : uri.getHost().toLowerCase();
                if (scheme.equals("file")) return false;
                if (scheme.equals("http") || scheme.equals("https") || scheme.equals("mailto") ||
                        scheme.equals("tel") || scheme.equals("sms") || scheme.equals("whatsapp")) {
                    openExternal(uri, host);
                    return true;
                }
                return false;
            }

            @SuppressWarnings("deprecation")
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, String url) {
                Uri uri = Uri.parse(url);
                if ("file".equalsIgnoreCase(uri.getScheme())) return false;
                openExternal(uri, uri.getHost() == null ? "" : uri.getHost());
                return true;
            }
        });
        webView.loadUrl("file:///android_asset/index.html");
    }

    private void openExternal(Uri uri, String host) {
        try {
            Intent intent = new Intent(Intent.ACTION_VIEW, uri);
            if (host.contains("wa.me") || host.contains("whatsapp.com")) {
                intent.setPackage("com.whatsapp");
                try {
                    startActivity(intent);
                    return;
                } catch (Exception ignored) {
                    intent.setPackage(null);
                }
            }
            startActivity(intent);
        } catch (Exception e) {
            Toast.makeText(this, "No hay una aplicación disponible para abrir este enlace.", Toast.LENGTH_LONG).show();
        }
    }

    @Override
    public void onBackPressed() {
        if (webView != null && webView.canGoBack()) webView.goBack();
        else super.onBackPressed();
    }

    public static class AndroidBridge {
        private final Context context;
        AndroidBridge(Context context) { this.context = context; }

        @JavascriptInterface
        public void shareText(String text) {
            ((Activity) context).runOnUiThread(() -> {
                Intent send = new Intent(Intent.ACTION_SEND);
                send.setType("text/plain");
                send.putExtra(Intent.EXTRA_TEXT, text);
                context.startActivity(Intent.createChooser(send, "Compartir recibo"));
            });
        }

        @JavascriptInterface
        public void saveTextFile(String fileName, String mimeType, String content) {
            try {
                String safeName = (fileName == null || fileName.trim().isEmpty()) ? "parkops_export.txt" : fileName.replaceAll("[\\\\/:*?\"<>|]", "_");
                ContentValues values = new ContentValues();
                values.put(MediaStore.MediaColumns.DISPLAY_NAME, safeName);
                values.put(MediaStore.MediaColumns.MIME_TYPE, (mimeType == null || mimeType.isEmpty()) ? "text/plain" : mimeType);
                values.put(MediaStore.MediaColumns.RELATIVE_PATH, Environment.DIRECTORY_DOWNLOADS + "/PARKOPS");
                Uri uri = context.getContentResolver().insert(MediaStore.Downloads.EXTERNAL_CONTENT_URI, values);
                if (uri == null) throw new IllegalStateException("No se pudo crear el archivo");
                try (OutputStream out = context.getContentResolver().openOutputStream(uri)) {
                    if (out == null) throw new IllegalStateException("No se pudo abrir el archivo");
                    out.write(content.getBytes(StandardCharsets.UTF_8));
                }
                ((Activity) context).runOnUiThread(() -> Toast.makeText(context, "Guardado en Descargas/PARKOPS", Toast.LENGTH_SHORT).show());
            } catch (Exception e) {
                ((Activity) context).runOnUiThread(() -> Toast.makeText(context, "No se pudo guardar el archivo", Toast.LENGTH_LONG).show());
            }
        }
    }
}
