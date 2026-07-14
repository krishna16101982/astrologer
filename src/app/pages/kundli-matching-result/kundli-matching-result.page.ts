import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import {
  IonContent,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonButtons,
  IonBackButton,
  IonFooter,
  AlertController
} from '@ionic/angular/standalone';
import { FooterPage } from 'src/app/include/footer/footer.page';
import { KundliMatchStore, MatchPerson } from 'src/app/services/kundli-store';
import { exportElementToPdf, toFilenameSlug } from 'src/app/services/pdf-export';

interface KootaTile {
  name: string;
  boy: string;
  girl: string;
  points: number;
  maximum: number;
  /** Fill ratio for the tile meter, 0-100. */
  percentage: number;
  /** Drives the badge colour: full = green, partial = amber, zero = red. */
  tone: 'full' | 'partial' | 'zero';
  description: string;
}

interface PersonChart {
  nakshatra: string;
  nakshatraPada: string | number;
  nakshatraLord: string;
  rasi: string;
  rasiLord: string;
  manglik: boolean;
  manglikLabel: string;
  manglikDescription: string;
}

@Component({
  selector: 'app-kundli-matching-result',
  templateUrl: './kundli-matching-result.page.html',
  styleUrls: ['./kundli-matching-result.page.scss'],
  standalone: true,
  imports: [
    IonContent, IonHeader, IonToolbar, IonTitle, IonButtons, IonBackButton,
    IonFooter, CommonModule, RouterLink, FooterPage
  ]
})
export class KundliMatchingResultPage implements OnInit {

  @ViewChild('pdfArea', { static: false }) pdfArea!: ElementRef<HTMLElement>;

  boy: MatchPerson | null = null;
  girl: MatchPerson | null = null;
  view: any = null;
  isDownloading = false;

  constructor(
    private store: KundliMatchStore,
    private router: Router,
    private alertController: AlertController
  ) {}

  ngOnInit() {
    const record = this.store.get();

    if (!record?.raw) {
      this.router.navigate(['/kundli-matching'], { replaceUrl: true });
      return;
    }

    this.boy = record.boy;
    this.girl = record.girl;
    this.view = this.normalize(record.raw);
  }

  /**
   * The eight Ashtakoota gunas in their fixed order, keyed by the `id` the API returns.
   * On the sandbox plan every string field comes back as an empty object, so the koota
   * names have to be supplied locally; on a live plan the API's own name wins.
   */
  private static readonly GUNA_NAMES: Record<number, string> = {
    1: 'Varna',
    2: 'Vasya',
    3: 'Tara',
    4: 'Yoni',
    5: 'Graha Maitri',
    6: 'Gana',
    7: 'Bhakoot',
    8: 'Nadi'
  };

  private normalize(raw: any): any {
    const d = raw?.data ?? raw ?? {};
    const gunaMilan = d.guna_milan ?? {};

    const totalPoints = Number(gunaMilan.total_points ?? d.total_points ?? 0);
    const maximumPoints = Number(gunaMilan.maximum_points ?? d.maximum_points ?? 36) || 36;

    return {
      totalPoints,
      maximumPoints,
      percentage: Math.round((totalPoints / maximumPoints) * 100),
      analysis: this.toText(d.message) || this.describeScore(d.message?.type, totalPoints, maximumPoints),
      boyChart: this.toPersonChart(d.boy_info, d.boy_mangal_dosha_details),
      girlChart: this.toPersonChart(d.girl_info, d.girl_mangal_dosha_details),
      kootas: this.toKootaTiles(gunaMilan),
      notes: this.toNotes(d)
    };
  }

  /**
   * The API only sends prose on a live plan; `message.description` is empty on sandbox.
   * Fall back to its `type` verdict plus the score so the panel is never blank.
   */
  private describeScore(type: string | undefined, points: number, maximum: number): string {
    const ratio = maximum ? points / maximum : 0;

    let verdict: string;
    if (ratio >= 32 / 36) { verdict = 'an excellent match'; }
    else if (ratio >= 25 / 36) { verdict = 'a very good match'; }
    else if (ratio >= 18 / 36) { verdict = 'an acceptable match'; }
    else { verdict = 'a weak match by the traditional threshold'; }

    const tone = String(type || '').toLowerCase() === 'good' ? 'favourable' : 'unfavourable';
    return `Guna Milan scores ${points} of ${maximum} points, considered ${verdict}. `
      + `The overall reading is ${tone}. A full consultation also weighs the ascendant, `
      + `planetary periods, and any dosha cancellations.`;
  }

