import { Component, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import {
  IonContent,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonButtons,
  IonBackButton,
  IonFooter,
  IonSpinner,
  AlertController
} from '@ionic/angular/standalone';
import { FooterPage } from 'src/app/include/footer/footer.page';
import { ApiService } from 'src/app/services/api-service';
import { KundliStore } from 'src/app/services/kundli-store';

@Component({
  selector: 'app-kundli',
  templateUrl: './kundli.page.html',
  styleUrls: ['./kundli.page.scss'],
  standalone: true,
  imports: [
    IonContent, IonHeader, IonToolbar, IonTitle, IonButtons, IonBackButton,
    IonFooter, IonSpinner, CommonModule, FormsModule, RouterLink, FooterPage
  ]
})
export class KundliPage {

  form = {
    name: '',
    gender: 'male',
    dob: '',
    tob: '',
    place: '',
    ayanamsa: 'Lahiri',
    language: 'English',
    chartType: 'Basic'
  };

  isLoading = false;
  errorMessage = '';
  locationSuggestions: any[] = [];
  showLocationSuggestions = false;
  private searchTimeout: any = null;
  private selectedCoordinates: string | null = null;

  constructor(
    private alertController: AlertController,
    private apiService: ApiService,
    private router: Router,
    private store: KundliStore,
    private cd: ChangeDetectorRef
  ) {}

  onPlaceInput(event: any) {
    const query = event?.target?.value?.trim() || '';
    this.showLocationSuggestions = query.length > 0;

    // Clear any previously selected coordinates when user edits the place
    this.selectedCoordinates = null;

    if (this.searchTimeout) {
      clearTimeout(this.searchTimeout);
    }

    if (!query) {
      this.locationSuggestions = [];
      this.showLocationSuggestions = false;
      return;
    }

    this.searchTimeout = setTimeout(() => {
      this.searchLocations(query);
    }, 300);
  }

  private async searchLocations(query: string) {
    try {
      const response = await this.apiService.searchLocations(query);
      this.locationSuggestions = response || [];
      this.showLocationSuggestions = this.locationSuggestions.length > 0;
      // ensure view updates immediately
      try { this.cd.detectChanges(); } catch (e) { /* noop */ }
    } catch (error) {
      this.locationSuggestions = [];
      this.showLocationSuggestions = false;
    }
  }

  selectLocation(location: any) {
    const name = location[1] || '';
    const state = location[2] || '';
    const country = location[3] || '';
    this.form.place = [name, state, country].filter(x => x).join(', ');
    this.showLocationSuggestions = false;
    this.locationSuggestions = [];
    // store coordinates so we don't call the location search again on submit
    const lat = location[6];
    const lon = location[7];
    if (lat && lon) {
      this.selectedCoordinates = `${lat},${lon}`;
    } else {
      this.selectedCoordinates = null;
    }
  }

  async generate() {
    const missing: string[] = [];
    if (!this.form.name?.trim()) { missing.push('Name'); }
    if (!this.form.dob) { missing.push('Date of Birth'); }
    if (!this.form.tob) { missing.push('Time of Birth'); }
    if (!this.form.place?.trim()) { missing.push('Birth Location'); }

    if (missing.length) {
      await this.showAlert('Missing details', `Please fill: ${missing.join(', ')}.`);
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';

    try {
      const response = await this.apiService.generateKundli({
        name: this.form.name,
        gender: this.form.gender,
        dob: this.form.dob,
        tob: this.form.tob,
        place: this.selectedCoordinates || this.form.place,
        ayanamsa: this.form.ayanamsa,
        language: this.form.language,
        chartType: this.form.chartType
      });

      const data = response?.data ?? response;
      if (!data || !Object.keys(data).length) {
        throw new Error(response?.message || 'The astrology service returned no chart data.');
      }

      this.store.set({
        birth: {
          name: this.form.name,
          gender: this.form.gender,
          dob: this.form.dob,
          tob: this.form.tob,
          place: this.form.place
        },
        raw: response
      });

      await this.router.navigate(['/kundli-result']);
    } catch (error: any) {
      this.errorMessage = error?.error?.message || error?.message || 'Unable to generate kundli right now.';
      await this.showAlert('Unable to generate kundli', this.errorMessage);
    } finally {
      this.isLoading = false;
    }
  }

  private async showAlert(header: string, message: string) {
    const alert = await this.alertController.create({
      header,
      message,
      buttons: ['OK']
    });
    await alert.present();
  }

  closeSuggestions() {
    setTimeout(() => {
      this.showLocationSuggestions = false;
    }, 400);
  }
}
