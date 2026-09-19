# Voice Call — Complete API Test Points

**For:** the Laravel developer who wrote these APIs
**Purpose:** every endpoint the mobile app calls during a voice call, with the exact URL, the exact
payload we send, and the exact response we get back — so each point can be tested independently.
**Captured:** 10 August 2026, Android client, live against production.

**Base URL:** `https://astroauraa.com/api`

### Legend

| Mark | Meaning |
|---|---|
| ✅ | Verified working — response captured from device logs |
| ❌ | Confirmed failing — this is the bug |
| ⚠️ | Not captured verbatim — app proceeded past it, so it returns something usable, but we do not have the body logged |
| 🔍 | Cannot be observed from the app — needs checking on your side |

### Common headers

Every authenticated request sends exactly these:

```http
Authorization: Bearer <sanctum-token>
Accept:        application/json
Content-Type:  application/json
```

Set `TOKEN` once before running the curl commands below:

```bash
TOKEN="<paste a real sanctum token here>"
BASE="https://astroauraa.com/api"
```

---

# PART A — Pre-flight (runs before the call starts)

## TP-01 · Get user profile ✅

Used to confirm the user is logged in.

| | |
|---|---|
| **Method** | `GET` |
| **URL** | `https://astroauraa.com/api/profile` |
| **Payload** | none |

```bash
curl -s "$BASE/profile" -H "Authorization: Bearer $TOKEN" -H "Accept: application/json"
```

**Returns:** a user object. Confirmed working — the app reads `profile_image` from it.
Note the response contains `profile_image` but **not** `profile_image_url`, `image`, or `avatar`;
the app builds the full URL itself as `https://astroauraa.com/storage/<profile_image>`.

---

## TP-02 · Get wallet balance ✅

| | |
|---|---|
| **Method** | `GET` |
| **URL** | `https://astroauraa.com/api/wallet/balance` |
| **Payload** | none |

```bash
curl -s "$BASE/wallet/balance" -H "Authorization: Bearer $TOKEN" -H "Accept: application/json"
```

**Returns:** balance object. Working — the app showed ₹5,390.32 and correctly blocked/allowed calls
against the astrologer's per-minute price.

---

## TP-03 · Get astrologer profile ✅

| | |
|---|---|
| **Method** | `GET` |
| **URL** | `https://astroauraa.com/api/astrologers/7` |
| **Payload** | none |

```bash
curl -s "$BASE/astrologers/7" -H "Authorization: Bearer $TOKEN" -H "Accept: application/json"
```

**Returns (verbatim, fields relevant to calling):**

```json
{
  "data": {
    "id": 7,
    "user_id": 19,
    "display_name": "Acharya Mukesh",
    "slug": "acharya-mukesh",
    "is_online": true,
    "is_call_online": true,
    "is_chat_online": true,
    "call_price": "100.00",
    "chat_price": "50.00",
    "created_at": "...",
    "updated_at": "..."
  }
}
```

⚠️ **Important for Q4 later:** `id` is **7** but `user_id` is **19**. The app sends `id` (7) as
`astrologer_id`. If any dial target or Twilio identity is built from `user_id` instead, the
mismatch would silently break calls.

---

# PART B — The voice call flow

## TP-04 · Get Twilio voice token ⚠️

| | |
|---|---|
| **Method** | `GET` |
| **URL** | `https://astroauraa.com/api/twilio/voice-token` |
| **Payload** | none |

```bash
curl -s "$BASE/twilio/voice-token" -H "Authorization: Bearer $TOKEN" -H "Accept: application/json"
```

**App expects:** `response.token` to be a non-empty JWT. The app aborts with
"Failed to get voice token" if that key is missing.

**Status:** the app proceeded past this step on every attempt, so a usable token is returned.
The token body itself was not logged.

**🔍 Please verify and tell us:**
1. Does the AccessToken include a **VoiceGrant**?
2. Does that VoiceGrant set an **outgoing Application SID**? (Without it, `device.connect()`
   has nothing to dial.)
3. What `identity` is the token issued for — what exact string?
4. What TTL is set?

Decode it to check:

```bash
curl -s "$BASE/twilio/voice-token" -H "Authorization: Bearer $TOKEN" \
  -H "Accept: application/json" | jq -r .token | cut -d. -f2 | base64 -d | jq .
```

---

## TP-05 · Create the call request ✅ (returns 200, but see note)

| | |
|---|---|
| **Method** | `POST` |
| **URL** | `https://astroauraa.com/api/consultations/request-call` |

**Payload we send:**

```json
{
  "astrologer_id": 7,
  "twilio_sid": "CALL_1786365756262"
}
```

```bash
curl -s -X POST "$BASE/consultations/request-call" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Accept: application/json" \
  -H "Content-Type: application/json" \
  -d '{"astrologer_id":7,"twilio_sid":"CALL_1786365756262"}'
```

**Returns (verbatim from device log):**

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

**Notes:**

