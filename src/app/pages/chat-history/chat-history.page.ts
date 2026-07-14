import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  IonContent,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonButtons,
  IonBackButton,
  IonSpinner,
  IonIcon,
  IonFooter
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { chatbubbleOutline } from 'ionicons/icons';
import { ApiService } from 'src/app/services/api-service';
import { FooterPage } from 'src/app/include/footer/footer.page';

@Component({
  selector: 'app-chat-history',
  templateUrl: './chat-history.page.html',
  styleUrls: ['./chat-history.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    IonContent,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonButtons,
    IonBackButton,
    IonSpinner,
    IonIcon,
    IonFooter,
    FooterPage
  ]
})
export class ChatHistoryPage implements OnInit {

  sessions: any[] = [];
  loading = false;

  constructor(private apiService: ApiService) {
    addIcons({ chatbubbleOutline });
  }

  ngOnInit() {
    this.loadHistory();
  }

  loadHistory() {
    this.loading = true;
    this.apiService.getWalletTransactions().subscribe({
      next: (res: any) => {
        this.loading = false;
        const all: any[] = res?.data?.transactions?.data || res?.data?.data || res?.data || [];
        this.sessions = all.filter((t: any) => t.type === 'debit');
      },
      error: () => {
        this.loading = false;
        this.sessions = [];
      }
    });
  }
}
