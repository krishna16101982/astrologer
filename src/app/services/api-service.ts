import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  baseUrl = 'https://astroauraa.com/api';
  token = localStorage.getItem('accessToken');

  constructor(private http: HttpClient) { }

  // POST API
  login(data: any): Observable<any> {
    return this.http.post(this.baseUrl + '/login', data);
  }

  register(data: any): Observable<any> {
    return this.http.post(this.baseUrl + '/register', data);
  }

  createPost(data: any): Observable<any> {
    return this.http.post(this.baseUrl, data);
  }
// GET API
  getAstrologersData(): Observable<any> {
    return this.http.get(`${this.baseUrl}/astrologers`);
  }

  getAstrologerProfile(id:any): Observable<any> {
        const headers = new HttpHeaders({
      'Authorization': `Bearer ${this.token}`,
      'Content-Type': 'application/json'
    });
    return this.http.get(`${this.baseUrl}/astrologers/${id}`, { headers });
  }
}