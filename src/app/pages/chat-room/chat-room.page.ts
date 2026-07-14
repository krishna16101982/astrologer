import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule, AlertController } from '@ionic/angular';
import { ActivatedRoute, Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { Client } from '@twilio/conversations';
import { ApiService } from 'src/app/services/api-service';
import { LoaderService } from 'src/app/services/loader.service';
import { WalletService } from 'src/app/services/wallet.service';

@Component({
  selector: 'app-chat-room',
  templateUrl: './chat-room.page.html',
  styleUrls: ['./chat-room.page.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, IonicModule]
})
export class ChatRoomPage implements OnInit, OnDestroy {

  conversationSid: any;
  chatRequestId: any;
  conversation: any;
  chatClient: any;
  messages: any[] = [];
  messageText = '';
  loading = true;
  chatStartTime: Date | null = null;
  formattedTime = '00:00';
  timerInterval: any;
  astrologer: any = {};
  identity: any = '';

  chatPrice = 0;
  walletBalance = 0;
  balanceWarningShown = false;
  chatEnded = false;
  private balanceInterval: any;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private apiService: ApiService,
    private alertController: AlertController,
    private loaderService: LoaderService,
    private walletService: WalletService
  ) {}

  // ============================
  // INIT
  // ============================

  async ngOnInit() {
    this.conversationSid = this.route.snapshot.paramMap.get('sid');
    this.chatRequestId   = this.route.snapshot.queryParamMap.get('chat_request_id');
    this.chatPrice       = parseFloat(this.route.snapshot.queryParamMap.get('chat_price') || '0');

    this.astrologer = {
      name:          this.route.snapshot.queryParamMap.get('astrologer_name'),
      profile_image: this.route.snapshot.queryParamMap.get('astrologer_image')
    };

    await this.loadChat();
  }

  // ============================
  // TIMER
  // ============================

  startTimer() {
    this.timerInterval = setInterval(() => {
      const now: any = new Date();
      const diff     = now - (this.chatStartTime as any);
      const minutes  = Math.floor(diff / 60000);
      const seconds  = Math.floor((diff % 60000) / 1000);
      this.formattedTime = String(minutes).padStart(2, '0') + ':' + String(seconds).padStart(2, '0');
    }, 1000);
  }

  // ============================
  // BALANCE MONITOR
  // ============================

  private startBalanceMonitor() {
    this.checkBalanceAndStatus();
    this.balanceInterval = setInterval(() => this.checkBalanceAndStatus(), 15000);
  }

  private async checkBalanceAndStatus() {
    if (this.chatEnded) return;

    // ── Check if astrologer already ended the chat on backend (polling backup) ──
    try {
      const statusRes: any = await firstValueFrom(this.apiService.getChatStatus(this.chatRequestId));
      const status = statusRes?.data?.status;
      if (['completed', 'ended', 'closed', 'cancelled'].includes(status)) {
        await this.handleAstrologerEndedChat();
        return;
      }
    } catch { /* ignore — Twilio participantLeft event is the primary signal */ }

    // ── Check wallet balance ──
    try {
      const res: any = await firstValueFrom(this.apiService.getWalletBalance());
      this.walletBalance = parseFloat(res?.data?.wallet_balance || '0');
      this.walletService.setBalance(this.walletBalance);

      const minsRemaining = this.chatPrice > 0 ? this.walletBalance / this.chatPrice : 99;

      // Warn when balance < ₹5 OR less than 5 minutes remaining
      const lowBalance  = this.walletBalance < 5;
      const lowMinutes  = minsRemaining < 5;
      if ((lowBalance || lowMinutes) && minsRemaining >= 1 && !this.balanceWarningShown) {
        this.balanceWarningShown = true;
        const buttons: any[] = [{ text: 'Continue', role: 'cancel' }];
        if (lowMinutes) {
          buttons.push({ text: 'Add Balance', handler: () => this.router.navigate(['/add-wallet']) });
        }
        const a = await this.alertController.create({
          header: 'Low Balance Warning',
          cssClass: 'chat-summary-alert',
          message: `Current balance: ₹${this.walletBalance.toFixed(2)}\nOnly ~${Math.floor(minsRemaining)} min(s) of chat remaining.\n\nAdd balance to continue chatting.`,
          buttons
        });
        await a.present();
      }

      // Auto-end when balance can't cover 1 more minute
      if (minsRemaining < 1 && !this.chatEnded) {
        clearInterval(this.balanceInterval);
        this.chatEnded = true;
        clearInterval(this.timerInterval);
        await this.completeChat('user');
      }
    } catch { /* non-critical */ }
  }

  // ── Called when astrologer ends the chat (Twilio event OR status polling) ──
  private async handleAstrologerEndedChat() {
    if (this.chatEnded) return;
    this.chatEnded = true; // synchronous guard — prevents any concurrent path from entering
    await this.completeChat('astrologer');
  }

  // ============================
  // LOAD CHAT
  // ============================

  async loadChat() {
    try {
      this.loading = true;

      const tokenRes: any = await firstValueFrom(this.apiService.getChatToken());
      this.identity = tokenRes.identity;

      if (!tokenRes?.token) {
        await this.showError('Failed to load chat token');
        return;
      }

      this.loading = false;

      this.chatClient = await Promise.race([
        Client.create(tokenRes.token),
        new Promise((_, reject) => setTimeout(() => reject('Twilio Client Timeout'), 15000))
      ]);

      this.conversation = await this.chatClient.getConversationBySid(this.conversationSid);

      try {
        await this.conversation.join();
      } catch {
        // already a member — fine
      }

      const msgs = await this.conversation.getMessages();
      this.messages = msgs.items || [];

      this.conversation.on('messageAdded', (message: any) => {
        this.messages = [...this.messages, message];
        setTimeout(() => this.scrollBottom(), 100);
      });

      // Detect when astrologer leaves the conversation (they ended the chat)
      this.conversation.on('participantLeft', async (participant: any) => {
        if (participant.identity !== this.identity && !this.chatEnded) {
          await this.handleAstrologerEndedChat();
        }
      });

      this.loading = false;

      // Start timer + balance monitor only after chat is fully connected
      this.chatStartTime = new Date();
      this.startTimer();
      this.startBalanceMonitor();

      setTimeout(() => this.scrollBottom(), 300);

    } catch (err: any) {
      this.loading = false;
      const body = typeof err?.error === 'string'
        ? (() => { try { return JSON.parse(err.error); } catch { return {}; } })()
        : (err?.error || {});
      await this.showError(body?.message || err?.message || 'Failed to load chat. Please try again.');
    }
  }

  // ============================
  // SEND MESSAGE
  // ============================

  async sendMessage() {
    try {
      // Block sending after chat is ended (balance exhausted or manually ended)
      if (this.chatEnded) {
        const a = await this.alertController.create({
          header: 'Chat Ended',
          cssClass: 'chat-summary-alert',
          message: 'This chat session has ended.\n\nAdd balance to start a new session.',
          buttons: [
            { text: 'Add Balance', handler: () => this.router.navigate(['/add-wallet']) },
            { text: 'OK',          role: 'cancel' }
          ]
        });
        await a.present();
        return;
      }

      if (!this.messageText?.trim()) return;

      if (!this.conversation) {
        await this.showError('Conversation not loaded');
        return;
      }

      const text = this.messageText.trim();
      this.messageText = '';

      await this.conversation.sendMessage(text);
      setTimeout(() => this.scrollBottom(), 100);

    } catch (err: any) {
      const body = typeof err?.error === 'string'
        ? (() => { try { return JSON.parse(err.error); } catch { return {}; } })()
        : (err?.error || {});
      await this.showError(body?.message || err?.message || 'Failed to send message. Please try again.');
    }
  }

  // ============================
  // END CHAT (confirmation)
  // ============================

  async endChat() {
    if (this.chatEnded) return;

    // Enforce minimum 1-minute chat (backend rejects duration < 1)
    const elapsed = this.chatStartTime
      ? (new Date().getTime() - (this.chatStartTime as any).getTime())
      : 0;

    if (elapsed < 60000) {
      const waitSecs = Math.ceil((60000 - elapsed) / 1000);
      const a = await this.alertController.create({
        header:  'Too Early',
        message: `Minimum chat duration is 1 minute. Please wait ${waitSecs} more second(s).`,
        buttons: [{ text: 'OK', role: 'cancel' }]
      });
      await a.present();
      return; // chat continues
    }

    const alert = await this.alertController.create({
      header:  'End Chat',
      message: 'Are you sure you want to end this consultation?',
      buttons: [
        { text: 'Cancel',   role: 'cancel' },
        { text: 'End Chat', handler: async () => { await this.completeChat('user'); } }
      ]
    });
    await alert.present();
  }

  // ============================
  // COMPLETE CHAT (API call + summary)
  // ============================

  async completeChat(source: 'user' | 'astrologer' = 'user') {
    if (!this.chatStartTime) return;
    const startTime = this.chatStartTime;
    this.chatStartTime = null; // prevents re-entry

    this.chatEnded = true;
    clearInterval(this.timerInterval);
    clearInterval(this.balanceInterval);

    const endTime: any    = new Date();
    const diffMs          = endTime - (startTime as any);
    // Backend requires minimum 1 minute; use proportional time but never below 1
    const durationMinutes = Math.max(1, parseFloat((diffMs / 60000).toFixed(4)));

    try { await this.conversation?.leave(); } catch { /* ignore */ }

    try {
      console.log('[endChat] chatRequestId:', this.chatRequestId, 'duration:', durationMinutes);
      const res: any = await firstValueFrom(
        this.apiService.endChat(Number(this.chatRequestId), durationMinutes)
      );
      console.log('[endChat] response:', JSON.stringify(res));

      const duration       = parseFloat(res.data.duration).toFixed(2);
      const cost           = parseFloat(res.data.total_cost).toFixed(2);
      const remainingVal   = parseFloat(res.data.user_remaining_balance);
      const remaining      = remainingVal.toFixed(2);
      this.walletService.setBalance(remainingVal);
      const header         = source === 'astrologer' ? 'Session Ended by Astrologer' : 'Chat Ended';
      const minsRemaining  = this.chatPrice > 0 ? remainingVal / this.chatPrice : 99;

      const buttons: any[] = [];
      if (minsRemaining < 5) {
        buttons.push({ text: 'Add Balance', handler: () => this.router.navigate(['/add-wallet']) });
      }
      buttons.push({ text: 'OK', handler: () => this.router.navigate(['/home']) });

      const a = await this.alertController.create({
        header,
        cssClass: 'chat-summary-alert',
        message: `Duration: ${duration} min(s)\nTotal Cost: ₹${cost}\nRemaining Balance: ₹${remaining}`,
        buttons
      });
      await a.present();

    } catch (err: any) {
      const body = typeof err?.error === 'string'
        ? (() => { try { return JSON.parse(err.error); } catch { return {}; } })()
        : (err?.error || {});
      const msg  = body?.message || err?.message || '';
      const alreadyDone = /already|completed|ended/i.test(msg);

      if (source === 'astrologer' || alreadyDone) {
        // Show estimated summary (backend already processed billing)
        const estimatedCost     = parseFloat((durationMinutes * this.chatPrice).toFixed(2));
        const estRemaining      = Math.max(0, this.walletBalance - estimatedCost);
        const estMinsRemaining  = this.chatPrice > 0 ? estRemaining / this.chatPrice : 99;

        const errButtons: any[] = [];
        if (estMinsRemaining < 5) {
          errButtons.push({ text: 'Add Balance', handler: () => this.router.navigate(['/add-wallet']) });
        }
        errButtons.push({ text: 'OK', handler: () => this.router.navigate(['/home']) });

        const a = await this.alertController.create({
          header:  'Session Ended by Astrologer',
          cssClass: 'chat-summary-alert',
          message: `Duration: ~${parseFloat((diffMs / 60000).toFixed(2))} min(s)\nEstimated Cost: ₹${estimatedCost}\nPlease check your wallet for the exact deducted amount.`,
          buttons: errButtons
        });
        await a.present();
      } else {
        await this.showError(msg || 'Failed to end chat. Please try again.');
        this.router.navigate(['/home']);
      }
    }
  }

  // ============================
  // SCROLL
  // ============================

  scrollBottom() {
    const el: any = document.querySelector('.messages');
    if (el) el.scrollTop = el.scrollHeight;
  }

  // ============================
  // ERROR
  // ============================

  async showError(message: string) {
    const friendly = typeof message === 'string' && !message.trim().startsWith('{')
      ? message
      : 'An unexpected error occurred. Please try again.';
    const alert = await this.alertController.create({
      header:  'Error',
      message: friendly,
      buttons: ['OK']
    });
    await alert.present();
  }

  // ============================
  // DESTROY
  // ============================

  ngOnDestroy() {
    clearInterval(this.timerInterval);
    clearInterval(this.balanceInterval);
  }
}
