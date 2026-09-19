import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Capacitor, CapacitorHttp } from '@capacitor/core';
import { Observable, firstValueFrom } from 'rxjs';
import { environment } from 'src/environments/environment';

@Injectable({
  providedIn: 'root'
})
export class ApiService {

  baseUrl = 'https://astroauraa.com/api';

  /**
   * Prokerala serves no CORS headers, so a WebView XHR to it is blocked. Two transports:
   *
   *  - Browser: relative paths through the ng-serve proxy (proxy.conf.json), which strips the
   *    cross-origin problem by making the request same-origin.
   *  - Native (APK): there is no proxy — the app is served from https://localhost, so a
   *    relative path resolves to https://localhost/api/prokerala/... and the WebView hands back
   *    index.html, which Angular then fails to parse as JSON. Instead we call Prokerala's real
   *    URL through CapacitorHttp, which issues the request from native code where CORS does not
   *    apply.
   *
   * CapacitorHttp is used explicitly here rather than via the global XHR patch in
   * capacitor.config, because that patch breaks FormData uploads (i.e. the profile image).
   */
  private readonly isNative = Capacitor.isNativePlatform();

  get prokeralaBaseUrl(): string {
    return this.isNative ? environment.prokeralaDirectBaseUrl : environment.prokeralaBaseUrl;
  }

  get prokeralaTokenUrl(): string {
    return this.isNative ? environment.prokeralaDirectTokenUrl : environment.prokeralaTokenUrl;
  }

  constructor(private http: HttpClient) { }

  /** GET a Prokerala endpoint over whichever transport this platform requires. */
  private async prokeralaGet(path: string, token: string, params: Record<string, string>): Promise<any> {
    const url = `${this.prokeralaBaseUrl}${path}`;

    if (this.isNative) {
      const response = await CapacitorHttp.get({
        url,
        headers: { Authorization: `Bearer ${token}` },
        params
      });

      if (response.status >= 400) {
        throw new Error(this.describeProkeralaError(response.data) || `Prokerala request failed (${response.status}).`);
      }

      return response.data;
    }

    return firstValueFrom(
      this.http.get(url, {
        headers: this.getProkeralaHeaders(token),
        params: new HttpParams({ fromObject: params })
      })
    );
  }

  /** Form-encoded POST from native code (used for the OAuth token call). */
  private async postFormNative(url: string, form: Record<string, string>): Promise<any> {
    const response = await CapacitorHttp.post({
      url,
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      data: new HttpParams({ fromObject: form }).toString()
    });

    if (response.status >= 400) {
      const body = response.data;
      throw new Error(
        body?.error_description || body?.error || this.describeProkeralaError(body) ||
        `Prokerala authentication failed (${response.status}).`
      );
    }

    return response.data;
  }

  /** Pulls a readable message out of a Prokerala error body. */
  private describeProkeralaError(body: any): string {
    const errors = body?.errors;
    if (Array.isArray(errors) && errors.length) {
      return errors.map((e: any) => e?.detail || e?.title).filter(Boolean).join(' ');
    }
    return body?.message || '';
  }

  // =========================
  // COMMON AUTH HEADERS
  // =========================
  private getAuthHeaders(): HttpHeaders {

    const token = localStorage.getItem('accessToken');

    return new HttpHeaders({
      Authorization: `Bearer ${token || ''}`,
      'Content-Type': 'application/json',
      // Without this, Laravel's auth middleware sees a non-JSON request and 302-redirects
      // to the HTML /login page instead of returning 401 JSON. The WebView follows the
      // redirect, Angular fails to parse the HTML, and the caller sees an opaque parse
      // error rather than an auth error — which is how an expired token ends up looking
      // like a silently stalled call.
      Accept: 'application/json'
    });
  }

  private getProkeralaHeaders(token: string): HttpHeaders {
    return new HttpHeaders({
      Authorization: `Bearer ${token}`
    });
  }

  private getProkeralaClientConfig(): { clientId: string; clientSecret: string } {
    const clientId = localStorage.getItem('prokeralaClientId')?.trim() || environment.prokeralaClientId?.trim() || '';
    const clientSecret = localStorage.getItem('prokeralaClientSecret')?.trim() || environment.prokeralaClientSecret?.trim() || '';

    return { clientId, clientSecret };
  }

