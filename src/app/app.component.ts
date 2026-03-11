import { Component } from '@angular/core';
import { IonicModule } from '@ionic/angular';
import { RouterOutlet } from '@angular/router';
import { CommonModule } from '@angular/common';
// import { register } from 'swiper/element/bundle';


import { IonApp, IonRouterOutlet, IonMenu, IonHeader, IonToolbar, IonTitle, IonContent, IonList, IonItem } from '@ionic/angular/standalone';



// register(); // Register Swiper custom elements
@Component({
  selector: 'app-root',
  standalone: true,
 imports: [
    IonApp,
    IonMenu,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    IonList,
    IonItem,
    IonRouterOutlet,
    RouterOutlet
  ],
  templateUrl: 'app.component.html',
})
export class AppComponent {}




