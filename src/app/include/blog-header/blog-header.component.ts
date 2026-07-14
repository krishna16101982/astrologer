import { Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-blog-header',
  templateUrl: './blog-header.component.html',
  styleUrls: ['./blog-header.component.scss'],
  standalone: true,
  imports: [CommonModule, RouterModule],
})
export class BlogHeaderComponent implements OnInit {
  @Input() title: string = 'Latest Astrology Blogs';
  @Input() breadcrumb: string = 'Home / Blogs';
  @Input() headerImage: string = 'assets/images/homeSlider.jpg';

  constructor() {}

  ngOnInit() {}
}