  private getCachedProkeralaToken(): { token: string; expiresAt: number } | null {
    const token = localStorage.getItem('prokeralaAccessToken')?.trim();
    const expiresAtRaw = localStorage.getItem('prokeralaAccessTokenExpiresAt');
    const expiresAt = expiresAtRaw ? Number(expiresAtRaw) : NaN;

    if (!token || !expiresAt || Number.isNaN(expiresAt)) {
      return null;
    }

    return { token, expiresAt };
  }

  private isProkeralaTokenValid(): boolean {
    const cached = this.getCachedProkeralaToken();
    return !!cached && Date.now() < cached.expiresAt - 30000;
  }

  private cacheProkeralaToken(token: string, expiresIn: number): void {
    const expiresAt = Date.now() + expiresIn * 1000;
    localStorage.setItem('prokeralaAccessToken', token);
    localStorage.setItem('prokeralaAccessTokenExpiresAt', expiresAt.toString());
  }

  private clearProkeralaTokenCache(): void {
    localStorage.removeItem('prokeralaAccessToken');
    localStorage.removeItem('prokeralaAccessTokenExpiresAt');
  }

  private async getProkeralaToken(): Promise<string> {
    if (this.isProkeralaTokenValid()) {
      return this.getCachedProkeralaToken()!.token;
    }

    const { clientId, clientSecret } = this.getProkeralaClientConfig();

    if (!clientId || !clientSecret) {
      throw new Error('Prokerala client credentials are not configured. Set them in the environment file or local storage.');
    }

    const form: Record<string, string> = {
      grant_type: 'client_credentials',
      client_id: clientId,
      client_secret: clientSecret
    };

    try {
      const response = this.isNative
        ? await this.postFormNative(this.prokeralaTokenUrl, form)
        : await firstValueFrom(
            this.http.post<any>(
              this.prokeralaTokenUrl,
              new HttpParams({ fromObject: form }).toString(),
              {
                headers: new HttpHeaders({
                  'Content-Type': 'application/x-www-form-urlencoded'
                })
              }
            )
          );

      const accessToken = response?.access_token || response?.accessToken;
      const expiresIn = Number(response?.expires_in ?? response?.expiresIn ?? 3600);
      if (!accessToken) {
        throw new Error(response?.error_description || response?.error || 'Prokerala authentication did not return an access token.');
      }

      this.cacheProkeralaToken(accessToken, expiresIn);
      return accessToken;
    } catch (error: any) {
      this.clearProkeralaTokenCache();
      const message = error?.error?.error_description || error?.error?.message || error?.message || 'Unable to authenticate with Prokerala.';
      throw new Error(message);
    }
  }

  /**
   * Sandbox date handling for the chart endpoints (planet-position and friends), which reject
   * any datetime that isn't January 1st with a 400 (code 1004). Pin the month and day while
   * sandbox is on, keeping the year and time of day.
   *
   * This must NOT be applied to the horoscope endpoint: that one enforces the opposite rule —
   * its datetime has to fall within a day of now, so a pinned January date is rejected as out
   * of bounds. Clearing environment.prokeralaSandbox restores real dates everywhere.
   */
  private toChartDateTime(date: Date): string {
    if (!environment.prokeralaSandbox) {
      return this.toOffsetIso(date);
    }

    const pinned = new Date(date);
    pinned.setMonth(0, 1);
    // toOffsetIso, not toISOString: pinning to January 1st is pointless if converting to UTC
    // then shifts it back to December 31st — which is exactly what happens east of Greenwich
    // for any local time before the UTC offset (e.g. 00:14 IST).
    return this.toOffsetIso(pinned);
  }

  private buildDateTime(date: string, time: string): string {
    if (!date || !time) {
      return '';
    }

    return this.toOffsetIso(new Date(`${date}T${time}`));
  }

  /**
   * Formats a date as ISO 8601 keeping local wall-clock time and appending the UTC offset,
   * e.g. "2000-01-01T04:30:00+05:30".
   *
   * Deliberately NOT toISOString(): that converts to UTC, so on an IST device (+05:30) a birth
   * time before 05:30 rolls back onto the previous calendar day — 01/01/2000 04:30 becomes
   * 1999-12-31T23:00Z. The instant is the same either way and Prokerala's chart maths agree,
   * but the date the user chose is no longer the date being sent, which breaks the sandbox's
   * January-1st check and is simply wrong to show back to a user.
   */
  private toOffsetIso(date: Date): string {
    const pad = (n: number, width = 2) => String(Math.abs(n)).padStart(width, '0');

    // getTimezoneOffset() is minutes *behind* UTC, so the sign is inverted.
    const offsetMinutes = -date.getTimezoneOffset();
    const sign = offsetMinutes >= 0 ? '+' : '-';
    const offset = `${sign}${pad(Math.floor(Math.abs(offsetMinutes) / 60))}:${pad(Math.abs(offsetMinutes) % 60)}`;

    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
      + `T${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}${offset}`;
  }

