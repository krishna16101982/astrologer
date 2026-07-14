import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'login',
    pathMatch: 'full',
  },
  {
    path: 'login',
    loadComponent: () => import('./auth/login/login.page').then(m => m.LoginPage),
  },
  {
    path: 'register',
    loadComponent: () => import('./auth/register/register.page').then(m => m.RegisterPage),
  },
  {
    path: 'home',
    loadComponent: () => import('./home/home.page').then((m) => m.HomePage),
  },
  {
    path: 'homeslider',
    loadComponent: () => import('./include/homeslider/homeslider.page').then(m => m.HomesliderPage)
  },
  {
    path: 'fouroption',
    loadComponent: () => import('./include/fouroption/fouroption.page').then(m => m.FouroptionPage)
  },
  {
    path: 'topastrologers',
    loadComponent: () => import('./include/topastrologers/topastrologers.page').then(m => m.TopastrologersPage)
  },
  {
    path: 'all-astrologers',
    loadComponent: () => import('./pages/all-astrologers/all-astrologers.page').then(m => m.AllAstrologersPage)
  },
  {
    path: 'kundli',
    loadComponent: () => import('./pages/kundli/kundli.page').then(m => m.KundliPage)
  },
  {
    path: 'kundli-result',
    loadComponent: () => import('./pages/kundli-result/kundli-result.page').then(m => m.KundliResultPage)
  },
  {
    path: 'kundli-matching',
    loadComponent: () => import('./pages/kundli-matching/kundli-matching.page').then(m => m.KundliMatchingPage)
  },
  {
    path: 'kundli-matching-result',
    loadComponent: () => import('./pages/kundli-matching-result/kundli-matching-result.page').then(m => m.KundliMatchingResultPage)
  },
  {
    path: 'astrology-predictions',
    loadComponent: () => import('./include/astrology-predictions/astrology-predictions.page').then(m => m.AstrologyPredictionsPage)
  },
  {
    path: 'news',
    loadComponent: () => import('./include/news/news.page').then(m => m.NewsPage)
  },
  {
    path: 'totalcount',
    loadComponent: () => import('./include/totalcount/totalcount.page').then(m => m.TotalcountPage)
  },
  {
    path: 'footer',
    loadComponent: () => import('./include/footer/footer.page').then(m => m.FooterPage)
  },
  {
    path: 'astroprofile/:id',
    loadComponent: () => import('./pages/astroprofile/astroprofile.page').then(m => m.AstroprofilePage)
  },
  {
    path: 'blog',
    loadComponent: () => import('./include/blog/blog.page').then(m => m.BlogPage)
  },
  {
    path: 'blog-details',
    loadComponent: () => import('./include/blog-details/blog-details.page').then(m => m.BlogDetailsPage)
  },
  {
    path: 'blog-details/:slug',
    loadComponent: () => import('./include/blog-details/blog-details.page').then(m => m.BlogDetailsPage)
  },
  {
    path: 'horoscope/:type/:sign',
    loadComponent: () => import('./include/horoscope/horoscope.page').then(m => m.HoroscopePage)
  },
  {
    path: 'chat-room/:sid',
    loadComponent: () => import('./pages/chat-room/chat-room.page').then(m => m.ChatRoomPage)
  },
  {
    path: 'chat-room',
    loadComponent: () => import('./pages/chat-room/chat-room.page').then(m => m.ChatRoomPage)
  },
  {
    path: 'user/dashboard',
    loadComponent: () => import('./include/user-dashboard/user-dashboard.page').then(m => m.UserDashboardPage)
  },
  {
    path: 'wallet',
    loadComponent: () => import('./include/add-wallet/add-wallet.page').then(m => m.AddWalletPage)
  },
  {
    path: 'voice-call',
    loadComponent: () => import('./pages/voice-call/voice-call.page').then(m => m.VoiceCallPage)
  },
  {
    path: 'chat-history',
    loadComponent: () => import('./pages/chat-history/chat-history.page').then(m => m.ChatHistoryPage)
  }
];
