import {
  Injectable
} from '@angular/core';

import {
  BehaviorSubject
} from 'rxjs';

import { AuthService } from './auth';

@Injectable({
  providedIn: 'root'
})
export class WalletService {

  private walletBalanceSubject =
    new BehaviorSubject<number>(0);

  walletBalance$ =
    this.walletBalanceSubject
      .asObservable();

  constructor(private authService: AuthService) {
    this.authService.authState$.subscribe(loggedIn => {
      if (!loggedIn) {
        this.walletBalanceSubject.next(0);
      }
    });
  }

  // =========================
  // UPDATE BALANCE
  // =========================

  updateBalance(
    balance: number
  ) {

    this.walletBalanceSubject
      .next(balance);

  }

  // =========================
  // SET BALANCE
  // =========================

  setBalance(
    balance: number
  ) {

    this.walletBalanceSubject
      .next(balance);

  }

}