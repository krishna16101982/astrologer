import { Component, NgZone, OnDestroy, OnInit } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import {
  AlertController,
  IonContent,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonSpinner,
  IonButtons,
  IonButton
} from '@ionic/angular/standalone';
import { ApiService } from 'src/app/services/api-service';
import { VoiceCallService } from 'src/app/services/voice-call.service';
import { WalletService } from 'src/app/services/wallet.service';
import { AudioRoute } from 'src/app/services/audio-route';

@Component({
  selector: 'app-voice-call',
  templateUrl: './voice-call.page.html',
  styleUrls: ['./voice-call.page.scss'],
  standalone: true,
  imports: [CommonModule, IonContent, IonHeader, IonToolbar, IonTitle, IonSpinner, IonButtons, IonButton]
})
export class VoiceCallPage implements OnInit, OnDestroy {

  astrologerName = '';
  astrologerImage = '';
  callStatus = 'Connecting...';
  callDurationSeconds = 0;
  isMuted = false;
  /**
   * Starts on the earpiece, like any other phone call. Android routes WebView WebRTC
   * audio to the loudspeaker by default, which put every consultation on speaker with
   * no way to turn it off — change the startCall argument below to flip the default.
   */
  isSpeakerOn = false;
  isCallActive = false;
  isEnding = false;
  walletBalance = '';

  private timerInterval: any;
  private billingInterval: any;

  /** Reference point for the call event timeline (see logCallEvent). */
  private dialledAt = Date.now();

  constructor(
    private router: Router,
    private apiService: ApiService,
    private alertController: AlertController,
    private ngZone: NgZone,
    public voiceCallService: VoiceCallService,
    private walletService: WalletService
  ) {}

  ngOnInit() {
    const svc = this.voiceCallService;

    if (!svc.activeCall) {
      this.router.navigate(['/home']);
      return;
    }

    this.astrologerName  = svc.astrologerName;
    this.astrologerImage = svc.astrologerImage;
    this.dialledAt = Date.now();
    this.logCallEvent('page opened (dial already sent)');

    // Unblock audio elements on mobile (needed for Android WebView)
    setTimeout(() => {
      try {
        document.querySelectorAll('audio').forEach((a: any) => {
          a.muted = false;
          a.volume = 1;
          a.setAttribute('playsinline', 'true');
          a.play().catch(() => {});
        });
      } catch (_) {}
    }, 1500);

    svc.activeCall.on('ringing', (hasEarlyMedia: boolean) => {
      this.logCallEvent(`ringing (hasEarlyMedia=${hasEarlyMedia})`);
      this.ngZone.run(() => { this.callStatus = 'Ringing...'; });
    });

    // The timer, the billing base (callStartTime) and the billing ping all start HERE
    // and nowhere else, so nothing is charged before the call is answered. If the call
    // is never answered, callStartTime stays null and endCallApi() bills zero.
    svc.activeCall.on('accept', () => {
      this.logCallEvent('accept — timer and billing start now');

      // Claim call audio only once there is a call to route. Doing it earlier would
      // put the phone in communication mode while it was still ringing.
      AudioRoute.startCall(this.isSpeakerOn).then(applied => {
        this.ngZone.run(() => { this.isSpeakerOn = applied; });
      });

      this.ngZone.run(() => {
        this.callStatus   = 'Connected';
        this.isCallActive = true;
        svc.callStartTime = new Date();
        this.startTimer();
        // Start billing ping with Twilio's real CallSid (matches reference JS)
        const callSid = (svc.activeCall as any)?.parameters?.CallSid || '';
        if (callSid) {
          this.startBillingPing(callSid);
        }
      });
    });

    svc.activeCall.on('disconnect', async () => {
      this.logCallEvent('disconnect');
      this.ngZone.run(async () => {
        this.callStatus = 'Call Ended';
        this.clearTimers();
        await this.endCallApi();
      });
    });

    // cancel and reject both end the call before it is ever answered, so there is
    // nothing to bill — callStartTime is still null and endCallApi() is skipped.
    // cleanup() is still required: without it the Twilio Device is never destroyed
    // and its signalling websocket stays open, so every declined call leaks one.
    svc.activeCall.on('cancel', async () => {
      this.logCallEvent('cancel');
      this.ngZone.run(async () => {
        this.callStatus = 'Call Cancelled';
        this.cleanup();
        await this.showAlert('Call Cancelled', 'The call was cancelled.');
        this.router.navigate(['/home']);
      });
    });

    svc.activeCall.on('reject', async () => {
      this.logCallEvent('reject');
      this.ngZone.run(async () => {
        this.callStatus = 'Call Rejected';
        this.cleanup();
        await this.showAlert('Call Rejected', 'The astrologer rejected the call.');
        this.router.navigate(['/home']);
      });
    });

    svc.activeCall.on('reconnecting', () => {
      this.ngZone.run(() => { this.callStatus = 'Reconnecting...'; });
    });

    svc.activeCall.on('reconnected', () => {
      this.ngZone.run(() => { this.callStatus = 'Connected'; });
    });

    svc.activeCall.on('error', async (err: any) => {
      this.ngZone.run(async () => {
        console.error('Call error', err);
        this.callStatus = 'Connection Error';
        await this.showAlert('Call Error', err?.message || 'Connection error occurred.');
      });
    });
  }

