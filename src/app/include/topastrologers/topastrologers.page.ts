import { Component, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {RouterLink} from '@angular/router'
import { IonContent, IonHeader, IonTitle, IonToolbar } from '@ionic/angular/standalone';

@Component({
  selector: 'app-topastrologers',
  templateUrl: './topastrologers.page.html',
  styleUrls: ['./topastrologers.page.scss'],
  standalone: true,
   schemas: [CUSTOM_ELEMENTS_SCHEMA],
  imports: [IonContent,RouterLink, IonHeader, IonTitle, IonToolbar, CommonModule, FormsModule]
})
export class TopastrologersPage {

  constructor() { }

  ngOnInit() {
  }

}
