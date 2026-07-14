import { Component, CUSTOM_ELEMENTS_SCHEMA, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AlertController, IonContent, IonHeader, IonTitle, IonToolbar } from '@ionic/angular/standalone';
import { ApiService } from 'src/app/services/api-service';
import { Subscription, interval } from 'rxjs';
import { startWith, switchMap } from 'rxjs/operators';

const REFRESH_INTERVAL_MS = 30000;

@Component({
  selector: 'app-topastrologers',
  templateUrl: './topastrologers.page.html',
  styleUrls: ['./topastrologers.page.scss'],
  standalone: true,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  imports: [IonContent, RouterLink, IonHeader, IonTitle, IonToolbar, CommonModule, FormsModule]
})
export class TopastrologersPage implements OnInit, OnDestroy {
  topAstrologers: any[] = [];
  private pollSub!: Subscription;

  constructor(
    private apiService: ApiService,
    private router: Router,
    private alertController: AlertController
  ) {}

  ngOnInit() {
    this.pollSub = interval(REFRESH_INTERVAL_MS)
      .pipe(
        startWith(0),
        switchMap(() => this.apiService.getAstrologersData())
      )
      .subscribe({
        next: (res: any) => {
          this.topAstrologers = res.data.data;
        },
        error: (err: any) => {
          console.log('Error:', err);
        }
      });
  }

  ngOnDestroy() {
    this.pollSub?.unsubscribe();
  }

  async openChat(event: Event, astro: any) {
    event.stopPropagation();
    if (astro.is_chat_online) {
      this.router.navigate(['/astroprofile', astro.id]);
    } else {
      const alert = await this.alertController.create({
        header: 'Unavailable',
        message: `${astro.display_name} is currently offline for chat.`,
        buttons: ['OK']
      });
      await alert.present();
    }
  }

  async openCall(event: Event, astro: any) {
    event.stopPropagation();
    if (astro.is_call_online) {
      this.router.navigate(['/astroprofile', astro.id]);
    } else {
      const alert = await this.alertController.create({
        header: 'Unavailable',
        message: `${astro.display_name} is currently offline for calls.`,
        buttons: ['OK']
      });
      await alert.present();
    }
  }
}
