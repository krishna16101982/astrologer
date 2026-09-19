import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { firstValueFrom, interval, Subscription } from 'rxjs';
import { startWith, switchMap } from 'rxjs/operators';
import { Client } from '@twilio/conversations';
import { Device } from '@twilio/voice-sdk';
import { VoiceCallService } from 'src/app/services/voice-call.service';
import {
  IonContent,
  IonTitle,
  IonHeader,
  IonToolbar,
  IonFooter,
  IonButtons,
  IonMenuButton,
  IonButton,
  IonGrid,
  IonRow,
  IonCol,
  IonAvatar,
  IonSearchbar,
  IonIcon,
  IonBackButton,
  AlertController, IonSpinner } from '@ionic/angular/standalone';
import { FooterPage } from 'src/app/include/footer/footer.page';
import { ApiService } from 'src/app/services/api-service';
import { LoaderService } from 'src/app/services/loader.service';
import { WalletService } from 'src/app/services/wallet.service';
import { ActivatedRoute,Router, RouterLink} from '@angular/router';
@Component({
  selector: 'app-astroprofile',
  templateUrl: './astroprofile.page.html',
  styleUrls: ['./astroprofile.page.scss'],
  standalone: true,
  imports: [IonSpinner, CommonModule, FormsModule,
    IonContent,
    IonTitle,
    IonHeader,
    IonToolbar,
    IonFooter,
    IonButtons,
    IonMenuButton,
    IonButton,
    IonGrid,
    IonRow,
    IonCol,
    IonAvatar,
    IonSearchbar,
    IonIcon,
    IonBackButton,

    FooterPage,
    RouterLink]
})
export class AstroprofilePage implements OnInit, OnDestroy {
  astrologerDetails: any;
  id: any;
  walletDetails: any;
  private statusPollSub!: Subscription;
  activeTab = 'about';
  skillsArray: any[] = [];
  reviews: any[] = [];
  chatClient: any;
  conversation: any;
  chatRequestId: any;
  chatStartTime: any;
  loadingChat = false;
  loadingMessage = '';

  // ── Rating form ──
  lastConsult: { type: string; id: number } | null = null;
  newRating = 0;
  newComment = '';
  submittingRating = false;

  constructor(private apiService: ApiService,
    private route: ActivatedRoute,
    private router: Router,
    private loaderService: LoaderService,
    private alertController: AlertController,
    private voiceCallService: VoiceCallService,
    private walletService: WalletService) {
    this.route.paramMap.subscribe(params => {
      this.id = params.get('id');
    });
  }

  ngOnInit() {
    this.statusPollSub = interval(30000)
      .pipe(
        startWith(0),
        switchMap(() => this.apiService.getAstrologerProfile(this.id))
      )
      .subscribe({
        next: (res: any) => {
          this.astrologerDetails = res.data;
          this.skillsArray = res.data.specializations || [];
        },
        error: (err: any) => {
          console.log('Error:', err);
        }
      });

    this.getWalletDetails();
    this.getReviews();
    this.loadLastConsult();
  }

  ngOnDestroy() {
    this.statusPollSub?.unsubscribe();
  }

  // ── Rating: persistence + submit ──

  private loadLastConsult() {
    const raw = localStorage.getItem(`lastConsult_${this.id}`);
    this.lastConsult = raw ? JSON.parse(raw) : null;
  }

  private saveLastConsult(type: string, id: number) {
    const consult = { type, id };
    localStorage.setItem(`lastConsult_${this.id}`, JSON.stringify(consult));
    this.lastConsult = consult;
  }

  setRating(star: number) {
    this.newRating = star;
  }

  submitRating() {
    if (!this.lastConsult || this.newRating < 1) {
      return;
    }
    this.submittingRating = true;
    this.apiService.submitRating({
      astrologer_profile_id: Number(this.id),
      rating: this.newRating,
      comment: this.newComment?.trim() || '',
      ratable_type: this.lastConsult.type,
      ratable_id: this.lastConsult.id
    }).subscribe({
      next: async () => {
        this.submittingRating = false;
        this.newRating = 0;
        this.newComment = '';
        this.getReviews();
        const alert = await this.alertController.create({
          header: 'Thank you!',
          message: 'Your review has been submitted.',
          buttons: ['OK']
        });
        await alert.present();
      },
      error: async (err: any) => {
        this.submittingRating = false;
        await this.showError(err?.error?.message || 'Could not submit your review. Please try again.');
      }
    });
  }

  
  // GET WALLET

  getWalletDetails() {
    this.apiService
      .getWalletDetails()
      .subscribe({
        next: (res: any) => {
          console.log('Wallet:', res);
          this.walletDetails = res.data;
          const bal = parseFloat(res.data?.wallet_balance || '0');
          this.walletService.setBalance(bal);
        },
        error: (err: any) => {
          console.log('Error:', err);
        }
      });
  }