  /**
   * Prokerala nests nakshatra/rasi under boy_info & girl_info, each as an object with a
   * `name` and a `lord` object. Some payloads flatten these to plain strings, so read
   * through `pick` rather than assuming either shape.
   */
  private toPersonChart(info: any, mangalDosha: any): PersonChart {
    const dosha = mangalDosha ?? info?.mangal_dosha ?? {};
    const hasDosha = !!dosha.has_dosha;

    const rasi = info?.rasi ?? info?.chandra_rasi;

    return {
      nakshatra: this.pick(info?.nakshatra),
      nakshatraPada: info?.nakshatra?.pada ?? '',
      nakshatraLord: this.lordLabel(info?.nakshatra?.lord),
      rasi: this.pick(rasi),
      rasiLord: this.lordLabel(rasi?.lord),
      manglik: hasDosha,
      manglikLabel: hasDosha ? this.manglikStrength(dosha) : 'Not Manglik',
      manglikDescription: this.toText(dosha.description)
    };
  }

  /** Renders a planetary lord as "Guru (Jupiter)", collapsing to one name when they match. */
  private lordLabel(lord: any): string {
    if (!lord) { return ''; }
    if (typeof lord === 'string') { return lord; }

    const vedic = (lord.vedic_name || '').trim();
    const western = (lord.name || '').trim();

    if (vedic && western && vedic !== western) { return `${vedic} (${western})`; }
    return vedic || western;
  }

  private manglikStrength(dosha: any): string {
    const type = String(this.pick(dosha.dosha_type) || dosha.type || '').toLowerCase();
    if (type.includes('high') || type.includes('strong')) { return 'Manglik (Strong)'; }
    if (type.includes('low') || type.includes('mild')) { return 'Manglik (Mild)'; }
    return 'Manglik';
  }

  private toKootaTiles(gunaMilan: any): KootaTile[] {
    const source: any[] = Array.isArray(gunaMilan.guna) ? gunaMilan.guna : [];

    return source.map((g, index) => {
      // Points can be fractional (Tara commonly scores 1.5).
      const points = Number(g?.obtained_points ?? g?.points ?? 0);
      const maximum = Number(g?.maximum_points ?? 0);
      const percentage = maximum ? Math.round((points / maximum) * 100) : 0;
      const id = Number(g?.id ?? index + 1);

      return {
        name: this.humanize(this.pick(g?.name)) || KundliMatchingResultPage.GUNA_NAMES[id] || `Koota ${id}`,
        boy: this.pick(g?.boy_koot) || '—',
        girl: this.pick(g?.girl_koot) || '—',
        points,
        maximum,
        percentage,
        tone: points === 0 ? 'zero' : points >= maximum ? 'full' : 'partial',
        description: this.toText(g?.description)
      } as KootaTile;
    });
  }

  /** Dosha-cancellation exceptions. Empty on sandbox, where the API blanks all prose. */
  private toNotes(d: any): string[] {
    const exceptions = Array.isArray(d.exceptions) ? d.exceptions : [];

    return exceptions
      .map((item: any) => this.toText(item))
      .filter((text: string) => !!text);
  }

  /** Reads a field that may be a plain string or an object carrying a `name`. */
  private pick(value: any): string {
    if (!value) { return ''; }
    if (typeof value === 'string') { return value; }
    return value.name || value.vedic_name || '';
  }

  /**
   * Flattens a value of unknown shape into display text. Prokerala wraps prose
   * inconsistently — sometimes a string, sometimes { description }, sometimes an array of
   * such objects — and interpolating an object straight into the template renders the
   * literal "[object Object]". Descend through the usual text-bearing keys instead.
   */
  private toText(value: any): string {
    if (value === null || value === undefined) { return ''; }
    if (typeof value === 'string') { return value.trim(); }
    if (typeof value === 'number' || typeof value === 'boolean') { return String(value); }

    if (Array.isArray(value)) {
      return value.map(item => this.toText(item)).filter(Boolean).join(' ');
    }

    if (typeof value === 'object') {
      for (const key of ['description', 'text', 'message', 'value', 'name']) {
        if (value[key] !== undefined) {
          const text = this.toText(value[key]);
          if (text) { return text; }
        }
      }

      // Nothing recognisable: fall back to any string leaves so the panel shows something
      // readable rather than "[object Object]".
      return Object.values(value)
        .filter(v => typeof v === 'string')
        .join(' ')
        .trim();
    }

    return '';
  }

  private humanize(value: string): string {
    return String(value || '')
      .replace(/[_-]+/g, ' ')
      .replace(/\b\w/g, c => c.toUpperCase())
      .trim();
  }

  async downloadPdf() {
    if (this.isDownloading || !this.pdfArea) {
      return;
    }

    this.isDownloading = true;

    try {
      const pair = `${toFilenameSlug(this.boy?.name || '', 'boy')}-${toFilenameSlug(this.girl?.name || '', 'girl')}`;
      await exportElementToPdf(this.pdfArea.nativeElement, `kundli-matching-${pair}.pdf`);
    } catch (error: any) {
      await this.showAlert('PDF Error', error?.message || 'Failed to generate the PDF.');
    } finally {
      this.isDownloading = false;
    }
  }

  private async showAlert(header: string, message: string) {
    const alert = await this.alertController.create({ header, message, buttons: ['OK'] });
    await alert.present();
  }
}
