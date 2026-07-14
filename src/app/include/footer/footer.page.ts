import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonContent, IonHeader, IonTitle, IonToolbar, IonMenuToggle, IonCol, IonGrid, IonRow, IonItem } from '@ionic/angular/standalone';
import { MenuController } from '@ionic/angular'; // 1. Import the controller
import { RouterLink } from '@angular/router';
@Component({
  selector: 'app-footer',
  templateUrl: './footer.page.html',
  styleUrls: ['./footer.page.scss'],
  standalone: true,
  imports: [IonContent, IonHeader, IonTitle,IonMenuToggle, IonToolbar, CommonModule, FormsModule, IonCol, IonGrid, IonRow, IonItem, RouterLink]
})
export class FooterPage implements OnInit {

 // 2. Inject it into the constructor
  constructor(private menu: MenuController) {}

  // 3. Create the function to open the menu
  openSideMenu() {
    this.menu.open('first'); // 'first' is the menu-id (optional if you only have one)
  }

  ngOnInit() {
  }

}
