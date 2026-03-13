import { Routes } from '@angular/router';

export const routes: Routes = [
   {
    path: 'login',
    loadComponent: () => import('./auth/login/login.page').then( m => m.LoginPage)
  },
   {
    path: '',
    redirectTo: 'login',
    pathMatch: 'full',
  },
  {
    path: 'home',
    loadComponent: () => import('./home/home.page').then((m) => m.HomePage),
  },
  {
    path: 'homeslider',
    loadComponent: () => import('./include/homeslider/homeslider.page').then( m => m.HomesliderPage)
  },
  {
    path: 'fouroption',
    loadComponent: () => import('./include/fouroption/fouroption.page').then( m => m.FouroptionPage)
  },
 
 {
    path: '',
    redirectTo: 'home',
    pathMatch: 'full',
  },
  {
    path: 'topastrologers',
    loadComponent: () => import('./include/topastrologers/topastrologers.page').then( m => m.TopastrologersPage)
  },
  {
    path: 'astrology-predictions',
    loadComponent: () => import('./include/astrology-predictions/astrology-predictions.page').then( m => m.AstrologyPredictionsPage)
  },
  {
    path: 'news',
    loadComponent: () => import('./include/news/news.page').then( m => m.NewsPage)
  },
  {
    path: 'totalcount',
    loadComponent: () => import('./include/totalcount/totalcount.page').then( m => m.TotalcountPage)
  },
  {
    path: 'footer',
    loadComponent: () => import('./include/footer/footer.page').then( m => m.FooterPage)
  },
  {
    path: 'astroprofile/:id',
    loadComponent: () => import('./pages/astroprofile/astroprofile.page').then( m => m.AstroprofilePage)
  }
];