  // GET REVIEWS
  getReviews() {
    this.apiService
      .getRatings(this.id)
      .subscribe({
        next: (res: any) => {
          this.reviews = res.data.data || [];
        },
        error: () => {
          this.reviews = [];
        }
      });
  }

  // AVERAGE RATING

  getAverageRating(): number {
    if (!this.reviews.length) {
      return 0;
    }
    const total = this.reviews.reduce((sum, r) => sum + r.rating, 0);
    return +( total / this.reviews.length).toFixed(1);
  }

  // RATING COUNT

  getRatingCount(star: number): number {
    return this.reviews.filter(r => r.rating === star).length;
  }

  // RATING PERCENTAGE

  getRatingPercentage(star: number): number {
    if (!this.reviews.length) {
      return 0;
    }
    return ( this.getRatingCount(star) /this.reviews.length) * 100;
  }

  // INITIALS

  getInitials(name: string): string {
    if (!name) {
      return '';
    }
    const parts = name.trim().split(' ');
    if (parts.length === 1) {
      return parts[0].charAt(0).toUpperCase();
    }
    return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
  }

  
private async checkWalletBalance(pricePerMin: number): Promise<boolean> {
  try {
    const res: any = await firstValueFrom(this.apiService.getWalletBalance());
    const balance = parseFloat(res?.data?.wallet_balance || '0');
    this.walletService.setBalance(balance);
    if (balance < pricePerMin) {
      const alert = await this.alertController.create({
        header: 'Insufficient Balance',
        message: `Your wallet balance is ₹${balance.toFixed(2)}.<br>Minimum required: ₹${pricePerMin}/min.<br><br>Please add funds to continue.`,
        buttons: [
          { text: 'Cancel', role: 'cancel' },
          { text: 'Add Funds', handler: () => this.router.navigate(['/add-wallet']) }
        ]
      });
      await alert.present();
      return false;
    }
    return true;
  } catch {
    return true;
  }
}

async startChat() {

  const isLoggedIn = await this.checkLogin();
  if (!isLoggedIn) return;

  const chatPrice = parseFloat(this.astrologerDetails?.chat_price || '0');
  const hasFunds = await this.checkWalletBalance(chatPrice);
  if (!hasFunds) return;

  try {

    // =========================
    // SHOW LOADER
    // =========================

   this.loadingChat = true;
this.loadingMessage = 'Connecting to chat...';

    console.log('STEP 1');

    // =========================
    // GET TOKEN
    // =========================

    const tokenRes: any =
      await firstValueFrom(this.apiService.getChatToken());

    console.log(
      'TOKEN RESPONSE',
      tokenRes
    );

    if (
      !tokenRes ||
      !tokenRes.token
    ) {

      this.loadingChat = false;

      await this.showError(
        'Failed to get chat token'
      );

      return;

    }

    console.log('STEP 2');

    // =========================
    // CREATE CLIENT
    // =========================

    const token =
      tokenRes.token;

    this.chatClient =
      await Client.create(token);

    console.log(
      'CLIENT CREATED'
    );

    // =========================
    // REQUEST CHAT
    // Backend creates the Twilio conversation server-side
    // =========================

    const twilio_sid = 'CHAT_' + Date.now();

    const requestRes: any = await firstValueFrom(
      this.apiService.requestChat(this.astrologerDetails.id, twilio_sid)
    );

    if (!requestRes?.data) {
      this.loadingChat = false;
      await this.showError(
        requestRes?.message || 'Failed to request chat'
      );
      return;
    }

    this.chatRequestId = requestRes.data.chat_request_id;
    this.saveLastConsult('App\\Models\\ChatRequest', this.chatRequestId);


    // Only accept real Twilio SIDs (start with CH), not our custom twilio_sid string
    let conversationSid: string =
      requestRes.data.conversation_sid ||
      requestRes.data.twilio_conversation_sid || '';

    // =========================
    // POLL CHAT STATUS
    // Capture the real conversation SID once astrologer accepts
    // =========================

    this.loadingMessage = 'Waiting for astrologer to accept...';

    const maxAttempts = 20; // 20 × 3s = 60 seconds
    let accepted = false;
    let lastStatusData: any = null;

    for (let i = 0; i < maxAttempts; i++) {
      await new Promise(r => setTimeout(r, 3000));

      try {
        const statusRes: any = await firstValueFrom(
          this.apiService.getChatStatus(this.chatRequestId)
        );

        const chatStatus = statusRes?.data?.status;

        if (chatStatus === 'accepted') {
          // On acceptance the backend overwrites twilio_sid with the real CH... SID
          conversationSid =
            statusRes?.data?.conversation_sid ||
            statusRes?.data?.twilio_conversation_sid ||
            statusRes?.data?.twilio_sid || '';
          accepted = true;
          break;
        }

        if (chatStatus === 'rejected') {
          this.loadingChat = false;
          await this.showError('The astrologer has declined your chat request.');
          return;
        }

        //this.loadingMessage = `Waiting for astrologer... (${i + 1}/${maxAttempts})`;
        this.loadingMessage = `Waiting for astrologer...`;
      } catch {
        // network hiccup — keep polling
      }
    }

    if (!accepted) {
      this.loadingChat = false;
      await this.showError('No response from the astrologer. Please try again later.');
      return;
    }

    if (!conversationSid) {
      this.loadingChat = false;
      await this.showError(
        'Could not locate the chat conversation. Please contact support.\n\nDebug: request_id=' + this.chatRequestId
      );
      return;
    }

    this.loadingChat = false;

    // =========================
    // NAVIGATE — use the backend's conversation SID
    // so both user and astrologer are in the SAME conversation
    // =========================

    await this.router.navigate(
      ['/chat-room', conversationSid],
      {
        queryParams: {
          chat_request_id:  this.chatRequestId,
          astrologer_name:  this.astrologerDetails.display_name,
          astrologer_image: this.astrologerDetails.profile_image_url,
          chat_price:       this.astrologerDetails.chat_price
        }
      }
    );

  } catch (err: any) {
    this.loadingChat = false;
    const body = typeof err?.error === 'string'
      ? (() => { try { return JSON.parse(err.error); } catch { return {}; } })()
      : (err?.error || {});
    await this.showError(
      body?.message || err?.message || 'Failed to start chat. Please try again.'
    );
  }

}


