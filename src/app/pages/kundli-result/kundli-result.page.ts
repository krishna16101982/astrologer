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
import { KundliBirthDetails, KundliStore } from 'src/app/services/kundli-store';
import { exportElementToPdf, toFilenameSlug } from 'src/app/services/pdf-export';

interface YogaEntry {
  name: string;
  description: string;
}

@Component({
  selector: 'app-kundli-result',
  templateUrl: './kundli-result.page.html',
  styleUrls: ['./kundli-result.page.scss'],
  standalone: true,
  imports: [
    IonContent, IonHeader, IonToolbar, IonTitle, IonButtons, IonBackButton,
    IonFooter, CommonModule, RouterLink, FooterPage
  ]
})
export class KundliResultPage implements OnInit {

  @ViewChild('pdfArea', { static: false }) pdfArea!: ElementRef<HTMLElement>;

  birth: KundliBirthDetails | null = null;
  view: any = null;
  isDownloading = false;

  constructor(
    private store: KundliStore,
    private router: Router,
    private alertController: AlertController
  ) {}

  ngOnInit() {
    const record = this.store.get();

    if (!record?.raw) {
      this.router.navigate(['/kundli'], { replaceUrl: true });
      return;
    }

    this.birth = record.birth;
    this.view = this.normalize(record.raw);
  }

  /**
   * Prokerala v2 nests chandra_rasi / soorya_rasi / zodiac / additional_info inside
   * nakshatra_details. Older/flat payloads put them at the top level, so accept both
   * and hand the template a single flat shape.
   */
  private normalize(raw: any): any {
    const d = raw?.data ?? raw ?? {};
    const nd = d.nakshatra_details ?? {};
    const info = nd.additional_info ?? d.additional_info ?? {};

    const name = (v: any) => (typeof v === 'string' ? v : v?.name) || '';

    const yogaSource = Array.isArray(d.yoga_details) ? d.yoga_details : [];
    const yogas: YogaEntry[] = [];
    for (const group of yogaSource) {
      const list = Array.isArray(group?.yoga_list) ? group.yoga_list : [group];
      for (const y of list) {
        if (y?.name || y?.description) {
          yogas.push({ name: y.name || group?.name || '', description: y.description || '' });
        }
      }
    }

    return {
      nakshatra: name(nd.nakshatra ?? d.nakshatra),
      nakshatraPada: nd.nakshatra?.pada ?? d.nakshatra?.pada ?? '',
      nakshatraLord: name(nd.nakshatra?.lord ?? d.nakshatra?.lord),
      moonSign: name(nd.chandra_rasi ?? d.chandra_rasi),
      sunSign: name(nd.soorya_rasi ?? d.soorya_rasi),
      zodiac: name(nd.zodiac ?? d.zodiac),
      deity: info.deity || '',
      ganam: info.ganam || '',
      symbol: info.symbol || '',
      animalSign: info.animal_sign || d.animal_sign || '',
      nadi: info.nadi || d.nadi || '',
      color: info.color || d.color || '',
      bestDirection: info.best_direction || d.best_direction || '',
      birthStone: info.birth_stone || d.birth_stone || '',
      hasMangalDosha: !!d.mangal_dosha?.has_dosha,
      mangalDoshaDescription: d.mangal_dosha?.description || '',
      yogas
    };
  }

  async downloadPdf() {
    if (this.isDownloading || !this.pdfArea) {
      return;
    }

    this.isDownloading = true;

    try {
      const filename = `kundli-${toFilenameSlug(this.birth?.name || '', 'report')}.pdf`;
      await exportElementToPdf(this.pdfArea.nativeElement, filename);
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
