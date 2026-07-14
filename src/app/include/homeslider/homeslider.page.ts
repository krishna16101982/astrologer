import { Component, CUSTOM_ELEMENTS_SCHEMA, OnInit, ViewChild, ElementRef } from '@angular/core';
import { IonicModule } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { ApiService } from 'src/app/services/api-service';

@Component({
  selector: 'app-homeslider',
  templateUrl: './homeslider.page.html',
  styleUrls: ['./homeslider.page.scss'],
  standalone: true,

  imports: [IonicModule, CommonModule],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class HomesliderPage implements OnInit {

  @ViewChild('swiperEl') swiperEl?: ElementRef;

   sliders: any[] = [];

  // sliders: any[] = [
  //   {
  //     image_url: 'assets/images/homeSlider.jpg',
  //     title: 'Astrology Insights',
  //     description: 'Discover your future with our expert astrologers.'
  //   },
  //   {
  //     image_url: 'assets/images/logo.png',
  //     title: 'Personalized Predictions',
  //     description: 'Get personalized astrology predictions for your life.'
  //   },
  //   {
  //     image_url: 'assets/images/logo.png',
  //     title: 'Daily Horoscope',
  //     description: 'Check your daily horoscope and plan your day.'
  //   }
  // ];

  // Swiper config moved to HTML as attributes for Web Component usage

  constructor(private apiService: ApiService) { }

  ngOnInit() {
     this.getSliders();    
  }

  getSliders() {
    this.apiService.getSliders().subscribe({
       next: (res) => {
      console.log('Sliders API:', res);
    this.sliders = res.data.map((slider: any) => ({
  ...slider,
  image_url: 'https://astroauraa.com' + slider.app_image_url
}));
    // Initialise Swiper only after the slides are rendered in the DOM,
    // so the banner reliably shows (including when navigating back).
    setTimeout(() => this.initSwiper());
    },
      // next: (res) => {
      //   this.sliders = res.data;
      // },
      error: (err) => {
        console.log('Error:', err);
      }
    });
  }

  private initSwiper() {
    const el: any = this.swiperEl?.nativeElement;
    if (!el) {
      return;
    }
    if (el.swiper) {
      el.swiper.update();
    } else {
      el.initialize();
    }
  }
}