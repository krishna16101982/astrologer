import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, NgForm } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { IonContent, IonButton, IonItem, IonInput, AlertController } from '@ionic/angular/standalone';
import { TotalcountPage } from 'src/app/include/totalcount/totalcount.page';
import { ApiService } from 'src/app/services/api-service';
import { AuthService } from 'src/app/services/auth';
import { LoaderService } from 'src/app/services/loader.service';

@Component({
  selector: 'app-login',
  templateUrl: './login.page.html',
  styleUrls: ['./login.page.scss'],
  standalone: true,
  imports: [IonContent, IonButton, IonItem, IonInput, RouterLink, TotalcountPage, CommonModule, FormsModule]
})
export class LoginPage implements OnInit {

  constructor(
    private apiService: ApiService,
    private router: Router,
    private authService: AuthService,
    private alertController: AlertController,
    private loaderService: LoaderService
  ) { }
  postData = {
    email: '',
    password: '',
    userId: 1
  };

  ngOnInit() {
    this.authService.logout();
  }

  submitPost(form: NgForm) {
    form.form.markAllAsTouched();

    if (form.invalid) {
      return;
    }

    //this.loaderService.show('Logging in...');

    this.apiService.login(this.postData).subscribe({
      next: (res) => {
       // this.loaderService.hide();
        localStorage.setItem('accessToken', res.data.access_token);
        this.authService.login(res.data.access_token);
        this.router.navigateByUrl('/home');
      },
      error: (err) => {
       // this.loaderService.hide();
        const body = typeof err?.error === 'string'
          ? (() => { try { return JSON.parse(err.error); } catch { return {}; } })()
          : (err?.error || {});
        const errorMessage =
          body?.message ||
          body?.error ||
          err?.message ||
          'Login failed. Please check your credentials.';
        this.showError(errorMessage);
      }
    });
  }

  async showError(message: string) {
    const alert = await this.alertController.create({
      header: 'Error',
      message: message,
      buttons: ['OK']
    });
    await alert.present();
  }
}

