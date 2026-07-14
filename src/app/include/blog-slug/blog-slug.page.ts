import { Component, CUSTOM_ELEMENTS_SCHEMA, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonContent, IonHeader, IonTitle, IonToolbar, IonButtons, IonBackButton } from '@ionic/angular/standalone';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { ApiService } from 'src/app/services/api-service';
import { BlogHeaderComponent } from '../blog-header/blog-header.component';

@Component({
  selector: 'app-blog-slug',
  templateUrl: './blog-slug.page.html',
  styleUrls: ['./blog-slug.page.scss'],
  standalone: true,
  imports: [
    IonContent,
    IonHeader,
    IonTitle,
    IonToolbar,
    IonButtons,
    IonBackButton,
    CommonModule,
    FormsModule,
    RouterModule,
    BlogHeaderComponent,
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class BlogSlugPage implements OnInit {
  blog: any = null;
  allBlogs: any[] = [];
  relatedBlogs: any[] = [];
  categories: any[] = [];
  searchTerm: string = '';
  slug: string = '';
  loading: boolean = true;
  newsletter: { email: string } = { email: '' };

  constructor(
    private route: ActivatedRoute,
    private apiService: ApiService
  ) {}

  ngOnInit() {
    this.route.params.subscribe((params) => {
      this.slug = params['slug'];
      this.fetchBlogBySlug(this.slug);
    });
  }

  fetchBlogBySlug(slug: string) {
    this.apiService.getBlogs().subscribe({
      next: (res) => {
        this.allBlogs = res.data?.data || [];

        // Find blog by slug
        this.blog = this.allBlogs.find((b) => this.generateSlug(b.title) === slug);

        if (this.blog) {
          // Get related blogs (same category)
          this.relatedBlogs = this.allBlogs
            .filter((b) => b.category === this.blog.category && b.id !== this.blog.id)
            .slice(0, 5);

          // Get unique categories
          const categorySet = new Set<string>();
          this.allBlogs.forEach((blog) => {
            if (blog.category) {
              categorySet.add(blog.category);
            }
          });
          this.categories = Array.from(categorySet);
        }

        this.loading = false;
      },
      error: (err) => {
        console.error('Failed to fetch blog:', err);
        this.loading = false;
      },
    });
  }

  generateSlug(title: string): string {
    if (!title) return '';
    return title
      .toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();
  }

  getCategoryCount(category: string): number {
    return this.allBlogs.filter((blog) => blog.category === category).length;
  }

  searchBlogs() {
    // Can implement search functionality here
  }

  filterByCategory(category: string) {
    // Can implement category filter here
  }

  subscribeNewsletter() {
    if (this.newsletter.email) {
      console.log('Subscribed:', this.newsletter.email);
      this.newsletter.email = '';
      // Add API call here
    }
  }

  goToBlog(blog: any) {
    const slug = this.generateSlug(blog.title);
    window.location.href = `/blog/${slug}`;
  }
}
