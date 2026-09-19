# Voice Call Not Reaching Astrologer — Backend Investigation Request

**To:** Laravel / backend developer
**From:** Mobile app (Ionic + Capacitor Android client)
**Date:** 10 August 2026
**API base:** `https://astroauraa.com/api`
**Astrologer used for testing:** `id 7` — Acharya Mukesh (`user_id 19`)

---

## 1. Summary

Voice calls placed from the **mobile app** never reach the astrologer. The same astrologer
receives calls normally when the call is placed from the **website**, and **chat from the mobile
app works correctly** against this same backend.

The single concrete finding:

> `GET /api/consultations/call-status/{id}` returns `"status": "initiated"` and **never changes**.
> Confirmed over 20 consecutive polls across 60 seconds, on two separate call requests
> (`call_request_id` 141 and 142).

By contrast, `chat-status/{id}` **does** transition to `"accepted"`, which is why chat works.

Because chat succeeds through the identical pattern on the same server with the same token,
this rules out authentication, network, CORS, and the app's polling logic. The problem is
specific to the voice call path.

---

## 2. Authentication

Every request below is sent with:

```http
Authorization: Bearer <sanctum-token>
Accept:        application/json
Content-Type:  application/json
```

The `Accept: application/json` header was added recently. Without it, Laravel's auth middleware
302-redirects to the HTML login page instead of returning 401 JSON, which the app cannot parse.

---

## 3. Voice call sequence — exactly what the app does

All response bodies below are **quoted verbatim from Android device logs**. Nothing is
reconstructed or paraphrased.

### Step 1 — Get the Twilio voice token · WORKS

```http
GET /api/twilio/voice-token
```

Returns a usable JWT. The app validates `response.token` and proceeded past this step on every
attempt. The token payload itself was not logged.

**Please confirm:** does this grant include an outgoing Application SID, and what `identity` is
the token issued for?

---

### Step 2 — Create the call request · RETURNS 200

```http
POST /api/consultations/request-call
```

Request body:

```json
{
  "astrologer_id": 7,
  "twilio_sid": "CALL_1786365756262"
}
```

Response (verbatim):

```json
{
  "status": "success",
  "message": "Call request successfully logged.",
  "data": {
    "call_request_id": 142,
    "call_status": "initiated",
    "start_time": "2026-08-10T12:42:37.000000Z"
  }
}
```

Two notes:

- `twilio_sid` is a **client-generated placeholder**, literally `'CALL_' + Date.now()`. The app has
  no real Twilio SID at this point in the flow.
- The message *"Call request successfully logged"* suggests this endpoint records the request
  rather than dispatching it. **Please confirm whether it fires any notification, broadcast,
  event, or queued job toward the astrologer.**

---

### Step 3 — Poll for acceptance · THIS IS WHERE IT FAILS

```http
GET /api/consultations/call-status/142
```

Response — **identical on all 20 polls, 3 seconds apart**:

```json
{
  "status": "success",
  "data": {
    "call_request_id": 142,
    "status": "initiated",
    "twilio_sid": "CALL_1786365756262"
  }
}
```

Two things never happen:

1. `status` never leaves `"initiated"` — no `accepted`, no `rejected`, no timeout state.
2. `twilio_sid` is echoed back as the client's placeholder. It is **never replaced** with a real
   `CA…` Twilio Call SID.

**Schema inconsistency worth fixing while you're in there:** `request-call` returns the field as
`data.call_status`, but `call-status` returns it as `data.status`. Same concept, two different
names. Please check the chat endpoints for the same drift.

---

### Step 4 — Twilio dials the astrologer via your TwiML webhook · CANNOT BE SEEN FROM THE APP

The app calls the Twilio Voice SDK's `device.connect()` with these parameters:

```json
{
  "call_request_id": "142",
  "twilio_sid": "CALL_1786365756262"
}
```

Twilio then POSTs to whatever **Voice URL** is configured on the TwiML Application tied to the
voice token.

