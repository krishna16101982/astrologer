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
  isCallActive = false;
  isEnding = false;
  walletBalance = '';

  private timerInterval: any;
  private billingInterval: any;

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

    svc.activeCall.on('accept', () => {
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
      this.ngZone.run(async () => {
        this.callStatus = 'Call Ended';
        this.clearTimers();
        await this.endCallApi();
      });
    });

    svc.activeCall.on('cancel', async () => {
      this.ngZone.run(async () => {
        this.callStatus = 'Call Cancelled';
        this.clearTimers();
        await this.showAlert('Call Cancelled', 'The call was cancelled.');
        this.router.navigate(['/home']);
      });
    });

    svc.activeCall.on('reject', async () => {
      this.ngZone.run(async () => {
        this.callStatus = 'Call Rejected';
        this.clearTimers();
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
        console.error('Billing ping failed', err);
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
      const durationMinutes = parseFloat((diffMs / 60000).toFixed(4));

      const res: any = await firstValueFrom(
        this.apiService.endCall(callRequestId, durationMinutes)
      );

      this.walletService.setBalance(parseFloat(res.data.user_remaining_balance || '0'));
      this.cleanup();

      const alert = await this.alertController.create({
        header: 'Call Ended',
        message:
          `Duration: ${res.data.duration} min(s)<br>` +
          `Total Cost: ₹${res.data.total_cost}<br>` +
          `Remaining Balance: ₹${res.data.user_remaining_balance}`,
        buttons: [{ text: 'OK', handler: () => { this.router.navigate(['/home']); } }]
      });
      await alert.present();

    } catch (err: any) {
      console.error('endCallApi error', err);
      this.cleanup();
      this.router.navigate(['/home']);
    }
  }

  // ── Helpers ───────────────────────────────────────────────────

  private cleanup() {
    this.clearTimers();
    try { this.voiceCallService.device?.destroy(); } catch (_) {}
    this.voiceCallService.clear();
  }

  async showAlert(header: string, message: string) {
    const a = await this.alertController.create({ header, message, buttons: ['OK'] });
    await a.present();
  }
}
