import { Component, CUSTOM_ELEMENTS_SCHEMA, OnDestroy, OnInit } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';
import {
  IonContent,
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
  IonSearchbar
} from '@ionic/angular/standalone';

import { HomesliderPage } from '../include/homeslider/homeslider.page';
import { FouroptionPage } from '../include/fouroption/fouroption.page';
import { TopastrologersPage } from '../include/topastrologers/topastrologers.page';
import { AstrologyPredictionsPage } from '../include/astrology-predictions/astrology-predictions.page';
import { NewsPage } from '../include/news/news.page';
import { TotalcountPage } from '../include/totalcount/totalcount.page';
import { FooterPage } from '../include/footer/footer.page';
import { ApiService } from '../services/api-service';
import { LoaderService } from '../services/loader.service';
import { WalletService } from '../services/wallet.service';
import { BlogPage } from '../include/blog/blog.page';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule,
    RouterLink,
    // Ionic standalone components used in HTML
    IonContent,
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

    // Child standalone pages
    HomesliderPage,
    FouroptionPage,
    TopastrologersPage, AstrologyPredictionsPage, NewsPage, TotalcountPage, FooterPage, BlogPage],


  templateUrl: './home.page.html',
  styleUrls: ['./home.page.scss']
})
export class HomePage implements OnInit, OnDestroy {

  slideOpts = {
    initialSlide: 0,
    speed: 400,
    loop: true,
    pagination: { clickable: true },
    autoplay: { delay: 3000, disableOnInteraction: false }
  };
  walletBalance = 0;
  searchResults: any[] = [];
  showResults = false;
  loading = false;
  private balanceSub!: Subscription;

  constructor(
    private apiService: ApiService,
    private router: Router,
    private loaderService: LoaderService,
    private walletService: WalletService
  ) { }

  ngOnInit() {
    this.balanceSub = this.walletService.walletBalance$.subscribe(
      bal => { this.walletBalance = bal; }
    );
  }

  ngOnDestroy() {
    this.balanceSub?.unsubscribe();
  }

  onSearch(event: any) {
    const query = event.target.value;

    if (!query || query.length < 2) {
      this.showResults = false;
      this.searchResults = [];
      return;
    }
    this.loading = true;
    this.showResults = true;
    this.apiService.globalSearch(query).subscribe({
      next: (res: any) => {
        this.loading = false;

        const data = res?.data || {};

        const astrologers = (data.astrologers || []).map((a: any) => ({
          type: 'astrologer',
          id: a.id,
          slug: a.slug,
          name: a.display_name,
          image: a.profile_image_url
        }));

        const blogs = (data.blogs || []).map((b: any) => ({
          type: 'blog',
          id: b.id,
          slug: b.slug,
          title: b.title,
          image: b.image_url
        }));

        this.searchResults = [...astrologers, ...blogs];
      },
      error: () => {
        this.loading = false;
        this.searchResults = [];
      }
    });
  }

  goToDetail(item: any) {
    this.showResults = false;

    if (item.type === 'astrologer') {
      this.router.navigate(['/astroprofile', item.id]);
    } else if (item.type === 'blog') {
      this.router.navigate(['/blog-details', item.slug]);
    }
  }
}
