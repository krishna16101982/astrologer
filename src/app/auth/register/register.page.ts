import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, NgForm } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { IonContent, IonButton, IonItem, IonInput, AlertController } from '@ionic/angular/standalone';
import { ApiService } from 'src/app/services/api-service';
import { AuthService } from 'src/app/services/auth';
import { LoaderService } from 'src/app/services/loader.service';

@Component({
  selector: 'app-register',
  templateUrl: './register.page.html',
  styleUrls: ['./register.page.scss'],
  standalone: true,
  imports: [IonContent, IonButton, IonItem, IonInput, RouterLink, CommonModule, FormsModule]
})
export class RegisterPage implements OnInit {

  constructor(
    private apiService: ApiService,
    private router: Router,
    private authService: AuthService,
    private alertController: AlertController,
    private loaderService: LoaderService
  ) { }

  registrationData = {
    name: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: ''
  };

  ngOnInit() {
    this.authService.logout();
  }

  ionVal(event: any): string {
    return String(event?.detail?.value ?? event?.target?.value ?? '');
  }

  onPhoneInput(event: any) {
    const raw = String(event?.detail?.value ?? event?.target?.value ?? '');
    const cleaned = raw.replace(/[^0-9]/g, '').slice(0, 10);
    this.registrationData.phone = cleaned;
    if (event.target) event.target.value = cleaned;
  }

  submitRegistration(form: NgForm) {
    form.form.markAllAsTouched();

    if (form.invalid) {
      return;
    }

    if (this.registrationData.password !== this.registrationData.confirmPassword) {
      this.showError('Passwords do not match.');
      return;
    }

    this.loaderService.show('Creating account...');

    const payload = {
      name: this.registrationData.name,
      email: this.registrationData.email,
      phone_number: this.registrationData.phone,
      password: this.registrationData.password,
      password_confirmation: this.registrationData.confirmPassword
    };

    this.apiService.register(payload).subscribe({
      next: async (res) => {
        this.loaderService.hide();
        const alert = await this.alertController.create({
          header: 'Success',
          message: 'Account created successfully! Please login to continue.',
          buttons: [{
            text: 'OK',
            handler: () => { this.router.navigateByUrl('/login'); }
          }]
        });
        await alert.present();
      },
      error: (err) => {
        this.loaderService.hide();
        const body = typeof err?.error === 'string'
          ? (() => { try { return JSON.parse(err.error); } catch { return {}; } })()
          : (err?.error || {});

        let errorMessage = body?.message || body?.error || err?.message || 'Registration failed. Please try again.';

        if (body?.errors && typeof body.errors === 'object') {
          const fieldErrors = Object.values(body.errors)
            .flat()
            .join('\n');
          if (fieldErrors) errorMessage = fieldErrors;
        }

        this.showError(errorMessage);
      }
    });
  }

  async showError(message: string) {
    const alert = await this.alertController.create({
      header: 'Error',
      message,
      buttons: ['OK']
    });
    await alert.present();
  }
}
