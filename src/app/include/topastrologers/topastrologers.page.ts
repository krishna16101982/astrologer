import { Component, CUSTOM_ELEMENTS_SCHEMA, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router'
import { IonContent, IonHeader, IonTitle, IonToolbar } from '@ionic/angular/standalone';
import { ApiService } from 'src/app/services/api-service';

@Component({
  selector: 'app-topastrologers',
  templateUrl: './topastrologers.page.html',
  styleUrls: ['./topastrologers.page.scss'],
  standalone: true,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  imports: [IonContent, RouterLink, IonHeader, IonTitle, IonToolbar, CommonModule, FormsModule]
})
export class TopastrologersPage implements OnInit {
  topAstrologers: any;

  constructor(private apiService: ApiService) { }

  ngOnInit() {
    this.getHomeData();
  }

  getHomeData() {
    this.apiService.getHomeData().subscribe({
      next: (res) => {
        console.log('Home Data:', res);
        this.topAstrologers = res.data.data;
      },
      error: (err) => {
        console.log('Error:', err);
      }
    });
  }
}
