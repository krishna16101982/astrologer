import { Capacitor, registerPlugin } from '@capacitor/core';

/**
 * Earpiece / loudspeaker routing for voice calls.
 *
 * Backed by the native AudioRoute plugin (AudioRoutePlugin.java). The web layer cannot
 * move WebRTC audio off the loudspeaker on Android, so every method here is a no-op in
 * a browser and the call screen falls back to whatever the platform chooses.
 */
export interface AudioRoutePlugin {
  /** Enter call audio mode and pick the starting route. */
  startCall(options: { speaker: boolean }): Promise<{ speakerOn: boolean }>;
  /** Flip between earpiece and loudspeaker mid-call. */
  setSpeaker(options: { on: boolean }): Promise<{ speakerOn: boolean }>;
  /** Hand audio back to the rest of the system. */
  stopCall(): Promise<void>;
}

const plugin = registerPlugin<AudioRoutePlugin>('AudioRoute');

const isNative = () => Capacitor.isNativePlatform();

export const AudioRoute = {
  async startCall(speaker: boolean): Promise<boolean> {
    if (!isNative()) return speaker;
    try {
      const res = await plugin.startCall({ speaker });
      return !!res?.speakerOn;
    } catch (err) {
      console.warn('[AudioRoute] startCall failed', err);
      return speaker;
    }
  },

  async setSpeaker(on: boolean): Promise<boolean> {
    if (!isNative()) return on;
    try {
      const res = await plugin.setSpeaker({ on });
      // The resolved value is what the system actually settled on, which is not always
      // what was asked for — a device with no earpiece stays on the speaker.
      return !!res?.speakerOn;
    } catch (err) {
      console.warn('[AudioRoute] setSpeaker failed', err);
      return on;
    }
  },

  async stopCall(): Promise<void> {
    if (!isNative()) return;
    try {
      await plugin.stopCall();
    } catch (err) {
      console.warn('[AudioRoute] stopCall failed', err);
    }
  }
};
