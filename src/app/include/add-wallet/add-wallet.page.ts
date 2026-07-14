import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import {
  IonContent,
  IonButton,
  IonInput,
  IonSpinner,
  IonTitle,
  IonBackButton,
  IonToolbar,
  IonHeader,
  IonButtons,
  IonFooter,
  AlertController
} from '@ionic/angular/standalone';

import { ApiService } from 'src/app/services/api-service';
import { LoaderService } from 'src/app/services/loader.service';
import { WalletService } from 'src/app/services/wallet.service';
import { FooterPage } from 'src/app/include/footer/footer.page';

@Component({
  selector: 'app-add-wallet',
  templateUrl: './add-wallet.page.html',
  styleUrls: ['./add-wallet.page.scss'],
  standalone: true,
  imports: [
    IonButtons,
    IonHeader,
    IonToolbar,
    IonBackButton,
    IonTitle,
    CommonModule,
    FormsModule,
    IonContent,
    IonButton,
    IonInput,
    IonSpinner,
    IonFooter,
    FooterPage
  ]
})
export class AddWalletPage implements OnInit {

  walletBalance: any = 0;

  amount: any = '';

  transactions: any[] = [];

  loading = false;

  constructor(
    private apiService: ApiService,
    private loaderService: LoaderService,
    private walletService: WalletService,
    private alertController: AlertController
  ) { }

  ngOnInit() {

    this.getWalletBalance();

    this.getTransactions();

  }

  // ============================
  // GET WALLET BALANCE
  // ============================

  getWalletBalance() {

    this.apiService
      .getWalletBalance()
      .subscribe({

        next: (res: any) => {

          console.log(
            'BALANCE:',
            res
          );

          this.walletBalance =
            res?.data?.wallet_balance ||
            res?.wallet_balance ||
            0;

          // UPDATE HEADER BALANCE

          this.walletService.setBalance(
            this.walletBalance
          );

        },

        error: (err) => {

          console.log(err);

        }

      });

  }

  // ============================
  // GET TRANSACTIONS
  // ============================

  getTransactions() {

    this.loading = true;

    this.apiService
      .getWalletTransactions()
      .subscribe({

        next: (res: any) => {

          this.loading = false;

          console.log(
            'TRANSACTIONS:',
            res
          );

          this.transactions =
            res?.data?.transactions?.data ||
            [];

        },

        error: (err) => {

          this.loading = false;

          console.log(err);

        }

      });
  }

  // ============================
  // ADD MONEY
  // ============================

  addMoney() {

    if (
      !this.amount ||
      this.amount <= 0
    ) {

      this.showError('Please enter a valid amount');

      return;

    }

    this.loaderService.show(
      'Processing...'
    );

    this.apiService
      .addMoney(this.amount)
      .subscribe({

        next: (res: any) => {

          this.loaderService.hide();

          console.log(res);

          this.showSuccess('Money added successfully!');

          this.amount = '';

          // =====================
          // UPDATE BALANCE
          // =====================

          this.walletBalance =
            res?.data?.wallet_balance ||
            res?.wallet_balance ||
            0;

          // UPDATE HEADER

          this.walletService.setBalance(
            this.walletBalance
          );

          // REFRESH TRANSACTIONS

          this.getTransactions();

        },

        error: (err) => {

          this.loaderService.hide();

          console.log(err);

          this.showError('Something went wrong. Please try again.');

        }

      });

  }

  // ============================
  // ALERTS
  // ============================

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

}