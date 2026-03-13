import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  IonContent, IonTitle,
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
import { FooterPage } from 'src/app/include/footer/footer.page';
import { ApiService } from 'src/app/services/api-service';
import { ActivatedRoute, Route } from '@angular/router';

@Component({
  selector: 'app-astroprofile',
  templateUrl: './astroprofile.page.html',
  styleUrls: ['./astroprofile.page.scss'],
  standalone: true,
  imports: [CommonModule, IonContent, IonTitle,
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
    IonSearchbar, FooterPage]
})
export class AstroprofilePage implements OnInit {
  astrologerDetails: any;
  id: any;

  constructor(private apiService: ApiService, private route: ActivatedRoute) {
    this.route.paramMap.subscribe(params => {
      this.id = params.get('id');
    });
  }

  ngOnInit() {
    this.getastrologerDetails();
  }

  getastrologerDetails() {
    this.apiService.getAstrologerProfile(this.id).subscribe({
      next: (res) => {
        console.log('Home Data:', res);
        this.astrologerDetails = res.data;
      },
      error: (err) => {
        console.log('Error:', err);
      }
    });
  }
}
