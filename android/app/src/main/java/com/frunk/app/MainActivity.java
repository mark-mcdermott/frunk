package com.frunk.app;

import android.os.Bundle;
import android.webkit.WebSettings;
import androidx.webkit.WebSettingsCompat;
import androidx.webkit.WebViewFeature;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // Android's WebView refuses WebAuthn unless the app opts in here and is associated
        // with the relying party through Digital Asset Links
        // (public/.well-known/assetlinks.json names this package and its signing
        // certificate). The iOS shell's equivalent is the Associated Domains entitlement.
        if (WebViewFeature.isFeatureSupported(WebViewFeature.WEB_AUTHENTICATION)) {
            WebSettings settings = getBridge().getWebView().getSettings();
            WebSettingsCompat.setWebAuthenticationSupport(
                settings,
                WebSettingsCompat.WEB_AUTHENTICATION_SUPPORT_FOR_APP
            );
        }
    }
}