  private mapAyanamsa(value: string): string {
    switch (value?.toLowerCase()) {
      case 'lahiri':
        return '1';
      case 'raman':
        return '2';
      case 'kp':
      case 'krishnamurti paddhati':
        return '3';
      default:
        return '1';
    }
  }

  async getCoordinatesForPlace(place: string): Promise<string> {
    if (!place?.trim()) {
      return '';
    }

    const normalized = place.trim();
    if (/^-?\d+(\.\d+)?\s*,\s*-?\d+(\.\d+)?$/.test(normalized)) {
      return normalized;
    }

    const params = new HttpParams().set('q', normalized);

    try {
      const response = await firstValueFrom(
        this.http.get<any>(
          `${this.baseUrl}/location/search`,
          {
            params,
            headers: new HttpHeaders({
              Accept: 'application/json'
            })
          }
        )
      );

      // Backend returns either an array of rows or an object { status, data: [...] }
      const results = Array.isArray(response) ? response : response?.data ?? [];
      const firstResult = Array.isArray(results) ? results[0] : undefined;
      if (!firstResult || firstResult.length < 8) {
        return '';
      }

      const latitude = firstResult[6];
      const longitude = firstResult[7];
      if (!latitude || !longitude) {
        return '';
      }

      return `${latitude},${longitude}`;
    } catch (error) {
      return '';
    }
  }

  async searchLocations(query: string): Promise<any[]> {
    if (!query?.trim()) {
      return [];
    }

    const params = new HttpParams().set('q', query.trim());

    try {
      const response = await firstValueFrom(
        this.http.get<any>(
          `${this.baseUrl}/location/search`,
          {
            params,
            headers: new HttpHeaders({
              Accept: 'application/json'
            })
          }
        )
      );

      const results = Array.isArray(response) ? response : response?.data ?? [];
      return Array.isArray(results) ? results : [];
    } catch (error) {
      return [];
    }
  }

  async generateKundli(payload: {
    name: string;
    gender: string;
    dob: string;
    tob: string;
    place: string;
    ayanamsa: string;
    language: string;
    chartType: string;
  }): Promise<any> {
    const token = await this.getProkeralaToken();
    const datetime = this.buildDateTime(payload.dob, payload.tob);
    const coordinates = await this.getCoordinatesForPlace(payload.place);

    if (!coordinates) {
      throw new Error('We could not resolve the birth location to coordinates. Please enter a more specific place name.');
    }

    return this.prokeralaGet('/v2/astrology/kundli', token, {
      ayanamsa: this.mapAyanamsa(payload.ayanamsa),
      datetime,
      coordinates
    });
  }

  async generateKundliMatching(payload: {
    boy: { place: string; dob: string; tob: string };
    girl: { place: string; dob: string; tob: string };
    ayanamsa: string;
  }): Promise<any> {
    const token = await this.getProkeralaToken();
    const boyCoordinates = await this.getCoordinatesForPlace(payload.boy.place);
    const girlCoordinates = await this.getCoordinatesForPlace(payload.girl.place);

    if (!boyCoordinates || !girlCoordinates) {
      throw new Error('We could not resolve both birth locations to coordinates. Please enter more specific place names.');
    }

    // The basic kundli-matching endpoint returns only the total score. The /advanced variant
    // is what carries the per-koota guna breakdown, both mangal dosha reports, and the
    // dosha exceptions the result page renders.
    return this.prokeralaGet('/v2/astrology/kundli-matching/advanced', token, {
      ayanamsa: this.mapAyanamsa(payload.ayanamsa),
      boy_coordinates: boyCoordinates,
      boy_dob: this.buildDateTime(payload.boy.dob, payload.boy.tob),
      girl_coordinates: girlCoordinates,
      girl_dob: this.buildDateTime(payload.girl.dob, payload.girl.tob)
    });
  }

