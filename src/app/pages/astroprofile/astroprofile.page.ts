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

    try {

      // ── STEP 1: show loader ──────────────────────────────────
      this.loadingChat = true;
      this.loadingMessage = 'Requesting microphone...';

      // ── STEP 2: mic permission (must be first user-gesture call) ──
      await navigator.mediaDevices.getUserMedia({ audio: true });

      // ── STEP 3: get Twilio voice token ───────────────────────
      this.loadingMessage = 'Getting voice token...';
      const tokenRes: any = await firstValueFrom(this.apiService.getVoiceToken());

      if (!tokenRes?.token) {
        this.loadingChat = false;
        await this.showError('Failed to get voice token');
        return;
      }

      // ── STEP 4: create Twilio Device (AudioContext created HERE,
      //            still inside the user-gesture call stack) ────
      this.loadingMessage = 'Initialising audio...';
      const device = new Device(tokenRes.token, {
        codecPreferences: ['opus', 'pcmu'] as any,
        fakeLocalDTMF: true,
        enableRingingState: true
      } as any);

      device.on('error', async (err: any) => {
        this.loadingChat = false;
        await this.showError(err?.message || 'Twilio device error');
      });

      // ── STEP 5: register device ──────────────────────────────
      this.loadingMessage = 'Registering device...';
      await device.register();

      // Give Android time to settle audio pipeline
      await new Promise(r => setTimeout(r, 2000));

      // ── STEP 6: request call from backend ───────────────────
      this.loadingMessage = 'Connecting call...';
      const twilio_sid = 'CALL_' + Date.now();

      const callRes: any = await firstValueFrom(
        this.apiService.requestVoiceCall(this.astrologerDetails.id, twilio_sid)
      );

      if (!callRes?.data) {
        this.loadingChat = false;
        await this.showError('Failed to request call');
        return;
      }

      const callRequestId = callRes.data.call_request_id;
      this.saveLastConsult('App\\Models\\CallRequest', callRequestId);

      // ── STEP 7: poll call-status until accepted/rejected ──────
      this.loadingMessage = 'Waiting for astrologer to accept...';

      const maxAttempts = 20; // 20 × 3s = 60 seconds
      let callAccepted = false;
      let realCallSid = '';

      for (let i = 0; i < maxAttempts; i++) {
        await new Promise(r => setTimeout(r, 3000));

        try {
          const statusRes: any = await firstValueFrom(
            this.apiService.getCallStatus(callRequestId)
          );
          const callStatus = statusRes?.data?.status;

          if (callStatus === 'accepted') {
            // Backend sets twilio_sid to the real CA... SID on acceptance
            realCallSid =
              statusRes?.data?.twilio_sid ||
              statusRes?.data?.call_sid || '';
            callAccepted = true;
            break;
          }

          if (callStatus === 'rejected') {
            this.loadingChat = false;
            await this.showError('The astrologer has declined your call request.');
            return;
          }

          this.loadingMessage = `Waiting for astrologer... (${i + 1}/${maxAttempts})`;
        } catch {
          // network hiccup — keep polling
        }
      }

      if (!callAccepted) {
        this.loadingChat = false;
        await this.showError('No response from the astrologer. Please try again later.');
        return;
      }

      // ── STEP 8: connect call — pass call_request_id so backend
      //            TwiML webhook knows which consultation to bridge ─
      this.loadingMessage = 'Connecting audio...';
      const activeCall = await device.connect({
        params: {
          call_request_id: String(callRequestId),
          twilio_sid:      realCallSid || twilio_sid
        }
      });

      // ── STEP 8: store everything in the shared service ───────
      this.voiceCallService.clear();
      this.voiceCallService.device = device;
      this.voiceCallService.activeCall = activeCall;
      this.voiceCallService.callRequestId = callRequestId;
      this.voiceCallService.astrologerName = this.astrologerDetails.display_name;
      this.voiceCallService.astrologerImage = this.astrologerDetails.profile_image_url;

      this.loadingChat = false;

      // ── STEP 9: navigate — voice-call page just reads the service ─
      await this.router.navigate(['/voice-call']);

    } catch (err: any) {
      this.loadingChat = false;
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