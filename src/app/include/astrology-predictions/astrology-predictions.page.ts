import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonContent, IonHeader, IonTitle, IonToolbar } from '@ionic/angular/standalone';

@Component({
  selector: 'app-astrology-predictions',
  templateUrl: './astrology-predictions.page.html',
  styleUrls: ['./astrology-predictions.page.scss'],
  standalone: true,
  imports: [IonContent, IonHeader, IonTitle, IonToolbar, CommonModule, FormsModule]
})
export class AstrologyPredictionsPage implements OnInit {

  constructor() { }

  ngOnInit() {
  }

}