  /**
   * Daily horoscope for a zodiac sign.
   *
   * The /advanced variant is what returns the per-category predictions (General, Health,
   * Career, Love) along with the seek/challenge/insight lines and the sign's traits; the
   * plain /daily endpoint returns a single blob of general text only.
   *
   * Prokerala offers no weekly or monthly horoscope endpoint — both 404 — so `daily` is
   * the only period available.
   */
  async getDailyHoroscope(sign: string, date: Date = new Date()): Promise<any> {
    const token = await this.getProkeralaToken();

    // Real date on purpose: this endpoint requires a datetime within a day of now, even on
    // sandbox (where it then returns January 1st content regardless).
    return this.prokeralaGet('/v2/horoscope/daily/advanced', token, {
      datetime: date.toISOString(),
      sign: (sign || '').toLowerCase(),
      type: 'all'
    });
  }

  /**
   * Current planetary positions, used for the transit table.
   *
   * Coordinates default to New Delhi: sidereal sign placements are effectively the same
   * worldwide on a given day, so a reference location is enough for a general transit list.
   */
  async getPlanetPositions(date: Date = new Date(), coordinates = '28.7041,77.1025'): Promise<any> {
    const token = await this.getProkeralaToken();

    return this.prokeralaGet('/v2/astrology/planet-position', token, {
      ayanamsa: '1',
      coordinates,
      datetime: this.toChartDateTime(date)
    });
  }

  // =========================
  // AUTH APIs
  // =========================

  login(data: any): Observable<any> {
    return this.http.post(`${this.baseUrl}/login`, data);
  }

  register(data: any): Observable<any> {
    return this.http.post(`${this.baseUrl}/register`, data);
  }

  logout(): Observable<any> {

    return this.http.post(
      `${this.baseUrl}/logout`,
      {},
      {
        headers: this.getAuthHeaders()
      }
    );
  }

  // =========================
  // USER PROFILE
  // =========================

  getWalletDetails(): Observable<any> {

    return this.http.get(
      `${this.baseUrl}/profile`,
      {
        headers: this.getAuthHeaders()
      }
    );
  }

  getWalletBalance(): Observable<any> {

    return this.http.get(
      `${this.baseUrl}/wallet/balance`,
      {
        headers: this.getAuthHeaders()
      }
    );
  }

  // =========================
  // ASTROLOGERS
  // =========================

  getAstrologersData(search: string = '', specialization: string = ''): Observable<any> {

    let params = new HttpParams();
    if (search) {
      params = params.set('search', search);
    }
    if (specialization) {
      params = params.set('specialization', specialization);
    }

    return this.http.get(
      `${this.baseUrl}/astrologers`,
      {
        headers: this.getAuthHeaders(),
        params
      }
    );
  }

  getAstrologerProfile(id: any): Observable<any> {

    return this.http.get(
      `${this.baseUrl}/astrologers/${id}`,
      {
        headers: this.getAuthHeaders()
      }
    );
  }

  // =========================
  // STATISTICS (public)
  // =========================

  getStatistics(): Observable<any> {
    return this.http.get(`${this.baseUrl}/statistics`);
  }

  // =========================
  // SLIDERS
  // =========================

  getSliders(): Observable<any> {

    return this.http.get(
      `${this.baseUrl}/sliders`,
      {
        headers: this.getAuthHeaders()
      }
    );
  }

  // =========================
  // BLOGS
  // =========================

  getBlogs(): Observable<any> {

    return this.http.get(
      `${this.baseUrl}/blogs`,
      {
        headers: this.getAuthHeaders()
      }
    );
  }

  getBlogDetail(slug: any): Observable<any> {

    return this.http.get(
      `${this.baseUrl}/blogs/${slug}`,
      {
        headers: this.getAuthHeaders()
      }
    );
  }

  // =========================
  // ZODIAC
  // =========================

  getZodiacSigns(): Observable<any> {

    return this.http.get(
      `${this.baseUrl}/zodiac-signs`,
      {
        headers: this.getAuthHeaders()
      }
    );
  }

  // =========================
  // SEARCH
  // =========================

  globalSearch(query: string): Observable<any> {

    const params = new HttpParams()
      .set('q', query);

    return this.http.get(
      `${this.baseUrl}/search`,
      {
        headers: this.getAuthHeaders(),
        params
      }
    );
  }

  // =========================
  // RATINGS
  // =========================

  getRatings(astrologerId: number): Observable<any> {

    const params = new HttpParams()
      .set('astrologer_profile_id', astrologerId);

    return this.http.get(
      `${this.baseUrl}/ratings`,
      {
        headers: this.getAuthHeaders(),
        params
      }
    );
  }

