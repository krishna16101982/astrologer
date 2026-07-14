// This file can be replaced during build by using the `fileReplacements` array.
// `ng build` replaces `environment.ts` with `environment.prod.ts`.
// The list of file replacements can be found in `angular.json`.

export const environment = {
  production: false,
  // Browser builds go through the ng-serve proxy (proxy.conf.json): Prokerala sends no CORS
  // headers, so the browser cannot call it directly. On device there is no proxy — the app is
  // served from https://localhost — so the native code path below is used instead.
  prokeralaBaseUrl: '/api/prokerala',
  prokeralaTokenUrl: '/api/prokerala/token',
  // Used only on native (Capacitor), where requests bypass the WebView and CORS does not apply.
  prokeralaDirectBaseUrl: 'https://api.prokerala.com',
  prokeralaDirectTokenUrl: 'https://api.prokerala.com/token',
  prokeralaClientId: '9be33a2a-9bb7-4124-a0ba-7ed1a65b5b7f',
  prokeralaClientSecret: 'jp2R04PFw7ol9ZhipcURbMpKLLthpMkCszUEqHea',
  // The Prokerala sandbox plan only accepts January 1st dates and rejects anything else with
  // a 400. Set to false once the account is upgraded so live calls use the real date.
  prokeralaSandbox: true
};

/*
 * For easier debugging in development mode, you can import the following file
 * to ignore zone related error stack frames such as `zone.run`, `zoneDelegate.invokeTask`.
 *
 * This import should be commented out in production mode because it will have a negative impact
 * on performance if an error is thrown.
 */
// import 'zone.js/plugins/zone-error';  // Included with Angular CLI.