**This step is invisible to the mobile app and is the most likely place the call is being lost.**

---

### Step 5 — Billing and teardown · NEVER REACHED

```http
POST /api/consultations/call-billing-ping     body: { "sid": "<real CallSid>" }
POST /api/consultations/end-call              body: { "call_request_id": 142, "duration_minutes": 1.5 }
```

Billing pings run every 60 seconds once connected. A `402` response ends the call for
insufficient balance. Neither was ever exercised because no call ever connected.

---

## 4. Why chat works — the control case

Chat uses the **identical** request-then-poll pattern, against the same backend, with the same
token, and it completed successfully during the same test session.

| Stage | Chat (works) | Voice (fails) |
|---|---|---|
| Token | `GET /twilio/chat-token` | `GET /twilio/voice-token` |
| Create request | `POST /consultations/request-chat` → `data.chat_request_id` | `POST /consultations/request-call` → `data.call_request_id` |
| Poll status | `chat-status/{id}` → reaches **`accepted`** | `call-status/{id}` → stuck on **`initiated`** |
| Real SID returned | Yes — a `CH…` conversation SID on acceptance | No — placeholder `CALL_…` echoed back |
| Astrologer notified | Yes — they accept in the dashboard | No incoming prompt appears |
| Completion | `POST /consultations/end-chat`, billed correctly | Never reached |

Proof chat completed, verbatim from the same session:

```
[endChat] chatRequestId: 160  duration: 1.7335
[endChat] response:
{
  "status": "success",
  "message": "Chat consultation completed successfully.",
  "data": {
    "duration": 1.7335,
    "total_cost": 86.675,
    "user_remaining_balance": 5303.645
  }
}
```

---

## 5. How the website differs from the app

The same call **works from the website**. Two observations from screenshots of a successful web
call:

1. **Caller side:** the page goes straight to **"Connected"** with a running timer. It does *not*
   wait on any acceptance API first.
2. **Astrologer side:** the dashboard shows an **"Incoming Voice Call"** prompt with
   *Accept Call* / *Decline & Hangup* and a status of "Connecting…". That is a Twilio
   `Device.on('incoming')` prompt — meaning the astrologer is rung **by Twilio**, not by a REST
   notification from your API.

This implies voice acceptance happens at the **Twilio layer**, whereas chat acceptance happens at
the **REST layer**. They are two different mechanisms.

Also relevant: the website's call button points at **`/call/astrologer/{id}`** — a *web* route —
while the app posts to **`/api/consultations/request-call`**. If those are two different
controllers, and only the web one wires up the Twilio dial, that alone would explain the entire
problem.

---

## 6. What we need you to check

Ordered by how likely each is to be the cause.

### Q1 — What does the TwiML Application's Voice URL return?

Find the TwiML Application SID used when minting the voice token, and inspect its Voice webhook.
It should return TwiML containing `<Dial><Client>…</Client></Dial>` targeting the astrologer's
Twilio identity, resolved from the `call_request_id` parameter the app passes.

If this returns empty TwiML, a 500, or a `<Say>` fallback, nobody is ever dialled — which matches
every symptom we observe. **Please check the Twilio Console → Monitor → Logs → Errors and Calls
for our test attempts.**

### Q2 — Is the API route the same code path as the web route?

`POST /api/consultations/request-call` versus the web `GET /call/astrologer/{id}`.

The web flow works. If the API controller only inserts a database row while the web controller
also initiates the Twilio dial or notifies the astrologer, please point the API at the same logic.

### Q3 — What is supposed to set `call_requests.status = 'accepted'`?

Chat has a working accept transition; voice appears not to. Is there a Twilio **status callback**
configured for voice, and is it reaching your server?

If acceptance for voice happens purely inside Twilio, then `call-status` is not a meaningful
signal for the app to wait on — please confirm either way so we can match the app to the real
design.

### Q4 — What identity is the astrologer's dashboard registered under?

