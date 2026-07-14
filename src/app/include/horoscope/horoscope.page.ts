import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { CommonModule } from '@angular/common';
import { IonContent, IonHeader, IonToolbar, IonTitle, IonButtons, IonBackButton, IonButton, IonFooter, IonSpinner } from '@ionic/angular/standalone';
import { ApiService } from 'src/app/services/api-service';
import { FooterPage } from 'src/app/include/footer/footer.page';

interface SignTraits {
  polarity: string;
  element: string;
  modality: string;
  ruler: string;
}

interface Prediction {
  prediction: string;
  seek: string;
  challenge: string;
  insight: string;
}

interface Transit {
  planet: string;
  zodiac: string;
  house: number | string;
  status: string;
}

interface Aspect {
  from: string;
  to: string;
  type: string;
  /** Harmonious aspects read green, tense ones red — as in classical interpretation. */
  tone: 'harmonious' | 'tense' | 'neutral';
}

@Component({
  selector: 'app-horoscope',
  templateUrl: './horoscope.page.html',
  styleUrls: ['./horoscope.page.scss'],
  standalone: true,
  imports: [IonContent, IonHeader, IonToolbar, IonTitle, IonButtons, IonBackButton, IonButton, IonFooter, IonSpinner, CommonModule, FooterPage]
})
export class HoroscopePage implements OnInit {

  selectedSign = 'aries';
  activeTab = 'general';
  today: Date = new Date();

  zodiacList: any;
  /** Keyed by tab: general | health | career | love. */
  horoscopeData: Record<string, Prediction> = {};
  traits: SignTraits = { polarity: '', element: '', modality: '', ruler: '' };
  signSymbol = '';
  planetary: Transit[] = [];
  aspects: Aspect[] = [];

  isLoading = false;
  errorMessage = '';

  constructor(private route: ActivatedRoute, private apiService: ApiService) {}

  ngOnInit() {
    this.route.params.subscribe(params => {
      // Route is /horoscope/:type/:sign. Prokerala only publishes a daily horoscope, so
      // :type is not used to pick an endpoint.
      this.selectedSign = params['sign'] || this.selectedSign;
      this.loadHoroscope(this.selectedSign);
      this.getZodiacSigns();
    });
  }

  /**
   * Transits are the same for every sign, so they only depend on the date.
   *
   * `when` must be the datetime the horoscope response reports, not "now": the prediction
   * text names the aspects in force on its own date, and computing positions for a different
   * date would put the transit table and the aspects panel at odds with the prose above them.
   */
  private async loadTransits(when: Date) {
    try {
      const response = await this.apiService.getPlanetPositions(when);
      const positions = response?.data?.planet_position || [];

      this.planetary = positions.map((p: any) => ({
        planet: p.name,
        zodiac: p.rasi?.name || '-',
        house: p.position ?? '-',
        status: p.is_retrograde ? 'Retrograde' : 'Direct'
      }));

      this.aspects = this.computeAspects(positions);
    } catch {
      // The transit table is supplementary; a failure here shouldn't blank the prediction.
      this.planetary = [];
      this.aspects = [];
    }
  }

  /**
   * Derives the major aspects from the planets' actual ecliptic longitudes. The API has no
   * aspects endpoint, but an aspect is purely the angular separation between two bodies, so
   * it can be computed exactly from the positions rather than invented.
   *
   * Rahu, Ketu and the Ascendant are excluded — they are points, not planets, and aspecting
   * them is not meaningful in a general transit summary.
   */
  private computeAspects(positions: any[]): Aspect[] {
    // Orbs follow classical practice: the major aspects (conjunction, opposition) are allowed
    // a wider margin than the minor ones. A flat orb is too tight for the majors — it drops
    // real aspects such as a 173° Mercury-Jupiter opposition.
    const definitions: { type: string; angle: number; orb: number; tone: Aspect['tone'] }[] = [
      { type: 'Conjunction', angle: 0, orb: 8, tone: 'neutral' },
      { type: 'Opposition', angle: 180, orb: 8, tone: 'tense' },
      { type: 'Trine', angle: 120, orb: 7, tone: 'harmonious' },
      { type: 'Square', angle: 90, orb: 7, tone: 'tense' },
      { type: 'Sextile', angle: 60, orb: 5, tone: 'harmonious' }
    ];

    const excluded = new Set(['Rahu', 'Ketu', 'Ascendant']);
    const planets = positions.filter(p => !excluded.has(p.name) && typeof p.longitude === 'number');
    const found: Aspect[] = [];

    for (let i = 0; i < planets.length; i++) {
      for (let j = i + 1; j < planets.length; j++) {
        let separation = Math.abs(planets[i].longitude - planets[j].longitude) % 360;
        if (separation > 180) {
          separation = 360 - separation;
        }

        for (const def of definitions) {
          if (Math.abs(separation - def.angle) <= def.orb) {
            found.push({
              from: planets[i].name,
              to: planets[j].name,
              type: def.type,
              tone: def.tone
            });
            break;
          }
        }
      }
    }

    return found;
  }

  getZodiacSigns() {
    this.apiService.getZodiacSigns().subscribe({
      next: (res) => {
        this.zodiacList = res.data;
      }
    });
  }

  selectSign(sign: string) {
    this.selectedSign = sign;
    this.loadHoroscope(sign);
  }

  changeTab(tab: string) {
    this.activeTab = tab;
  }

  /** The prediction for the tab currently in view. */
  get current(): Prediction | null {
    return this.horoscopeData[this.activeTab] || null;
  }

  private async loadHoroscope(sign: string) {
    this.isLoading = true;
    this.errorMessage = '';
    this.horoscopeData = {};

    try {
      const response = await this.apiService.getDailyHoroscope(sign, this.today);
      const entry = response?.data?.daily_predictions?.[0];

      if (!entry) {
        throw new Error('No prediction was returned for this sign.');
      }

      // Chart the sky for the date the prediction is actually about, which is not necessarily
      // today: the response reports its own datetime, and the prose describes that day's
      // aspects. Fall back to today only if the field is missing.
      const predictionDate = response?.data?.datetime ? new Date(response.data.datetime) : this.today;
      this.loadTransits(predictionDate);

      for (const p of entry.predictions || []) {
        // The API labels types "General", "Health", "Career", "Love"; the tabs are lowercase.
        this.horoscopeData[String(p.type || '').toLowerCase()] = {
          prediction: this.decodeEntities(p.prediction),
          seek: this.decodeEntities(p.seek),
          challenge: this.decodeEntities(p.challenge),
          insight: this.decodeEntities(p.insight)
        };
      }

      const info = entry.sign_info || {};
      this.traits = {
        // Prokerala's field names don't match their astrological meaning: `modality` carries
        // the polarity, `triplicity` the element, and `quadruplicity` the modality.
        polarity: info.modality || '',
        element: info.triplicity || '',
        modality: info.quadruplicity || '',
        ruler: entry.sign?.lord?.name || ''
      };
      this.signSymbol = info.unicode_symbol || '';
    } catch (error: any) {
      this.errorMessage = error?.error?.message || error?.message || 'Unable to load the horoscope right now.';
    } finally {
      this.isLoading = false;
    }
  }

  /** Predictions arrive HTML-escaped ("Mercury&#039;s"), so unescape before display. */
  private decodeEntities(value: string): string {
    if (!value) { return ''; }
    const el = document.createElement('textarea');
    el.innerHTML = value;
    return el.value;
  }
}