  submitRating(payload: {
    astrologer_profile_id: number;
    rating: number;
    comment?: string;
    ratable_type: string;
    ratable_id: number;
  }): Observable<any> {

    return this.http.post(
      `${this.baseUrl}/ratings`,
      payload,
      { headers: this.getAuthHeaders() }
    );
  }

  // =========================
  // TWILIO VOICE
  // =========================

  getVoiceToken(): Observable<any> {
    const token = localStorage.getItem('accessToken');
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      Accept: 'application/json'
    });

    return this.http.get(`${this.baseUrl}/twilio/voice-token`, { headers });
  }

  /**
   * Sends only astrologer_id — no twilio_sid.
   *
   * The app has no real Twilio SID at this point in the flow, and the placeholder it used to
   * invent ('CALL_' + Date.now()) was being stored on the call_requests row and echoed back by
   * call-status, never replaced by a genuine CA… SID. The backend fills the SID in itself once
   * Twilio dials, so leaving the field out is what the working client does.
   */
  requestVoiceCall(astrologer_id: number): Observable<any> {
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
      Accept: 'application/json'
    });
    return this.http.post(`${this.baseUrl}/consultations/request-call`, { astrologer_id }, { headers });
  }


  getChatToken(): Observable<any> {
    const headers = new HttpHeaders({
      Authorization: `Bearer ${localStorage.getItem('accessToken')}`
    });

    return this.http.get(
      `${this.baseUrl}/twilio/chat-token`,
      { headers }
    );
  }

  requestChat(astrologer_id: number, twilio_sid: string): Observable<any> {

    const headers = new HttpHeaders({
      Authorization: `Bearer ${localStorage.getItem('accessToken')}`
    });

    return this.http.post(
      `${this.baseUrl}/consultations/request-chat`,
      {
        astrologer_id,
        twilio_sid
      },
      { headers }
    );
  }


  getCallStatus(callRequestId: number): Observable<any> {
    return this.http.get(
      `${this.baseUrl}/consultations/call-status/${callRequestId}`,
      { headers: this.getAuthHeaders() }
    );
  }

  getChatStatus(chatRequestId: number): Observable<any> {
    return this.http.get(
      `${this.baseUrl}/consultations/chat-status/${chatRequestId}`,
      { headers: this.getAuthHeaders() }
    );
  }

  endChat(
    chat_request_id: number,
    duration_minutes: number
  ): Observable<any> {

    const headers = new HttpHeaders({
      Authorization: `Bearer ${localStorage.getItem('accessToken')}`
    });

    return this.http.post(
      `${this.baseUrl}/consultations/end-chat`,
      {
        chat_request_id,
        duration_minutes
      },
      { headers }
    );
  }

  endCall(
    call_request_id: number,
    duration_minutes: number
  ): Observable<any> {

    const headers = new HttpHeaders({
      Authorization: `Bearer ${localStorage.getItem('accessToken')}`
    });

    return this.http.post(
      `${this.baseUrl}/consultations/end-call`,
      {
        call_request_id,
        duration_minutes
      },
      { headers }
    );
  }

  callBillingPing(sid: string): Observable<any> {
    return this.http.post(
      `${this.baseUrl}/consultations/call-billing-ping`,
      { sid },
      { headers: this.getAuthHeaders() }
    );
  }


  // =======================
  // TRANSACTIONS
  // =======================

  getWalletTransactions(): Observable<any> {

    const token = localStorage.getItem('accessToken');

    const headers = new HttpHeaders({
      Authorization: `Bearer ${token}`
    });

    return this.http.get(
      `${this.baseUrl}/wallet/transactions`,
      { headers }
    );
  }

  // =======================
  // ADD MONEY
  // =======================

  updateProfile(formData: FormData): Observable<any> {
    const headers = new HttpHeaders({
      Authorization: `Bearer ${localStorage.getItem('accessToken')}`
      // Do NOT set Content-Type — browser sets it with the correct multipart boundary
    });
    return this.http.post(`${this.baseUrl}/profile/update`, formData, { headers });
  }

  addMoney(amount: number): Observable<any> {

    const token = localStorage.getItem('accessToken');

    const headers = new HttpHeaders({
      Authorization: `Bearer ${token}`
    });

    return this.http.post(
      `${this.baseUrl}/wallet/add`,
      {
        amount
      },
      { headers }
    );
  }
}