The dashboard clearly holds a registered Twilio Device, since it displays the incoming-call
prompt. We need the **exact identity string format** so the dial target can be verified — for
example `astrologer_7` versus `user_19`.

⚠️ Note that astrologer `id 7` maps to `user_id 19`. If the dial target is built from the wrong
one of those two, the result is exactly this failure: request logged fine, nobody dialled, no
error surfaced anywhere.

### Q5 — Should the app keep sending a placeholder `twilio_sid`?

The app currently invents `'CALL_' + Date.now()` because it has no real SID before connecting.
If the backend needs the genuine `CallSid`, tell us which endpoint should receive it and at what
point, and we will send it after connect.

---

## 7. Changes already made on the app side

So you know what has and has not been ruled out:

- **Removed the 60-second wait for `status === 'accepted'`.** The app now calls
  `device.connect()` immediately after `request-call` succeeds, since that is what actually
  triggers the Twilio dial. Previously the app timed out and never dialled at all.
- **Removed `device.register()`.** It hung for over two minutes and left a dead signalling socket
  behind, producing `TransportError 31009 — No transport available`. `register()` is only needed
  to *receive* calls; this app only places them.
- **Added `Accept: application/json`** to all authenticated requests.
- **Fixed a resource leak** where each failed attempt left a registered Twilio Device and an open
  microphone stream behind.

Everything up to and including `device.connect()` is now verified working from the app side.

---

## 8. Appendix — raw logs

### Full poll sequence, call request 142

```
[CALL DEBUG] request-call astrologer_id = 7 | response =
  {"status":"success","message":"Call request successfully logged.",
   "data":{"call_request_id":142,"call_status":"initiated",
           "start_time":"2026-08-10T12:42:37.000000Z"}}

[CALL DEBUG] poll  1/20 id=142 | status = initiated | raw =
  {"status":"success","data":{"call_request_id":142,"status":"initiated",
   "twilio_sid":"CALL_1786365756262"}}
[CALL DEBUG] poll  2/20 id=142 | status = initiated | ...
[CALL DEBUG] poll  3/20 id=142 | status = initiated | ...
                      (identical for every poll)
[CALL DEBUG] poll 19/20 id=142 | status = initiated | ...
[CALL DEBUG] poll 20/20 id=142 | status = initiated | raw =
  {"status":"success","data":{"call_request_id":142,"status":"initiated",
   "twilio_sid":"CALL_1786365756262"}}

-> app gave up: "No response from the astrologer."
```

### Twilio transport failure (app-side, already fixed)

```
18:36:35  [TwilioVoice][WSTransport] websocket close event code: 1005
18:37:17  [TwilioVoice][Device] TransportError (31009):
          No transport available to send or receive messages
```

### Astrologer record used for this test

```
GET /api/astrologers/7

  id              7          <- sent as astrologer_id
  user_id         19         <- different number, easy to confuse
  display_name    "Acharya Mukesh"
  is_online       true
  is_call_online  true       <- shown as "Available" in the app
  is_chat_online  true
  call_price      100.00
  chat_price      50.00
```

---

## 9. How to reproduce on your side

1. Log into the mobile app as a user with sufficient wallet balance.
2. Ensure an astrologer is logged into the dashboard with call status online.
3. Open that astrologer's profile in the app and tap **Start Call Now**.
4. Watch, in this order:
   - the `call_requests` row that gets created — does `status` ever change?
   - Twilio Console → **Monitor → Logs → Calls** — does a call attempt appear at all?
   - Twilio Console → **Monitor → Logs → Errors** — any webhook failures (11200, 12100, 15003)?

The most valuable single data point: **does a call attempt appear in the Twilio Console when the
app tries to connect?** That tells us immediately whether the problem is before or after Twilio.

---

**Client details:** Ionic + Angular 18, Capacitor 7, `@twilio/voice-sdk` 2.18.3,
`@twilio/conversations` 3.x. Tested on Android emulator (Pixel 7, API 34) and a physical Android
device.
