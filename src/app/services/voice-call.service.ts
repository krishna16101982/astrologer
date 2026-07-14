import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class VoiceCallService {

  /** Twilio Device instance */
  device: any = null;

  /** Active Twilio Call instance */
  activeCall: any = null;

  /** Backend call_request_id for billing */
  callRequestId: any = null;

  /** Time the call was answered (for duration calc) */
  callStartTime: Date | null = null;

  /** Display info for the voice-call page */
  astrologerName = '';
  astrologerImage = '';

  /** Reset all state after a call ends */
  clear() {
    this.device = null;
    this.activeCall = null;
    this.callRequestId = null;
    this.callStartTime = null;
    this.astrologerName = '';
    this.astrologerImage = '';
  }
}
