import { Component } from '@angular/core';
import { Location } from '@angular/common';
import { IonButton, IonButtons, IonIcon } from '@ionic/angular/standalone';

@Component({
  selector: 'app-back-button',
  template: `
    <ion-buttons slot="start">
      <ion-button (click)="goBack()">
        <ion-icon slot="icon-only" name="arrow-back"></ion-icon>
      </ion-button>
    </ion-buttons>
  `,
  standalone: true,
  imports: [IonButton, IonButtons, IonIcon]
})
export class BackButtonComponent {
  constructor(private location: Location) {}

  goBack() {
    this.location.back();
  }
}
