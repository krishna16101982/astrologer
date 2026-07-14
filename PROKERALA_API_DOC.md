# Prokerala API Reference

## Token endpoint

Request:

POST https://api.prokerala.com/token

Headers:

- Content-Type: application/x-www-form-urlencoded

Body:

```
grant_type=client_credentials&client_id=<CLIENT_ID>&client_secret=<CLIENT_SECRET>
```

Response:

```json
{
  "access_token": "<ACCESS_TOKEN>",
  "token_type": "Bearer",
  "expires_in": 3600
}
```

## Kundli endpoint

Request:

GET https://api.prokerala.com/v2/astrology/kundli

Headers:

- Authorization: Bearer <ACCESS_TOKEN>

Query parameters:

- ayanamsa (string)
- datetime (ISO 8601 string)
- coordinates (latitude,longitude)

Example:

```
curl -H "Authorization: Bearer <ACCESS_TOKEN>" "https://api.prokerala.com/v2/astrology/kundli?ayanamsa=1&coordinates=23.1765,75.7885&datetime=2022-03-17T10:50:40%2B00:00"
```

## Kundli matching endpoint

Request:

GET https://api.prokerala.com/v2/astrology/kundli-matching

Headers:

- Authorization: Bearer <ACCESS_TOKEN>

Query parameters are typically:

- ayanamsa
- boy_coordinates
- boy_dob
- girl_coordinates
- girl_dob

Example:

```
curl -H "Authorization: Bearer <ACCESS_TOKEN>" "https://api.prokerala.com/v2/astrology/kundli-matching?ayanamsa=1&boy_coordinates=23.1765,75.7885&boy_dob=1990-01-01T07:00:00Z&girl_coordinates=19.0760,72.8777&girl_dob=1992-05-10T09:30:00Z"
```
