import { Injectable } from '@angular/core';

export interface KundliBirthDetails {
  name: string;
  gender: string;
  dob: string;
  tob: string;
  place: string;
}

export interface KundliRecord {
  birth: KundliBirthDetails;
  raw: any;
}

export interface MatchPerson {
  name: string;
  dob: string;
  tob: string;
  place: string;
}

export interface KundliMatchRecord {
  boy: MatchPerson;
  girl: MatchPerson;
  ayanamsa: string;
  raw: any;
}

/**
 * Holds the most recently generated result so the result page can render it after
 * navigation. Mirrored into sessionStorage so a reload on the result route doesn't
 * drop the user onto an empty screen.
 */
abstract class SessionRecordStore<T> {

  protected abstract readonly storageKey: string;
  private record: T | null = null;

  set(record: T): void {
    this.record = record;
    try {
      sessionStorage.setItem(this.storageKey, JSON.stringify(record));
    } catch {
      // sessionStorage can be unavailable (private mode); the in-memory copy still works.
    }
  }

  get(): T | null {
    if (this.record) {
      return this.record;
    }

    try {
      const stored = sessionStorage.getItem(this.storageKey);
      this.record = stored ? JSON.parse(stored) : null;
    } catch {
      this.record = null;
    }

    return this.record;
  }

  clear(): void {
    this.record = null;
    try {
      sessionStorage.removeItem(this.storageKey);
    } catch {
      // ignore
    }
  }
}

@Injectable({ providedIn: 'root' })
export class KundliStore extends SessionRecordStore<KundliRecord> {
  protected readonly storageKey = 'lastKundliResult';
}

@Injectable({ providedIn: 'root' })
export class KundliMatchStore extends SessionRecordStore<KundliMatchRecord> {
  protected readonly storageKey = 'lastKundliMatchResult';
}
