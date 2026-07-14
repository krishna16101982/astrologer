import { ChangeDetectorRef, Component } from '@angular/core';
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
import { KundliMatchStore } from 'src/app/services/kundli-store';

type Person = 'boy' | 'girl';

@Component({
  selector: 'app-kundli-matching',
  templateUrl: './kundli-matching.page.html',
  styleUrls: ['./kundli-matching.page.scss'],
  standalone: true,
  imports: [
    IonContent, IonHeader, IonToolbar, IonTitle, IonButtons, IonBackButton,
    IonFooter, IonSpinner, CommonModule, FormsModule, RouterLink, FooterPage
  ]
})
export class KundliMatchingPage {

  boy = { name: '', dob: '', tob: '', place: '' };
  girl = { name: '', dob: '', tob: '', place: '' };
  ayanamsa = 'Lahiri';
  isLoading = false;
  errorMessage = '';

  // Location autocomplete state, kept per person so the two inputs don't share a dropdown.
  suggestions: Record<Person, any[]> = { boy: [], girl: [] };
  showSuggestions: Record<Person, boolean> = { boy: false, girl: false };
  private searchTimeout: Record<Person, any> = { boy: null, girl: null };
  private selectedCoordinates: Record<Person, string | null> = { boy: null, girl: null };

  constructor(
    private alertController: AlertController,
    private apiService: ApiService,
    private router: Router,
    private store: KundliMatchStore,
    private cd: ChangeDetectorRef
  ) {}

  onPlaceInput(person: Person, event: any) {
    const query = event?.target?.value?.trim() || '';
    this.showSuggestions[person] = query.length > 0;

    // A hand-edited place invalidates whatever coordinates were picked from the list.
    this.selectedCoordinates[person] = null;

    if (this.searchTimeout[person]) {
      clearTimeout(this.searchTimeout[person]);
    }

    if (!query) {
      this.suggestions[person] = [];
      this.showSuggestions[person] = false;
      return;
    }

    this.searchTimeout[person] = setTimeout(() => {
      this.searchLocations(person, query);
    }, 300);
  }

  private async searchLocations(person: Person, query: string) {
    try {
      const response = await this.apiService.searchLocations(query);
      this.suggestions[person] = response || [];
      this.showSuggestions[person] = this.suggestions[person].length > 0;
      try { this.cd.detectChanges(); } catch (e) { /* noop */ }
    } catch (error) {
      this.suggestions[person] = [];
      this.showSuggestions[person] = false;
    }
  }

  selectLocation(person: Person, location: any) {
    const name = location[1] || '';
    const state = location[2] || '';
    const country = location[3] || '';
    this[person].place = [name, state, country].filter(x => x).join(', ');
    this.showSuggestions[person] = false;
    this.suggestions[person] = [];

    const lat = location[6];
    const lon = location[7];
    this.selectedCoordinates[person] = lat && lon ? `${lat},${lon}` : null;
  }

  closeSuggestions(person: Person) {
    setTimeout(() => {
      this.showSuggestions[person] = false;
    }, 400);
  }

  async calculate() {
    const missing: string[] = [];
    if (!this.boy.name?.trim())  { missing.push("Boy's Name"); }
    if (!this.boy.dob)           { missing.push("Boy's Date of Birth"); }
    if (!this.boy.tob)           { missing.push("Boy's Time of Birth"); }
    if (!this.boy.place?.trim()) { missing.push("Boy's Place of Birth"); }
    if (!this.girl.name?.trim()) { missing.push("Girl's Name"); }
    if (!this.girl.dob)          { missing.push("Girl's Date of Birth"); }
    if (!this.girl.tob)          { missing.push("Girl's Time of Birth"); }
    if (!this.girl.place?.trim()){ missing.push("Girl's Place of Birth"); }

    if (missing.length) {
      await this.showAlert('Missing details', `Please fill: ${missing.join(', ')}.`);
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';

    try {
      const response = await this.apiService.generateKundliMatching({
        boy: {
          // Prefer the coordinates captured from the suggestion list; the raw text is only
          // a fallback and has to be geocoded again server-side.
          place: this.selectedCoordinates.boy || this.boy.place,
          dob: this.boy.dob,
          tob: this.boy.tob
        },
        girl: {
          place: this.selectedCoordinates.girl || this.girl.place,
          dob: this.girl.dob,
          tob: this.girl.tob
        },
        ayanamsa: this.ayanamsa
      });

      const data = response?.data ?? response;
      if (!data || !Object.keys(data).length) {
        throw new Error(response?.message || 'The astrology service returned no matching data.');
      }

      this.store.set({
        boy: { ...this.boy },
        girl: { ...this.girl },
        ayanamsa: this.ayanamsa,
        raw: response
      });

      await this.router.navigate(['/kundli-matching-result']);
    } catch (error: any) {
      this.errorMessage = error?.error?.message || error?.message || 'Unable to calculate compatibility right now.';
      await this.showAlert('Unable to calculate compatibility', this.errorMessage);
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
}
