import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonContent,  IonTitle,
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
  IonSearchbar } from '@ionic/angular/standalone';
import { FooterPage } from 'src/app/include/footer/footer.page';

@Component({
  selector: 'app-astroprofile',
  templateUrl: './astroprofile.page.html',
  styleUrls: ['./astroprofile.page.scss'],
  standalone: true,
  imports: [IonContent,  IonTitle,
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

  constructor() { }

  ngOnInit() {
  }

}
