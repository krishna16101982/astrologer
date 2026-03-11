import { Component, CUSTOM_ELEMENTS_SCHEMA, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
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

import { HomesliderPage} from '../include/homeslider/homeslider.page';
import { FouroptionPage } from '../include/fouroption/fouroption.page';
import { TopastrologersPage } from '../include/topastrologers/topastrologers.page';
import { AstrologyPredictionsPage } from '../include/astrology-predictions/astrology-predictions.page';
import { NewsPage } from '../include/news/news.page';
import { TotalcountPage } from '../include/totalcount/totalcount.page';
import { FooterPage } from '../include/footer/footer.page';
import { ApiService } from '../services/api-service';

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
    TopastrologersPage,  AstrologyPredictionsPage, NewsPage, TotalcountPage, FooterPage],
  

  templateUrl: './home.page.html',
  styleUrls: ['./home.page.scss']
})
export class HomePage implements OnInit {

 slideOpts = {
    initialSlide: 0,
    speed: 400,
    loop: true,
    pagination: { clickable: true },
    autoplay: { delay: 3000, disableOnInteraction: false }
  };
  constructor(private apiService: ApiService) { }

  ngOnInit() {

  }

}
