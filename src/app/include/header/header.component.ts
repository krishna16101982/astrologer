import {
  Component,
  OnInit
} from '@angular/core';

import {
  CommonModule
} from '@angular/common';

import {
  IonicModule,
  AlertController
} from '@ionic/angular';

import {
  Router,
  RouterLink
} from '@angular/router';

import {
  ApiService
} from 'src/app/services/api-service';

import {
  AuthService
} from 'src/app/services/auth';

import {
  WalletService
} from 'src/app/services/wallet.service';

@Component({
  selector: 'app-header',
  standalone: true,
  templateUrl:
    './header.component.html',
  styleUrls:
    ['./header.component.scss'],
  imports: [
    CommonModule,
    IonicModule,
    RouterLink
  ],
})
export class HeaderComponent
  implements OnInit {

  isMenuOpen = false;

  walletDetails: any = null;

  walletBalance = 0;

  isLoggedIn = false;

  user: any = null;

  constructor(

    private authService:
      AuthService,

    private apiService:
      ApiService,

    private router:
      Router,

    private alertController:
      AlertController,

    private walletService:
      WalletService

  ) {}

  // =========================
  // INIT
  // =========================

  ngOnInit() {

    this.checkAuthStatus();

    // =========================
    // LIVE WALLET UPDATE
    // =========================

    this.walletService
      .walletBalance$
      .subscribe((balance) => {

        this.walletBalance =
          balance;

        // UPDATE UI
        this.walletDetails = {
          wallet_balance: balance
        };

      });

  }

  // =========================
  // CHECK LOGIN STATUS
  // =========================

  checkAuthStatus() {

    const token =
      localStorage.getItem(
        'accessToken'
      );

    this.isLoggedIn =
      !!token;

    if (this.isLoggedIn) {

      this.getWalletBalance();

      this.loadProfile();

    } else {

      this.walletBalance = 0;

      this.walletDetails = {
        wallet_balance: 0
      };

      this.user = null;

    }

  }

  // =========================
  // LOAD PROFILE (for avatar)
  // =========================

  loadProfile() {

    this.apiService
      .getWalletDetails()
      .subscribe({
        next: (res: any) => {
          this.user = res?.data?.user || res?.data || null;
        },
        error: () => {
          this.user = null;
        }
      });

  }

  // =========================
  // PROFILE IMAGE URL
  // =========================

  profileImageUrl(): string {

    const u = this.user || {};

    const img =
      u.profile_image ||
      u.profile_image_url ||
      u.image ||
      u.avatar ||
      '';

    if (!img) {
      return 'assets/images/profileicon.png';
    }

    if (img.startsWith('http')) {
      return img;
    }

    return `https://astroauraa.com/storage/${img}`;

  }

  // =========================
  // GET WALLET BALANCE
  // =========================

  getWalletBalance() {

    this.apiService
      .getWalletBalance()
      .subscribe({

        next: (res: any) => {

          console.log(
            'WALLET RESPONSE',
            res
          );

          this.walletDetails =
            res?.data || {};

          this.walletBalance =
            Number(
              res?.data
                ?.wallet_balance || 0
            );

          // =========================
          // UPDATE SERVICE
          // =========================

          this.walletService
            .setBalance(
              this.walletBalance
            );

        },

        error: (err: any) => {

          console.log(
            'WALLET ERROR',
            err
          );

        }

      });

  }

  // =========================
  // PROFILE CLICK
  // =========================

  async navigateToProfile() {

    const isLoggedIn =
      await this.checkLogin();

    if (!isLoggedIn) {

      return;

    }

    this.router.navigate([
      '/user/dashboard'
    ]);

  }

  // =========================
  // WALLET CLICK
  // =========================

  async openWallet() {

    const isLoggedIn =
      await this.checkLogin();

    if (!isLoggedIn) {

      return;

    }

    this.router.navigate([
      '/wallet'
    ]);

  }

  // =========================
  // TOGGLE MENU
  // =========================

  toggleMenu() {

    this.isMenuOpen =
      !this.isMenuOpen;

  }

  // =========================
  // CHECK LOGIN
  // =========================

  async checkLogin():
    Promise<boolean> {

    const token =
      localStorage.getItem(
        'accessToken'
      );

    if (!token) {

      const alert =
        await this.alertController
          .create({

            header:
              'Login Required',

            message:
              'Please login to continue.',

            buttons: [

              {
                text: 'Cancel',
                role: 'cancel'
              },

              {
                text: 'Login',

                handler: () => {

                  this.router.navigate([
                    '/login'
                  ]);

                }

              }

            ]

          });

      await alert.present();

      return false;

    }

    return true;

  }

}