- `twilio_sid` is a **client-generated placeholder** — literally `'CALL_' + Date.now()`. The app
  has no real Twilio SID at this point in the flow. If you need the real one, see TP-09.
- The wording *"successfully logged"* suggests this records the request rather than dispatching it.
- 🔍 **Does this endpoint fire anything toward the astrologer** — a broadcast event, FCM push,
  queued job, or database notification? If not, what is supposed to?

---

## TP-06 · Poll call status ❌ **THIS IS THE FAILURE**

| | |
|---|---|
| **Method** | `GET` |
| **URL** | `https://astroauraa.com/api/consultations/call-status/142` |
| **Payload** | none |

```bash
curl -s "$BASE/consultations/call-status/142" \
  -H "Authorization: Bearer $TOKEN" -H "Accept: application/json"
```

**Returns — identical on all 20 polls, 3 seconds apart, across 60 seconds:**

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

**Two things never happen:**

1. `status` never leaves `"initiated"` — never `accepted`, never `rejected`, never a timeout state.
2. `twilio_sid` is echoed back as our placeholder — **never replaced** with a real `CA…` Call SID.

Reproduced identically on two separate requests: `call_request_id` **141** and **142**.

**⚠️ Field naming inconsistency:** TP-05 returns this value as `data.call_status`, but TP-06
returns it as `data.status`. Same concept, two different key names. Please check the chat
endpoints for the same drift.

**🔍 Key question:** what code path is supposed to write
`call_requests.status = 'accepted'`? Chat has a working equivalent (see TP-12).

---

## TP-07 · Twilio dials the astrologer 🔍 **CANNOT BE SEEN FROM THE APP**

This is **not** an HTTP call from the app to your API. The app calls the Twilio Voice SDK's
`device.connect()`, and **Twilio** then POSTs to your TwiML Application's Voice URL.

**Parameters the app hands to Twilio:**

```json
{
  "call_request_id": "142",
  "twilio_sid": "CALL_1786365756262"
}
```

Twilio delivers these to your webhook as **POST form fields**, alongside its own standard fields
(`CallSid`, `From`, `To`, `AccountSid`, `Direction`, `CallStatus`).

**🔍 What we need you to check — this is the most likely place the call is being lost:**

1. Which TwiML Application SID is tied to the voice token from TP-04?
2. What URL is set as that Application's **Voice Request URL**?
3. What TwiML does it return? It should be along the lines of:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Dial>
    <Client>astrologer_7</Client>
  </Dial>
</Response>
```

4. Does it resolve the astrologer from `call_request_id`, and is it using `id` (7) or
   `user_id` (19)?

Test the webhook directly, simulating what Twilio sends:

```bash
curl -s -X POST "https://astroauraa.com/<your-twiml-voice-url>" \
  -d "call_request_id=142" \
  -d "twilio_sid=CALL_1786365756262" \
  -d "CallSid=CAtest123" \
  -d "From=client:user_5" \
  -d "Direction=inbound"
```

If this returns empty TwiML, a 500, or a bare `<Say>`, that is the bug.

---

## TP-08 · Billing ping ⚠️ never reached

| | |
|---|---|
| **Method** | `POST` |
| **URL** | `https://astroauraa.com/api/consultations/call-billing-ping` |

**Payload:**

```json
{ "sid": "CAxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx" }
```

```bash
curl -s -X POST "$BASE/consultations/call-billing-ping" \
  -H "Authorization: Bearer $TOKEN" -H "Accept: application/json" \
  -H "Content-Type: application/json" \
  -d '{"sid":"CAxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"}'
```

Sent every **60 seconds** while a call is connected. The `sid` here is Twilio's **real**
`CallSid`, read from the connected call object — not the placeholder.

**App expects:** `response.remaining_balance`. A **402** status is treated as insufficient balance
and ends the call.

**Status:** never exercised, because no call ever connected.

---

## TP-09 · End call ⚠️ never reached

| | |
|---|---|
| **Method** | `POST` |
| **URL** | `https://astroauraa.com/api/consultations/end-call` |

**Payload:**

```json
{
  "call_request_id": 142,
  "duration_minutes": 1.7335
}
```

```bash
curl -s -X POST "$BASE/consultations/end-call" \
  -H "Authorization: Bearer $TOKEN" -H "Accept: application/json" \
  -H "Content-Type: application/json" \
  -d '{"call_request_id":142,"duration_minutes":1.7335}'
```

**Status:** never exercised. Note this endpoint currently does **not** receive the real Twilio
`CallSid` — if you need it stored against the request, tell us and we will add it here.

---

# PART C — Chat flow (the control case — this one WORKS)

Chat uses the **identical pattern** — same base URL, same token, same request-then-poll shape —
and it completes successfully. This is what proves the problem is specific to voice, not to auth,
network, or the app's polling logic.

## TP-10 · Get chat token ⚠️

| | |
|---|---|
| **Method** | `GET` |
| **URL** | `https://astroauraa.com/api/twilio/chat-token` |
| **Payload** | none |

