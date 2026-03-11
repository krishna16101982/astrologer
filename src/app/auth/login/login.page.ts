import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { IonContent, IonFooter, IonHeader, IonGrid, IonCol, IonRow, IonTitle, IonButton, IonToolbar, IonItem,IonInput, IonSelect, IonSelectOption } from '@ionic/angular/standalone';
import { TotalcountPage } from 'src/app/include/totalcount/totalcount.page';
import { ApiService } from 'src/app/services/api-service';

@Component({
  selector: 'app-login',
  templateUrl: './login.page.html',
  styleUrls: ['./login.page.scss'],
  standalone: true,
  imports: [IonContent, IonFooter,RouterLink,TotalcountPage, IonGrid, IonCol,  IonRow, IonHeader, IonTitle, IonButton, IonToolbar,IonInput, CommonModule, FormsModule,IonSelectOption, IonItem, IonSelect,FormsModule]
})
export class LoginPage implements OnInit {

  constructor(private apiService: ApiService) { }
 postData = {
    email: '',
    password: '',
    userId: 1
  };

  ngOnInit() {
  }

 submitPost() {
    this.apiService.login(this.postData).subscribe({
      next: (res) => {
        console.log('Response:', res);
        alert('Login successful!');
      },
      error: (err) => {
        console.log('Error:', err);
        alert('Something went wrong!');
      }
    });
  }
}

