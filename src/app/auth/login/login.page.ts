import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { IonContent, IonFooter, IonHeader, IonGrid, IonCol, IonRow, IonTitle, IonButton, IonToolbar, IonItem,IonInput, IonSelect, IonSelectOption } from '@ionic/angular/standalone';
import { TotalcountPage } from 'src/app/include/totalcount/totalcount.page';

@Component({
  selector: 'app-login',
  templateUrl: './login.page.html',
  styleUrls: ['./login.page.scss'],
  standalone: true,
  imports: [IonContent, IonFooter,RouterLink,TotalcountPage, IonGrid, IonCol,  IonRow, IonHeader, IonTitle, IonButton, IonToolbar,IonInput, CommonModule, FormsModule,IonSelectOption, IonItem, IonSelect]
})
export class LoginPage implements OnInit {

  constructor() { }

  ngOnInit() {
  }

}
