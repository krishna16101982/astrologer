import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, NgForm } from '@angular/forms';
import { Subscription } from 'rxjs';

import {
  IonContent,
  IonIcon,
  AlertController,
  IonHeader,
  IonButtons,
  IonBackButton,
  IonToolbar,
  IonTitle,
  IonFooter
} from '@ionic/angular/standalone';

import { addIcons } from 'ionicons';
import { walletOutline, timeOutline } from 'ionicons/icons';

import { ApiService } from 'src/app/services/api-service';
import { WalletService } from 'src/app/services/wallet.service';
import { Router } from '@angular/router';
import { FooterPage } from 'src/app/include/footer/footer.page';

@Component({
  selector: 'app-user-dashboard',
  standalone: true,
  templateUrl: './user-dashboard.page.html',
  styleUrls: ['./user-dashboard.page.scss'],
  imports: [
    IonTitle, IonToolbar, IonBackButton, IonButtons, IonHeader,
    CommonModule, FormsModule, IonContent, IonIcon, IonFooter, FooterPage
  ]
})
export class UserDashboardPage implements OnInit, OnDestroy {

  user: any = {};
  walletBalance: any = 0;
  selectedFile: File | null = null;
  imagePreview: string | null = null;
  loading = false;

  profileData = {
    name: '',
    email: '',
    phone: '',
    bio: ''
  };

  private balanceSub!: Subscription;

  constructor(
    private apiService: ApiService,
    private alertController: AlertController,
    private walletService: WalletService,
    private router: Router
  ) {
    addIcons({ walletOutline, timeOutline });
  }

  ngOnInit() {
    this.getProfile();
    this.getWalletBalance();
    this.balanceSub = this.walletService.walletBalance$.subscribe(
      bal => { this.walletBalance = bal; }
    );
  }

  ngOnDestroy() {
    this.balanceSub?.unsubscribe();
  }

  // =========================
  // PROFILE IMAGE URL
  // =========================

  profileImageUrl(): string {
    const u = this.user || {};
    const img = u.profile_image || u.profile_image_url || u.image || u.avatar || '';
    if (!img) {
      return 'assets/images/profileicon.png';
    }
    if (img.startsWith('http')) {
      return img;
    }
    return `https://astroauraa.com/storage/${img}`;
  }

  // =========================
  // GET PROFILE
  // =========================

  getProfile() {
    this.apiService.getWalletDetails().subscribe({
      next: (res: any) => {
        const u = res.data?.user || res.data || {};
        this.user = u;
        this.profileData.name  = u.name          || '';
        this.profileData.email = u.email         || '';
        this.profileData.phone = u.phone_number  || '';
        this.profileData.bio   = u.bio           || '';
      },
      error: () => {}
    });
  }

  // =========================
  // WALLET BALANCE
  // =========================

  getWalletBalance() {
    this.apiService.getWalletBalance().subscribe({
      next: (res: any) => {
        const bal = res?.data?.wallet_balance || 0;
        this.walletService.setBalance(Number(bal));
      },
      error: () => {}
    });
  }

  // =========================
  // FILE CHANGE
  // =========================

  onPhoneInput(event: any) {
    const cleaned = event.target.value.replace(/[^0-9]/g, '').slice(0, 10);
    this.profileData.phone = cleaned;
    event.target.value = cleaned;
  }

  onFileChange(event: any) {
    const file: File = event.target.files[0];
    if (!file) return;

    // Android's WebView often hands back a file with an empty or unexpected `type` — content
    // resolved through a document provider (Drive, Files, some galleries) frequently carries no
    // MIME at all. Judging solely on `file.type` therefore rejects perfectly valid images on
    // device, which is why the picker appeared to do nothing in the APK. Fall back to the
    // extension when the MIME type is missing or unrecognised.
    const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'image/gif'];
    const allowedExtensions = ['jpg', 'jpeg', 'png', 'gif'];
    const extension = (file.name.split('.').pop() || '').toLowerCase();

    const looksLikeImage = allowedTypes.includes((file.type || '').toLowerCase())
      || allowedExtensions.includes(extension);

    if (!looksLikeImage) {
      this.showError('Only JPEG, PNG, JPG, and GIF images are allowed.');
      event.target.value = '';
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      this.showError('Image size must be less than 2 MB.');
      event.target.value = '';
      return;
    }

    this.selectedFile = file;

    const reader = new FileReader();
    reader.onload = () => { this.imagePreview = reader.result as string; };
    reader.readAsDataURL(file);
  }

  // =========================
  // UPDATE PROFILE
  // =========================

  updateProfile(form: NgForm) {
    form.form.markAllAsTouched();

    if (form.invalid) {
      return;
    }

    const formData = new FormData();
    formData.append('name', this.profileData.name.trim());
    formData.append('phone_number', this.profileData.phone.trim());
    formData.append('bio', this.profileData.bio?.trim() || '');
    if (this.selectedFile) {
      formData.append('profile_image', this.selectedFile);
    }

    this.loading = true;

    this.apiService.updateProfile(formData).subscribe({
      next: (res: any) => {
        this.loading = false;
        const u = res.data?.user || {};
        this.user        = u;
        this.profileData.name  = u.name         || this.profileData.name;
        this.profileData.phone = u.phone_number || this.profileData.phone;
        this.profileData.bio   = u.bio          || this.profileData.bio;
        this.selectedFile  = null;
        this.imagePreview  = null;
        this.showSuccess('Profile updated successfully!');
      },
      error: (err: any) => {
        this.loading = false;
        const msg = err?.error?.message || err?.message || 'Failed to update profile. Please try again.';
        this.showError(msg);
      }
    });
  }

  // =========================
  // ALERTS
  // =========================

  async showError(message: string) {
    const alert = await this.alertController.create({
      header: 'Error',
      message,
      buttons: ['OK']
    });
    await alert.present();
  }

  async showSuccess(message: string) {
    const alert = await this.alertController.create({
      header: 'Success',
      message,
      buttons: ['OK']
    });
    await alert.present();
  }

  navigateToAddMoney() {
    this.router.navigate(['/wallet']);
  }

  navigateToChatHistory() {
    this.router.navigate(['/chat-history']);
  }
}
