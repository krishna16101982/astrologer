import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { ApiService } from './api-service';

describe('ApiService', () => {
  let service: ApiService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule]
    });
    service = TestBed.inject(ApiService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('requests a Prokerala token and kundli data when credentials are available', async () => {
    localStorage.setItem('prokeralaClientId', 'client-id');
    localStorage.setItem('prokeralaClientSecret', 'client-secret');

    spyOn<any>(service as any, 'getCoordinatesForPlace').and.returnValue(Promise.resolve('19.0760,72.8777'));

    const kundliPromise = service.generateKundli({
      name: 'Test User',
      gender: 'male',
      dob: '1990-01-01',
      tob: '10:30',
      place: 'Mumbai',
      ayanamsa: 'Lahiri',
      language: 'English',
      chartType: 'Basic'
    });

    const tokenRequest = httpMock.expectOne('https://api.prokerala.com/token');
    expect(tokenRequest.request.method).toBe('POST');
    tokenRequest.flush({ access_token: 'abc123', expires_in: 3600 });
    await new Promise(resolve => setTimeout(resolve, 0));

    const kundliRequests = httpMock.match((request) => request.method === 'GET' && request.url.includes('/v2/astrology/kundli'));
    expect(kundliRequests.length).toBe(1);
    const kundliRequest = kundliRequests[0];
    expect(kundliRequest.request.headers.get('Authorization')).toBe('Bearer abc123');
    expect(kundliRequest.request.params.get('ayanamsa')).toBe('1');
    kundliRequest.flush({ status: 'ok' });

    await expectAsync(kundliPromise).toBeResolved();
  });

  it('reuses a cached Prokerala token until expiry', async () => {
    const expiresAt = Date.now() + 3600 * 1000;
    localStorage.setItem('prokeralaAccessToken', 'cached-abc');
    localStorage.setItem('prokeralaAccessTokenExpiresAt', expiresAt.toString());
    spyOn<any>(service as any, 'getCoordinatesForPlace').and.returnValue(Promise.resolve('19.0760,72.8777'));

    const kundliPromise = service.generateKundli({
      name: 'Test User',
      gender: 'male',
      dob: '1990-01-01',
      tob: '10:30',
      place: 'Mumbai',
      ayanamsa: 'Lahiri',
      language: 'English',
      chartType: 'Basic'
    });

    httpMock.expectNone('https://api.prokerala.com/token');
    const kundliRequest = httpMock.expectOne((request) => request.method === 'GET' && request.url.includes('/v2/astrology/kundli'));
    expect(kundliRequest.request.headers.get('Authorization')).toBe('Bearer cached-abc');
    kundliRequest.flush({ status: 'ok' });

    await expectAsync(kundliPromise).toBeResolved();
  });

  it('refreshes an expired Prokerala token before calling kundli', async () => {
    const expiresAt = Date.now() - 1000;
    localStorage.setItem('prokeralaAccessToken', 'expired-abc');
    localStorage.setItem('prokeralaAccessTokenExpiresAt', expiresAt.toString());
    localStorage.setItem('prokeralaClientId', 'client-id');
    localStorage.setItem('prokeralaClientSecret', 'client-secret');
    spyOn<any>(service as any, 'getCoordinatesForPlace').and.returnValue(Promise.resolve('19.0760,72.8777'));

    const kundliPromise = service.generateKundli({
      name: 'Test User',
      gender: 'male',
      dob: '1990-01-01',
      tob: '10:30',
      place: 'Mumbai',
      ayanamsa: 'Lahiri',
      language: 'English',
      chartType: 'Basic'
    });

    const tokenRequest = httpMock.expectOne('https://api.prokerala.com/token');
    expect(tokenRequest.request.method).toBe('POST');
    tokenRequest.flush({ access_token: 'new-abc', expires_in: 3600 });
    await new Promise(resolve => setTimeout(resolve, 0));

    const kundliRequest = httpMock.expectOne((request) => request.method === 'GET' && request.url.includes('/v2/astrology/kundli'));
    expect(kundliRequest.request.headers.get('Authorization')).toBe('Bearer new-abc');
    kundliRequest.flush({ status: 'ok' });

    await expectAsync(kundliPromise).toBeResolved();
  });

  it('throws a clear error when Prokerala credentials are missing', async () => {
    const kundliPromise = service.generateKundli({
      name: 'Test User',
      gender: 'male',
      dob: '1990-01-01',
      tob: '10:30',
      place: 'Mumbai',
      ayanamsa: 'Lahiri',
      language: 'English',
      chartType: 'Basic'
    });

    await expectAsync(kundliPromise).toBeRejected();
  });

  it('surfaces the backend Prokerala auth error when token request fails', async () => {
    spyOn<any>(service as any, 'getCoordinatesForPlace').and.returnValue(Promise.resolve('19.0760,72.8777'));

    const kundliPromise = service.generateKundli({
      name: 'Test User',
      gender: 'male',
      dob: '1990-01-01',
      tob: '10:30',
      place: 'Mumbai',
      ayanamsa: 'Lahiri',
      language: 'English',
      chartType: 'Basic'
    });

    const tokenRequest = httpMock.expectOne('https://api.prokerala.com/token');
    tokenRequest.flush({ error_description: 'invalid_client' }, { status: 400, statusText: 'Bad Request' });

    let errorMessage = '';
    try {
      await kundliPromise;
    } catch (error: any) {
      errorMessage = error?.message || '';
    }

    expect(errorMessage).toContain('invalid_client');
  });
});
