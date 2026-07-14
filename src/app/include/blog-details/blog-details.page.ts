import { Component, CUSTOM_ELEMENTS_SCHEMA, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonContent, IonHeader, IonToolbar, IonTitle, IonButtons, IonBackButton, IonButton, IonFooter } from '@ionic/angular/standalone';
import { ApiService } from 'src/app/services/api-service';
import { ActivatedRoute, Router } from '@angular/router';
import { FooterPage } from 'src/app/include/footer/footer.page';

@Component({
  selector: 'app-blog-details',
  templateUrl: './blog-details.page.html',
  styleUrls: ['./blog-details.page.scss'],
  standalone: true,
  imports: [IonContent, IonHeader, IonToolbar, IonTitle, IonButtons, IonBackButton, IonButton, IonFooter, CommonModule, FormsModule, FooterPage],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class BlogDetailsPage implements OnInit {

  blogs: any[] = [];
  allBlogs: any[] = [];
  selectedBlog: any = null;
  searchTerm: string = '';
  categories: any[] = [];
  activeCategory: string = '';
  newsletter = { email: '' };

  constructor(
    private apiService: ApiService,
    private route: ActivatedRoute,
    private router: Router
  ) {}

  ngOnInit() {
    this.route.params.subscribe(params => {
      if (params['slug']) {
        this.fetchBlogDetail(params['slug']);
        this.fetchBlogs(); // also load sidebar data
      } else {
        this.fetchBlogs();
      }
    });
  }

  // ===== FETCH BLOG LIST =====
  fetchBlogs() {
    this.apiService.getBlogs().subscribe({
      next: (res) => {
        this.allBlogs = res.data?.data || [];
        this.blogs = [...this.allBlogs];
        // Extract UNIQUE categories
        const categoryMap = new Map<string, any>();
        this.allBlogs.forEach(blog => {
          if (blog.category?.slug) {
            categoryMap.set(blog.category.slug, blog.category);
          }
        });
        this.categories = Array.from(categoryMap.values());
      },
      error: (err) => console.error('Error fetching blogs', err)
    });
  }

  // ===== FETCH BLOG DETAIL =====
  fetchBlogDetail(slug: string) {
    this.apiService.getBlogDetail(slug).subscribe({
      next: (res) => {
        this.selectedBlog = res.data;
      },
      error: (err) => console.error('Error fetching blog detail', err)
    });
  }

  // ===== NAVIGATE =====
  selectBlog(blog: any) {
    this.router.navigate(['/blog-details', blog.slug]);
  }

  goBack() {
    this.selectedBlog = null;
    this.router.navigate(['/blog-details']);
  }

  // ===== SEARCH =====
  searchBlogs() {
    const term = this.searchTerm.toLowerCase();
    if (!term) {
      this.blogs = [...this.allBlogs];
      return;
    }
    this.blogs = this.allBlogs.filter(blog =>
      blog.title.toLowerCase().includes(term) ||
      blog.content?.toLowerCase().includes(term)
    );
  }

  // ===== FILTER CATEGORY =====
  filterByCategory(slug: string) {
    this.activeCategory = slug;
    this.blogs = this.allBlogs.filter(b => b.category?.slug === slug);
  }

  // ===== COUNT =====
  getCategoryCount(slug: string): number {
    return this.allBlogs.filter(b => b.category?.slug === slug).length;
  }

  // ===== RECENT =====
  getRecentPosts(limit = 5) {
    return this.allBlogs.slice(0, limit);
  }

  // ===== NEWSLETTER =====
  subscribeNewsletter() {
    if (!this.newsletter.email) return;
    console.log('Subscribed:', this.newsletter.email);
    this.newsletter.email = '';
  }
  
  stripHtml(html: string): string {
  if (!html) return '';
  return html.replace(/<[^>]+>/g, '');
}
}