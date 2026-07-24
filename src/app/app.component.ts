import { Component } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { CommonModule } from '@angular/common';

import {
  IonApp,
  IonRouterOutlet,
  IonMenu,
  IonContent,
  IonIcon,
  MenuController,
  AlertController,
  ToastController } from '@ionic/angular/standalone';
import { HeaderComponent } from './include/header/header.component';
import { ApiService } from './services/api-service';
import { AuthService } from './services/auth';
import { filter } from 'rxjs/operators';

import { addIcons } from 'ionicons';
import {
  chevronBackOutline,
  homeOutline,
  personOutline,
  walletOutline,
  timeOutline,
  languageOutline,
  peopleOutline,
  documentTextOutline,
  syncCircleOutline,
  shieldCheckmarkOutline,
  logOutOutline,
  trashOutline,
  arrowForward,
  close,
  person,
  notificationsOutline,
  settingsOutline,
  personAddOutline,
  helpBuoyOutline,
  informationCircleOutline,
  starOutline,
  chevronForward,
  chevronDown,
  shareSocialOutline,
  peopleCircleOutline,
  logoFacebook,
  logoInstagram,
  logoLinkedin,
  logoYoutube,
  sparklesOutline,
  heartOutline
} from 'ionicons/icons';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    IonApp,
    IonMenu,
    IonContent,
    IonIcon,
    IonRouterOutlet,
    HeaderComponent,
    CommonModule
  ],
  templateUrl: 'app.component.html',
  styleUrls: ['app.component.scss'],
})
export class AppComponent {
  showHeader = false;
  isLoggedIn = false;
  user: any = null;

  constructor(
    private apiService: ApiService,
    private router: Router,
    private authService: AuthService,
    private menuController: MenuController,
    private alertController: AlertController,
    private toastController: ToastController
  ) {
    addIcons({
      chevronBackOutline, homeOutline, personOutline, walletOutline, timeOutline,
      languageOutline, peopleOutline, documentTextOutline, syncCircleOutline,
      shieldCheckmarkOutline, logOutOutline, trashOutline, arrowForward,
      close, person, notificationsOutline, settingsOutline, personAddOutline,
      helpBuoyOutline, informationCircleOutline, starOutline, chevronForward,
      chevronDown, shareSocialOutline, peopleCircleOutline,
      logoFacebook, logoInstagram, logoLinkedin, logoYoutube,
      sparklesOutline, heartOutline
    });

    this.authService.authState$.subscribe(status => {
      this.isLoggedIn = status;
      this.updateHeader();
      if (status) {
        this.loadProfile();
      } else {
        this.user = null;
      }
    });

    this.router.events
      .pipe(filter(event => event instanceof NavigationEnd))
      .subscribe(() => {
        this.updateHeader();
      });
  }

  updateHeader() {
    const url = this.router.url;
    this.showHeader = !url.includes('login') && !url.includes('register');
  }

  // =========================
  // USER PROFILE
  // =========================
  // Fall back to the local placeholder when the remote avatar URL fails to load.
  onImageError(event: Event): void {
    const img = event.target as HTMLImageElement;
    img.src = 'assets/images/profileicon.png';
  }

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

  loadProfile() {
    this.apiService.getWalletDetails().subscribe({
      next: (res: any) => {
        this.user = res?.data?.user || res?.data || null;
        // TEMP DEBUG: inspect what the profile API returns for the avatar image.
        console.log('[PROFILE DEBUG] full response =', res);
        console.log('[PROFILE DEBUG] user =', this.user);
        console.log('[PROFILE DEBUG] profile_image =', this.user?.profile_image,
          '| profile_image_url =', this.user?.profile_image_url,
          '| image =', this.user?.image,
          '| avatar =', this.user?.avatar);
        console.log('[PROFILE DEBUG] resolved URL =', this.profileImageUrl());
      },
      error: () => { this.user = null; }
    });
  }

  // =========================
  // NAVIGATION HELPERS
  // =========================
  async navigate(path: string) {
    await this.menuController.close();
    this.router.navigateByUrl(path);
  }

  // Routes that stay open without login (astrology tools that don't need an account).
  private readonly publicPaths = ['/kundli', '/kundli-matching'];

  // Navigate to a route that requires login; prompt to log in if not authenticated.
  async navigateAuth(path: string) {
    await this.menuController.close();
    if (this.isLoggedIn || this.publicPaths.includes(path)) {
      this.router.navigateByUrl(path);
      return;
    }
    const alert = await this.alertController.create({
      header: 'Login Required',
      message: 'Please log in to continue.',
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        { text: 'Login', handler: () => this.router.navigateByUrl('/login') }
      ]
    });
    await alert.present();
  }

  async closeMenu() {
    await this.menuController.close();
  }

  async openExternal(slug: string) {
    await this.menuController.close();
    window.open(`https://astroauraa.com/${slug}`, '_blank');
  }

  async openUrl(url: string) {
    await this.menuController.close();
    window.open(url, '_blank');
  }

  async comingSoon(label: string) {
    await this.menuController.close();
    const toast = await this.toastController.create({
      message: `${label} is coming soon`,
      duration: 2000,
      position: 'bottom'
    });
    await toast.present();
  }

  async share() {
    await this.menuController.close();
    const shareData = {
      title: 'Astroaura',
      text: 'Talk to expert astrologers on Astroaura!',
      url: 'https://astroauraa.com'
    };
    if (navigator.share) {
      try { await navigator.share(shareData); } catch { /* user cancelled */ }
    } else {
      window.open('https://astroauraa.com', '_blank');
    }
  }

  rateUs() {
    this.openUrl('https://play.google.com/store/apps/details?id=com.example.astrologer');
  }

  // =========================
  // ACCOUNT ACTIONS
  // =========================
  logout() {
    this.apiService.logout().subscribe({
      next: () => this.finishLogout(),
      error: () => this.finishLogout()
    });
  }

  private finishLogout() {
    this.authService.logout();
    this.isLoggedIn = false;
    this.user = null;
    this.menuController.close();
    window.location.href = '/login';
  }

  async deleteAccount() {
    await this.menuController.close();
    const alert = await this.alertController.create({
      header: 'Delete Account',
      message: 'Are you sure you want to permanently delete your account? This action cannot be undone.',
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        {
          text: 'Delete',
          role: 'destructive',
          handler: async () => {
            const toast = await this.toastController.create({
              message: 'Account deletion will be available soon.',
              duration: 2500,
              position: 'bottom'
            });
            await toast.present();
          }
        }
      ]
    });
    await alert.present();
  }
}
