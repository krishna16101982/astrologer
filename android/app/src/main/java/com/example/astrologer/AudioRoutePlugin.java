package com.example.astrologer;

import android.content.Context;
import android.media.AudioDeviceInfo;
import android.media.AudioManager;
import android.os.Build;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.util.List;

/**
 * Earpiece / loudspeaker routing for voice calls.
 *
 * A WebView has no say in where WebRTC audio comes out — Android routes it to the
 * loudspeaker by default, and nothing in the web layer can move it, so a consultation
 * always played out loud with no way to switch. Routing is an AudioManager decision,
 * which only native code can make.
 *
 * Two APIs are needed. setSpeakerphoneOn was deprecated in Android 12 and is ignored on
 * some newer builds, so from API 31 the route is chosen with setCommunicationDevice and
 * the old call is kept only as the pre-12 path.
 *
 * MODE_IN_COMMUNICATION is what makes the earpiece a legal destination at all, and it
 * also gives the call the in-call volume stream and proximity behaviour users expect.
 * It must be returned to MODE_NORMAL afterwards or the rest of the phone's audio stays
 * quiet and routed oddly once the call ends.
 */
@CapacitorPlugin(name = "AudioRoute")
public class AudioRoutePlugin extends Plugin {

    private AudioManager audioManager() {
        return (AudioManager) getContext().getSystemService(Context.AUDIO_SERVICE);
    }

    /** Applies the route and reports back what the system actually settled on. */
    private JSObject applyRoute(AudioManager am, boolean speakerOn) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            int wanted = speakerOn
                ? AudioDeviceInfo.TYPE_BUILTIN_SPEAKER
                : AudioDeviceInfo.TYPE_BUILTIN_EARPIECE;

            AudioDeviceInfo match = null;
            List<AudioDeviceInfo> devices = am.getAvailableCommunicationDevices();
            for (AudioDeviceInfo device : devices) {
                if (device.getType() == wanted) {
                    match = device;
                    break;
                }
            }

            if (match != null) {
                am.setCommunicationDevice(match);
            } else if (!speakerOn) {
                // A tablet with no earpiece: clearing falls back to the system default
                // rather than leaving the previous device pinned.
                am.clearCommunicationDevice();
            }
        } else {
            am.setSpeakerphoneOn(speakerOn);
        }

        JSObject result = new JSObject();
        result.put("speakerOn", isSpeakerActive(am));
        return result;
    }

    private boolean isSpeakerActive(AudioManager am) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            AudioDeviceInfo current = am.getCommunicationDevice();
            return current != null && current.getType() == AudioDeviceInfo.TYPE_BUILTIN_SPEAKER;
        }
        return am.isSpeakerphoneOn();
    }

    /** Enter call audio mode and pick the starting route. */
    @PluginMethod
    public void startCall(PluginCall call) {
        AudioManager am = audioManager();
        if (am == null) {
            call.reject("AudioManager unavailable");
            return;
        }

        boolean speakerOn = Boolean.TRUE.equals(call.getBoolean("speaker", false));
        am.setMode(AudioManager.MODE_IN_COMMUNICATION);
        call.resolve(applyRoute(am, speakerOn));
    }

    /** Flip between earpiece and loudspeaker during a call. */
    @PluginMethod
    public void setSpeaker(PluginCall call) {
        AudioManager am = audioManager();
        if (am == null) {
            call.reject("AudioManager unavailable");
            return;
        }

        if (am.getMode() != AudioManager.MODE_IN_COMMUNICATION) {
            am.setMode(AudioManager.MODE_IN_COMMUNICATION);
        }

        boolean speakerOn = Boolean.TRUE.equals(call.getBoolean("on", false));
        call.resolve(applyRoute(am, speakerOn));
    }

    /** Hand audio back to the rest of the system. */
    @PluginMethod
    public void stopCall(PluginCall call) {
        AudioManager am = audioManager();
        if (am == null) {
            call.resolve();
            return;
        }

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            am.clearCommunicationDevice();
        } else {
            am.setSpeakerphoneOn(false);
        }

        am.setMode(AudioManager.MODE_NORMAL);
        call.resolve();
    }
}
