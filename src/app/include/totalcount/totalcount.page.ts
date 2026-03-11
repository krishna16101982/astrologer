import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonContent, IonHeader, IonTitle, IonToolbar, IonCol, IonGrid, IonRow, IonItem } from '@ionic/angular/standalone';

@Component({
  selector: 'app-totalcount',
  templateUrl: './totalcount.page.html',
  styleUrls: ['./totalcount.page.scss'],
  standalone: true,
  imports: [IonContent, IonHeader, IonTitle,IonCol, IonToolbar, CommonModule, FormsModule, IonGrid, IonRow, IonItem]
})
export class TotalcountPage implements OnInit {

  constructor() { }

  ngOnInit() {
  }

}
