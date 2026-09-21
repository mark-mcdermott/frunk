package com.frunk.app;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    @Override
    public void onCreate(Bundle savedInstanceState) {
        // Registered before the bridge is built so its load() runs ahead of the first
        // navigation — see WebAuthnSupport.
        registerPlugin(WebAuthnSupport.class);
        super.onCreate(savedInstanceState);
    }
}
