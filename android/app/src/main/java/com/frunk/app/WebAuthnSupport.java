package com.frunk.app;

import android.util.Log;
import android.webkit.WebSettings;
import android.webkit.WebView;
import androidx.webkit.WebSettingsCompat;
import androidx.webkit.WebViewFeature;
import com.getcapacitor.Plugin;
import com.getcapacitor.annotation.CapacitorPlugin;

/**
 * Opts the WebView into WebAuthn before the first page loads.
 *
 * Android's WebView refuses `navigator.credentials` unless the app asks for it and is
 * associated with the relying party through Digital Asset Links
 * (public/.well-known/assetlinks.json names this package and its signing certificate).
 * The ask has to land before the page's JavaScript context exists, and Capacitor
 * initialises plugins before it navigates, which is why this is a plugin rather than a
 * line in MainActivity.onCreate — from there the setting arrived after the load and the
 * page reported "WebAuthn is not supported in this browser".
 */
@CapacitorPlugin(name = "WebAuthnSupport")
public class WebAuthnSupport extends Plugin {

    @Override
    public void load() {
        boolean supported = WebViewFeature.isFeatureSupported(WebViewFeature.WEB_AUTHENTICATION);
        Log.i("WebAuthnSupport", "WebView " + WebView.getCurrentWebViewPackage().versionName
            + " advertises WEB_AUTHENTICATION: " + supported);
        if (!supported) return;
        WebSettings settings = getBridge().getWebView().getSettings();
        WebSettingsCompat.setWebAuthenticationSupport(
            settings,
            WebSettingsCompat.WEB_AUTHENTICATION_SUPPORT_FOR_APP
        );
        Log.i("WebAuthnSupport", "support after setting: "
            + WebSettingsCompat.getWebAuthenticationSupport(settings));
    }
}
