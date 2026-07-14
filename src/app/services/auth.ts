import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class AuthService {

  private authState = new BehaviorSubject<boolean>(this.hasToken());
    private tokenSubject = new BehaviorSubject<string | null>(localStorage.getItem('accessToken'));

  token$ = this.tokenSubject.asObservable();   // ✅ now exists

  authState$ = this.authState.asObservable();

  constructor() { }

  private hasToken(): boolean {
    return !!localStorage.getItem('accessToken');
  }

  login(token: string) {
    localStorage.setItem('accessToken', token);
    this.authState.next(true);   // 🔥 notify app
  }

  logout() {
    localStorage.removeItem('accessToken');
    this.authState.next(false);
  }
}