  // ============================
  // START VOICE CALL
  // ============================

  async startVoiceCall() {

    const isLoggedIn = await this.checkLogin();
    if (!isLoggedIn) return;

    const callPrice = parseFloat(this.astrologerDetails?.call_price || '0');
    const hasFunds = await this.checkWalletBalance(callPrice);
    if (!hasFunds) return;

    // Held outside the try so every abort path can release the mic and tear the
    // Twilio device down. Without this each failed attempt leaves a registered
    // device and an open mic stream behind, and they stack up across retries.
    let device: any = null;
    let micStream: MediaStream | null = null;
    let handedOff = false;
    // Set once registration/dialling begins, so transient device errors from that point
    // on are logged rather than turned into an alert that aborts a viable call.
    let dialStarted = false;

    const releaseCall = () => {
      this.loadingChat = false;
      try { micStream?.getTracks().forEach(t => t.stop()); } catch (_) {}
      try { device?.destroy(); } catch (_) {}
      micStream = null;
      device = null;
    };

    // Step timings for the gap between tapping call and the astrologer's phone
    // ringing. The voice-call page's own timeline only starts once connect() has
    // returned, so without this the whole pre-dial stretch was invisible.
    const dialStart = Date.now();
    const lap = (label: string) =>
      console.log(`[VOICE DIAL] +${((Date.now() - dialStart) / 1000).toFixed(2)}s  ${label}`);

    try {

      // ── STEP 1: show loader ──────────────────────────────────
      this.loadingChat = true;
      this.loadingMessage = 'Requesting microphone...';

      // ── STEP 2: mic permission (must be first user-gesture call) ──
      //
      // The stream is released as soon as the permission is granted. It exists only to
      // trigger the Android runtime prompt inside the user gesture; Twilio opens its own
      // capture stream during connect(), and on Android WebView a second open handle on
      // the mic can leave that capture silent.
      micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      micStream.getTracks().forEach(t => t.stop());
      micStream = null;

      lap('mic permission');

      // ── STEP 3: request the call and fetch the token together ──
      //
      // These were sequential, which cost a whole round trip of dead time before the
      // astrologer's phone could ring. The token does not depend on the call request,
      // so both go out at once.
      this.loadingMessage = 'Connecting call...';
      console.log('[VOICE] requesting call, astrologer_id =', this.astrologerDetails?.id);

      const [callRes, tokenRes]: any[] = await Promise.all([
        firstValueFrom(this.apiService.requestVoiceCall(this.astrologerDetails.id)),
        firstValueFrom(this.apiService.getVoiceToken())
      ]);

      lap('request-call + voice-token');

      const callRequestId = callRes?.data?.call_request_id ?? callRes?.call_request_id;

      if (!callRequestId) {
        releaseCall();
        await this.showError('Failed to request call');
        return;
      }

      this.saveLastConsult('App\\Models\\CallRequest', callRequestId);

      if (!tokenRes?.token) {
        releaseCall();
        await this.showError('Failed to get voice token');
        return;
      }

      // ── STEP 5: create Twilio Device ─────────────────────────
      //
      // edge is pinned rather than left on the default 'roaming', which routes through
      // Twilio's global low-latency host. That default is the most likely cause of the
      // websocket close 1005 / TransportError 31009 seen on Android — the working client
      // pins ashburn and connects reliably, so we match it.
      this.loadingMessage = 'Initialising audio...';
      device = new Device(tokenRes.token, {
        codecPreferences: ['opus', 'pcmu'] as any,
        edge: 'ashburn'
      } as any);

      // Device errors raised during registration are logged, not shown: register() is
      // best-effort here (see below) and the dial can still succeed after it fails.
      // Surfacing an alert then would abort a call that is about to connect. Once the
      // call is handed to the voice-call page, that page owns error reporting.
      device.on('error', async (err: any) => {
        console.log('[VOICE] device error', err?.code, err?.message);
        if (handedOff || dialStarted) return;
        this.loadingChat = false;
        await this.showError(err?.message || 'Twilio device error');
      });

      lap('device created');

      // ── STEP 6: register in the background, dial immediately ──
      //
      // register() subscribes the Device to *incoming* calls. This app only places
      // outgoing ones, and connect() brings up the transport it needs by itself — so
      // waiting on registration was several seconds of dead air before the astrologer's
      // phone could even start ringing. It is still started, because a registered
      // Device recovers a dropped signalling socket more cleanly, but nothing waits
      // for it. Errors are caught here so a background failure cannot surface as an
      // unhandled rejection.
      this.loadingMessage = 'Ringing astrologer...';
      dialStarted = true;

      Promise.resolve(device.register()).catch((regErr: any) => {
        console.log('[VOICE] background register failed (harmless for outgoing):', regErr?.message);
      });

      // Do NOT gate the dial behind /consultations/call-status. That endpoint only ever
      // reports 'initiated': it logs the request for billing and has no accept/reject
      // workflow, so waiting for 'accepted' never terminates.
      //
      // device.connect() is the step that actually reaches the astrologer — the TwiML
      // webhook dials their dashboard's Twilio client using call_request_id, which is
      // what raises their "Incoming Voice Call" prompt. Acceptance happens at the Twilio
      // layer, and the voice-call page listens for the resulting accept/reject/cancel.
      console.log('[VOICE] connecting, call_request_id =', callRequestId);

      const activeCall = await device.connect({
        params: {
          call_request_id: String(callRequestId),
          platform: 'web-capacitor'
        }
      });

      lap('connect() returned — astrologer is being dialled');
      console.log('[VOICE] connect() returned, CallSid =',
        (activeCall as any)?.parameters?.CallSid || '(none yet)');

      // ── STEP 8: store everything in the shared service ───────
      this.voiceCallService.clear();
      this.voiceCallService.device = device;
      this.voiceCallService.activeCall = activeCall;
      this.voiceCallService.callRequestId = callRequestId;
      this.voiceCallService.astrologerName = this.astrologerDetails.display_name;
      this.voiceCallService.astrologerImage = this.astrologerDetails.profile_image_url;

      // From here the device belongs to the call, not to us — the voice-call
      // page destroys it on hangup, so releaseCall() must not touch it.
      handedOff = true;
      this.loadingChat = false;

      // ── STEP 9: navigate — voice-call page just reads the service ─
      await this.router.navigate(['/voice-call']);

    } catch (err: any) {
      if (handedOff) {
        this.loadingChat = false;
      } else {
        releaseCall();
      }

      // Name an expired session explicitly — the raw backend body for this is
      // "Unauthenticated.", which tells the user nothing they can act on.
      if (err?.status === 401 || err?.status === 403) {
        await this.showError('Your session has expired. Please log in again.');
        return;
      }

      const body = typeof err?.error === 'string'
        ? (() => { try { return JSON.parse(err.error); } catch { return {}; } })()
        : (err?.error || {});
      await this.showError(body?.message || err?.message || 'Failed to start call');
    }

  }



  // ============================
  // SHOW ERROR
  // ============================

  async showError(message: string) {
    const alert = await this.alertController.create({
        header: 'Error',
        message: message,
        buttons: ['OK']
      });
    await alert.present();
  }

  async checkLogin(): Promise<boolean> {

  const token =
    localStorage.getItem('accessToken');

  // OR your auth key

  if (!token) {

    const alert =
      await this.alertController.create({

        header: 'Login Required',

        message:
          'Please login to continue.',

        buttons: [

          {
            text: 'Cancel',
            role: 'cancel'
          },

          {
            text: 'Login',

            handler: () => {

              this.router.navigate([
                '/login'
              ]);

            }
          }

        ]

      });

    await alert.present();

    return false;
  }

  return true;
}
}