  ngOnDestroy() {
    this.clearTimers();
  }

  // ── Call event timeline ───────────────────────────────────────
  //
  // Whether Twilio's `accept` coincides with the astrologer actually picking up is
  // decided by the TwiML's answerOnBridge setting, which the app cannot inspect.
  // Logging each event with its offset from the dial makes one real test call
  // decisive:
  //
  //   ringing at +1s, then accept at +9s   -> the astrologer picked up at +9s, so
  //                                           billing already starts at pickup.
  //   accept at +1s with no ringing        -> Twilio answered the caller leg while
  //                                           the astrologer was still ringing, and
  //                                           the wait is being billed. The fix is
  //                                           <Dial answerOnBridge="true"> in the
  //                                           backend's TwiML — it cannot be done
  //                                           from the app.
  private logCallEvent(name: string) {
    const offset = ((Date.now() - this.dialledAt) / 1000).toFixed(1);
    console.log(`[VOICE TIMELINE] +${offset}s  ${name}`);
  }

  // ── Timer ──────────────────────────────────────────────────────

  private startTimer() {
    this.timerInterval = setInterval(() => {
      this.ngZone.run(() => { this.callDurationSeconds++; });
    }, 1000);
  }

  private clearTimers() {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
    if (this.billingInterval) {
      clearInterval(this.billingInterval);
      this.billingInterval = null;
    }
  }

  get formattedDuration(): string {
    const m = Math.floor(this.callDurationSeconds / 60);
    const s = this.callDurationSeconds % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }

  // ── Billing ping every 60 s (matches reference JS startBillingPing) ──

  private startBillingPing(sid: string) {
    this.billingInterval = setInterval(async () => {
      try {
        const res: any = await firstValueFrom(this.apiService.callBillingPing(sid));
        if (res?.remaining_balance !== undefined) {
          const bal = parseFloat(res.remaining_balance);
          this.ngZone.run(() => {
            this.walletBalance = bal.toFixed(2);
            this.walletService.setBalance(bal);
          });
        }
      } catch (err: any) {
        console.error('[VOICE] billing ping FAILED —', this.describeHttpError(err));
        if (err?.status === 402) {
          this.ngZone.run(async () => {
            await this.showAlert('Low Balance', 'Insufficient balance. Call is ending.');
            this.voiceCallService.device?.disconnectAll();
          });
        }
      }
    }, 60000);
  }

  // ── Mute ──────────────────────────────────────────────────────

  toggleMute() {
    this.isMuted = !this.isMuted;
    this.voiceCallService.activeCall?.mute(this.isMuted);
  }

  // ── Speaker ───────────────────────────────────────────────────

  /**
   * The button reflects the route the system actually applied, not the one requested —
   * a device with no earpiece stays on the loudspeaker, and showing "Earpiece" then
   * would be a lie.
   */
  async toggleSpeaker() {
    const applied = await AudioRoute.setSpeaker(!this.isSpeakerOn);
    this.ngZone.run(() => { this.isSpeakerOn = applied; });
  }

  // ── Hang up — uses device.disconnectAll() (matches reference JS) ──

  async hangUp() {
    if (this.isEnding) return;
    this.isEnding = true;
    this.clearTimers();
    const device = this.voiceCallService.device;
    if (device) {
      // disconnectAll fires the 'disconnect' event → endCallApi()
      device.disconnectAll();
    } else {
      await this.endCallApi();
    }
  }

  // ── End-call API + cleanup ────────────────────────────────────