Working — the app successfully created a Twilio Conversations client from this token.

---

## TP-11 · Create chat request ⚠️

| | |
|---|---|
| **Method** | `POST` |
| **URL** | `https://astroauraa.com/api/consultations/request-chat` |

**Payload:**

```json
{
  "astrologer_id": 7,
  "twilio_sid": "CHAT_1786365630692"
}
```

**App reads from the response:** `data.chat_request_id`, and optionally
`data.conversation_sid` / `data.twilio_conversation_sid`.

---

## TP-12 · Poll chat status ✅ **THIS ONE TRANSITIONS CORRECTLY**

| | |
|---|---|
| **Method** | `GET` |
| **URL** | `https://astroauraa.com/api/consultations/chat-status/160` |
| **Payload** | none |

**App reads:** `data.status`, and on `"accepted"` it reads the real `CH…` conversation SID from
`data.conversation_sid`, `data.twilio_conversation_sid`, or `data.twilio_sid`.

**Status:** ✅ reaches `"accepted"` when the astrologer accepts in the dashboard, and the real
`CH…` SID is returned. **This is exactly the behaviour that TP-06 fails to produce.**

---

## TP-13 · End chat ✅

| | |
|---|---|
| **Method** | `POST` |
| **URL** | `https://astroauraa.com/api/consultations/end-chat` |

**Payload sent:**

```json
{
  "chat_request_id": 160,
  "duration_minutes": 1.7335
}
```

**Returns (verbatim from device log):**

```json
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

Billing is correct: 1.7335 min × ₹50/min = ₹86.675. ✅

---

# PART D — Side-by-side

| Stage | Chat — WORKS | Voice — FAILS |
|---|---|---|
| Token | `GET /twilio/chat-token` | `GET /twilio/voice-token` |
| Create | `POST /consultations/request-chat` | `POST /consultations/request-call` |
| Returns id | `data.chat_request_id` | `data.call_request_id` |
| Status field on create | — | `data.call_status` |
| Poll | `GET /consultations/chat-status/{id}` | `GET /consultations/call-status/{id}` |
| Status field on poll | `data.status` | `data.status` |
| Reaches `accepted` | ✅ **yes** | ❌ **no — stuck on `initiated`** |
| Real Twilio SID returned | ✅ `CH…` conversation SID | ❌ placeholder `CALL_…` echoed back |
| Astrologer notified | ✅ prompt appears in dashboard | ❌ nothing appears |
| End | `POST /consultations/end-chat` ✅ | `POST /consultations/end-call` — never reached |

---

# PART E — The website works; the app does not

The same astrologer receives calls fine **from the website**. Two observations from screenshots
of a successful web call:

1. **Caller side:** goes straight to **"Connected"** with a running timer. It does **not** wait on
   any acceptance API first.
2. **Astrologer side:** the dashboard shows an **"Incoming Voice Call"** prompt with
   *Accept Call* / *Decline & Hangup*. That is a Twilio `Device.on('incoming')` prompt — so the
   astrologer is rung **by Twilio**, not by a REST notification from your API.

The website's call button points at **`/call/astrologer/{id}`** — a **web** route — while the app
posts to **`/api/consultations/request-call`**.

**🔍 If those are two different controllers, and only the web one wires up the Twilio dial, that
alone explains the entire problem.** Please compare them.

---

# PART F — Checklist

- [ ] **Q1** — What TwiML does the Voice Application URL return? Test with the curl in TP-07.
- [ ] **Q2** — Is `/api/consultations/request-call` the same code path as the web
      `/call/astrologer/{id}` route? If not, why do they differ?
- [ ] **Q3** — What is supposed to set `call_requests.status = 'accepted'`? Is a Twilio status
      callback configured for voice, and is it reaching the server?
- [ ] **Q4** — What exact identity string is the astrologer's dashboard Device registered under?
      Built from `id` (7) or `user_id` (19)?
- [ ] **Q5** — Does the voice token's VoiceGrant include an outgoing Application SID? (TP-04)
- [ ] **Q6** — Should the app send the real `CallSid` back after connecting? To which endpoint?
- [ ] **Q7** — Fix the `call_status` vs `status` field naming inconsistency between TP-05 and TP-06.

## The single most valuable check

**When the app attempts a call, does anything appear in Twilio Console → Monitor → Logs → Calls?**

- **Nothing appears** → the problem is before Twilio: the token, the Application SID, or the app.
- **A call appears but fails** → the problem is the TwiML webhook (TP-07). Check
  Monitor → Logs → Errors for 11200 (HTTP retrieval failure), 12100 (document parse error),
  or 15003 (dial target not found).

---

**Client:** Ionic + Angular 18, Capacitor 7, `@twilio/voice-sdk` 2.18.3,
`@twilio/conversations` 3.x. Tested on Android emulator (Pixel 7) and a physical Android device.
All response bodies above marked ✅ are quoted verbatim from device logs.
