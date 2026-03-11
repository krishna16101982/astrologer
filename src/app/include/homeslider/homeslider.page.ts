import { Component, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { IonicModule } from '@ionic/angular';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-homeslider',
  templateUrl: './homeslider.page.html',
  styleUrls: ['./homeslider.page.scss'],
  standalone: true,
  
  imports: [IonicModule, CommonModule],
    schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class HomesliderPage {} 
