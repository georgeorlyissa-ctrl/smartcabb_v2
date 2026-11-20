package com.smartcabb.app;

import android.graphics.Color;
import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // La WebView charge le site distant : tant que la page n'a pas peint,
        // son fond par défaut est blanc. On le peint en bleu nuit SmartCabb
        // pour que la transition splash natif -> préchargeur web soit continue.
        if (getBridge() != null && getBridge().getWebView() != null) {
            getBridge().getWebView().setBackgroundColor(Color.parseColor("#0D3145"));
        }
    }
}
