import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  baseUrl = 'https://astroauraa.com/api';
  apiUrl = 'https://jsonplaceholder.typicode.com/posts';

  constructor(private http: HttpClient) { }

  // POST API
  login(data: any): Observable<any> {
    return this.http.post(this.baseUrl + '/login', data);
  }

  register(data: any): Observable<any> {
    return this.http.post(this.baseUrl + '/register', data);
  }

  createPost(data: any): Observable<any> {
    return this.http.post(this.apiUrl, data);
  }
// GET API
  getHomeData(): Observable<any> {
    return this.http.get(`${this.baseUrl}/astrologers`);
  }
}