import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonContent, IonHeader, IonTitle, IonToolbar, IonCol, IonGrid, IonRow, IonItem } from '@ionic/angular/standalone';
import { ApiService } from 'src/app/services/api-service';

@Component({
  selector: 'app-totalcount',
  templateUrl: './totalcount.page.html',
  styleUrls: ['./totalcount.page.scss'],
  standalone: true,
  imports: [IonContent, IonHeader, IonTitle,IonCol, IonToolbar, CommonModule, FormsModule, IonGrid, IonRow, IonItem]
})
export class TotalcountPage implements OnInit {

  totalAstrologers = '50000+';
  yearsOfExcellence = '11+';
  happyCustomers = '500+';

  constructor(private apiService: ApiService) { }

  ngOnInit() {
    this.apiService.getStatistics().subscribe({
      next: (res: any) => {
        const d = res?.data || {};
        this.totalAstrologers = d.total_astrologers ?? this.totalAstrologers;
        this.yearsOfExcellence = d.years_of_excellence ?? this.yearsOfExcellence;
        this.happyCustomers = d.happy_customers ?? this.happyCustomers;
      },
      error: (err: any) => {
        console.log('Statistics error:', err);
      }
    });
  }

}
