import { Injectable } from '@angular/core';

import {
  LoadingController
} from '@ionic/angular';
import { NgZone } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class LoaderService {
  private loading: any = null;

  constructor(
    private loadingController: LoadingController,
    private zone: NgZone
  ) { }

  // =========================
  // SHOW LOADER
  // =========================

  async show(
    message: string = 'Please wait...'
  ) {
    try {
      // REMOVE OLD LOADER
      if (this.loading) {
        await this.loading.dismiss();
        this.loading = null;
      }
      // CREATE
      this.loading = await this.loadingController.create({
        message: message,
        translucent: true,
        spinner: 'crescent',
        backdropDismiss: false
      });
      // IMPORTANT FIX
      // ANDROID WEBVIEW
      // Use NgZone to ensure UI update in WebView, and increase timeout for Android
      setTimeout(() => {
        this.zone.run(async () => {
          try {
            if (this.loading) {
              await this.loading.present();
            }
          } catch (e) {
            console.log('Loader Present Error', e);
          }
        });
      }, 150);
    } catch (err) {
      console.log('Loader Show Error', err);
    }
  }

  // =========================
  // HIDE LOADER
  // =========================

  async hide() {
    try {
      if (this.loading) {
        await this.loading.dismiss();
        this.loading = null;
      }
    } catch (err) {
      console.log('Loader Hide Error', err);
    }
  }

  // =========================
  // MESSAGE ONLY
  // =========================

  async showMessage(
    message: string,
    duration: number = 3000
  ) {
    try {
      const loading = await this.loadingController.create({
        message: message,
        duration: duration,
        translucent: true,
        spinner: null
      });
      setTimeout(async () => {
        await loading.present();
      }, 50);
    } catch (err) {
      console.log('Loader Message Error', err);
    }
  }
}