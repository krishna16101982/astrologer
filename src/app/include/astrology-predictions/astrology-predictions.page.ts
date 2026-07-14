import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonContent, IonHeader, IonTitle, IonToolbar } from '@ionic/angular/standalone';
import { ApiService } from 'src/app/services/api-service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-astrology-predictions',
  templateUrl: './astrology-predictions.page.html',
  styleUrls: ['./astrology-predictions.page.scss'],
  standalone: true,
  imports: [IonContent, IonHeader, IonTitle, IonToolbar, CommonModule, FormsModule]
})
export class AstrologyPredictionsPage implements OnInit {
  zodiacSigns: any;

  constructor(private apiService: ApiService, private router: Router) { }

  ngOnInit() {
    this.getZodiacSigns();
  }

  getZodiacSigns() {
    this.apiService.getZodiacSigns().subscribe({
      next: (res) => {
        this.zodiacSigns = res.data; // Assuming the API returns an array of blogs in res.data.data
      }
    });
  }

  goToHoroscope(zodiac: any) {
    this.router.navigate(['/horoscope/daily', zodiac.slug]);
  }

  /**
   * The horoscope page carries the whole zodiac grid and all four prediction tabs, so it is
   * the "view all" destination. It needs a sign in the route, so open on the first one the API
   * returned (Aries, in its usual order).
   */
  viewAll() {
    const firstSign = this.zodiacSigns?.[0]?.slug || 'aries';
    this.router.navigate(['/horoscope/daily', firstSign]);
  }

}