  async endCallApi() {
    const svc = this.voiceCallService;
    try {
      const callRequestId = svc.callRequestId;
      if (!callRequestId) {
        this.cleanup();
        this.router.navigate(['/home']);
        return;
      }

      const endTime: any    = new Date();
      const diffMs          = endTime - (svc.callStartTime || endTime);
      const elapsedMinutes  = parseFloat((diffMs / 60000).toFixed(4));

      // NOTE: /consultations/end-call is deliberately NOT called.
      //
      // The server settles the call itself from its own Twilio callback, writing a
      // "Final Voice Call charge" debit. Posting end-call as well wrote a second,
      // separate "Voice call consultation" debit — the customer paid for every call
      // twice. Wallet transactions 240 (₹170.89) and 242 (₹200.00), one second apart
      // for the same 1.7-minute call, are the evidence.
      //
      // The failures this endpoint used to return were the server defending itself:
      // 400 "already been completed" when its callback won the race, and 422 for
      // sub-minute calls. Only when the app's post succeeded did the double charge
      // land. The right move is not to send it at all.
      //
      // If the backend later confirms the app should own settlement, restore the call
      // here — the endCall() method in ApiService is untouched.
      console.log(`[VOICE] call ${callRequestId} ended after ${elapsedMinutes} min — ` +
        `settlement left to the server`);

      this.cleanup();
      await this.showSettledSummary(elapsedMinutes);

    } catch (err: any) {
      console.error('[VOICE] end-of-call handling failed —', this.describeHttpError(err));
      this.cleanup();
      this.router.navigate(['/home']);
    }
  }

  /**
   * Shown when the server settled the call before the app could. The cost is not in
   * the error body, so the authoritative remaining balance is re-read and reported
   * rather than guessed from the app's own timer.
   */
  private async showSettledSummary(elapsedMinutes: number) {
    const lines = [`Duration: ${this.formattedDuration} (${this.round2(elapsedMinutes)} min)`];

    // The cost is not known here — the server prices the call from Twilio's own
    // duration — so the authoritative balance is re-read rather than guessed. Give the
    // settlement a moment to land first, or the balance read races the callback and
    // shows the pre-call figure.
    await new Promise(resolve => setTimeout(resolve, 1500));

    try {
      const res: any = await firstValueFrom(this.apiService.getWalletBalance());
      const bal = res?.data?.wallet_balance ?? res?.wallet_balance;
      if (bal !== undefined) {
        this.walletService.setBalance(parseFloat(bal));
        lines.push(`Remaining Balance: ₹${this.round2(bal)}`);
      }
    } catch (err: any) {
      console.error('[VOICE] balance refresh after call failed —', this.describeHttpError(err));
    }

    const alert = await this.alertController.create({
      header: 'Call Ended',
      message: lines.join('\n'),
      cssClass: 'call-summary-alert',
      buttons: [{ text: 'OK', handler: () => { this.router.navigate(['/home']); } }]
    });
    await alert.present();
  }

  /**
   * Money and durations come back as raw floats — 6.393600000000001 and
   * 4279.256399999999 both reached the customer's screen before this.
   */
  private round2(value: any): string {
    const n = Number(value);
    return Number.isFinite(n) ? n.toFixed(2) : String(value);
  }

  // ── Helpers ───────────────────────────────────────────────────

  /**
   * Turns a thrown value into something a log is actually useful for.
   *
   * Logging the error object itself is useless in a production build: the minifier
   * renames the class, so the console shows a bare `mn` with no status, URL, or body —
   * which is exactly what the first round of call testing produced. This pulls out the
   * fields that identify the failure, and distinguishes an HTTP error from a
   * client-side exception thrown while handling the response.
   */
  private describeHttpError(err: any): string {
    if (err?.status !== undefined || err?.url) {
      const body = typeof err.error === 'string'
        ? err.error.slice(0, 300)
        : JSON.stringify(err.error ?? {}).slice(0, 300);
      return `HTTP ${err.status} ${err.statusText || ''} url=${err.url || '?'} body=${body}`;
    }
    return `${err?.name || 'Error'}: ${err?.message || String(err)}`;
  }

  private cleanup() {
    this.clearTimers();
    // Leave communication mode, or the rest of the phone's audio stays on the in-call
    // volume stream and routed oddly after the call ends.
    AudioRoute.stopCall();
    try { this.voiceCallService.device?.destroy(); } catch (_) {}
    this.voiceCallService.clear();
  }

  async showAlert(header: string, message: string) {
    const a = await this.alertController.create({ header, message, buttons: ['OK'] });
    await a.present();
  }
}
