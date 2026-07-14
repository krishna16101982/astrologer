import { Component, CUSTOM_ELEMENTS_SCHEMA, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import {
  AlertController,
  IonContent,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonButtons,
  IonBackButton,
  IonFooter,
  IonSpinner,
  IonSearchbar
} from '@ionic/angular/standalone';
import { ApiService } from 'src/app/services/api-service';
import { FooterPage } from 'src/app/include/footer/footer.page';
import { Subscription, interval } from 'rxjs';
import { startWith, switchMap } from 'rxjs/operators';

const REFRESH_INTERVAL_MS = 30000;

@Component({
  selector: 'app-all-astrologers',
  templateUrl: './all-astrologers.page.html',
  styleUrls: ['./all-astrologers.page.scss'],
  standalone: true,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  imports: [
    IonContent, IonHeader, IonToolbar, IonTitle, IonButtons, IonBackButton,
    IonFooter, IonSpinner, IonSearchbar, RouterLink, CommonModule, FooterPage
  ]
})
export class AllAstrologersPage implements OnInit, OnDestroy {
  astrologers: any[] = [];
  specializations: any[] = [];
  loading = false;
  searchTerm = '';
  selectedSpec = '';
  private pollSub!: Subscription;

  constructor(
    private apiService: ApiService,
    private router: Router,
    private alertController: AlertController
  ) {}

  ngOnInit() {
    this.loading = true;
    this.pollSub = interval(REFRESH_INTERVAL_MS)
      .pipe(
        startWith(0),
        switchMap(() => this.apiService.getAstrologersData(this.searchTerm, this.selectedSpec))
      )
      .subscribe({
        next: (res: any) => {
          this.loading = false;
          this.astrologers = res.data.data;
          // Build the filter chips once, from the full (unfiltered) list
          if (!this.searchTerm && !this.selectedSpec) {
            this.buildSpecializations(res.data.data);
          }
        },
        error: (err: any) => {
          this.loading = false;
          console.log('Error:', err);
        }
      });
  }

  ngOnDestroy() {
    this.pollSub?.unsubscribe();
  }

  private buildSpecializations(list: any[]) {
    const map = new Map<string, any>();
    (list || []).forEach((a: any) => {
      (a.specializations || []).forEach((s: any) => {
        if (s?.slug) {
          map.set(s.slug, s);
        }
      });
    });
    this.specializations = Array.from(map.values());
  }

  private fetchAstrologers() {
    this.apiService.getAstrologersData(this.searchTerm, this.selectedSpec).subscribe({
      next: (res: any) => { this.astrologers = res.data.data; },
      error: (err: any) => { console.log('Error:', err); }
    });
  }

  filterBySpec(slug: string) {
    this.selectedSpec = slug;
    this.fetchAstrologers();
  }

  onSearch(event: any) {
    this.searchTerm = (event.target.value || '').trim();
    this.fetchAstrologers();
  }

  async openChat(event: Event, astro: any) {
    event.stopPropagation();
    if (astro.is_chat_online) {
      this.router.navigate(['/astroprofile', astro.id]);
    } else {
      await this.showOffline(`${astro.display_name} is currently offline for chat.`);
    }
  }

  async openCall(event: Event, astro: any) {
    event.stopPropagation();
    if (astro.is_call_online) {
      this.router.navigate(['/astroprofile', astro.id]);
    } else {
      await this.showOffline(`${astro.display_name} is currently offline for calls.`);
    }
  }

  private async showOffline(message: string) {
    const alert = await this.alertController.create({
      header: 'Unavailable',
      message,
      buttons: ['OK']
    });
    await alert.present();
  }
}
