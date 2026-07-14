import { Component, CUSTOM_ELEMENTS_SCHEMA, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonContent, IonHeader, IonTitle, IonToolbar } from '@ionic/angular/standalone';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ApiService } from 'src/app/services/api-service';
import { IonicModule } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { arrowForwardOutline } from 'ionicons/icons';


@Component({
  selector: 'app-blog',
  templateUrl: './blog.page.html',
  styleUrls: ['./blog.page.scss'],
  standalone: true,
  imports: [ IonTitle, IonToolbar, CommonModule, FormsModule,RouterLink],
    schemas: [CUSTOM_ELEMENTS_SCHEMA]

})
export class BlogPage implements OnInit {
 blog: any;
  relatedBlogs: any[] = [];

  constructor(
    private route: ActivatedRoute,
    private apiService: ApiService
  ) {
        addIcons({
      'arrow-forward-outline': arrowForwardOutline
    });
  }

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.getBlogDetail(id);
    }
    this.getRelatedBlogs();
  }

  getBlogDetail(id: any) {
    this.apiService.getBlogDetail(id).subscribe({
      next: (res) => {
        this.blog = res.data;
      },
      error: (err) => console.log(err)
    });
  }

  getRelatedBlogs() {
    this.apiService.getBlogs().subscribe({
      next: (res) => {
        this.relatedBlogs = res.data.data; // Assuming the API returns an array of blogs in res.data.data
      }
    });
  }

  openBlog(blog: any) {
    // navigate to same page with new ID
  }

}
