export const environment = {
  production: true,
  // Kept for a hosted web build sitting behind the same proxy path.
  prokeralaBaseUrl: '/api/prokerala',
  prokeralaTokenUrl: '/api/prokerala/token',
  // Used on native (Capacitor). The APK has no dev-server proxy, so a relative path would
  // resolve to https://localhost/api/prokerala/... and the WebView would return index.html —
  // which is what produced "Http failure during parsing".
  prokeralaDirectBaseUrl: 'https://api.prokerala.com',
  prokeralaDirectTokenUrl: 'https://api.prokerala.com/token',
  prokeralaClientId: '9be33a2a-9bb7-4124-a0ba-7ed1a65b5b7f',
  prokeralaClientSecret: 'jp2R04PFw7ol9ZhipcURbMpKLLthpMkCszUEqHea',
  // The Prokerala sandbox plan only accepts January 1st dates and rejects anything else with
  // a 400. Set to false once the account is upgraded so live calls use the real date.
  prokeralaSandbox: true
};
