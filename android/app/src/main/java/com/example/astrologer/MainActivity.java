package com.example.astrologer;

import android.os.Bundle;
import android.webkit.WebSettings;
import android.webkit.WebView;

import com.getcapacitor.BridgeActivity;
import com.getcapacitor.BridgeWebChromeClient;

public class MainActivity extends BridgeActivity {

    @Override
    public void onCreate(Bundle savedInstanceState) {

        super.onCreate(savedInstanceState);

        WebView webView = this.bridge.getWebView();

        WebSettings settings = webView.getSettings();

        settings.setJavaScriptEnabled(true);

        settings.setMediaPlaybackRequiresUserGesture(false);

        settings.setDomStorageEnabled(true);

        settings.setAllowFileAccess(true);

        settings.setAllowContentAccess(true);

        settings.setMixedContentMode(
            WebSettings.MIXED_CONTENT_ALWAYS_ALLOW
        );

        // IMPORTANT FOR TWILIO + WEBRTC and the profile-image file picker.
        //
        // Keep Capacitor's own BridgeWebChromeClient — do NOT replace it with a bare
        // WebChromeClient. Its default onShowFileChooser drives the <input type="file">
        // picker (profile image upload), and its default onPermissionRequest requests
        // the OS-level RECORD_AUDIO permission before granting the WebRTC mic to the
        // page. A hand-rolled onPermissionRequest that just calls request.grant()
        // authorises only the web layer, leaving the app process without the Android
        // runtime mic permission, so a Twilio call's getUserMedia() captures nothing on
        // a fresh install. Setting a plain BridgeWebChromeClient(bridge) gives us both
        // behaviours correctly, so we intentionally add no overrides here.
        webView.setWebChromeClient(new BridgeWebChromeClient(this.bridge));

    }

}