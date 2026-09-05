# API Reference

Base URL: `http://localhost:4000/api` (configurable via `VITE_API_URL` on
the client, `PORT` on the server).

## Conventions

- All request/response bodies are JSON.
- Authentication is via `httpOnly` cookies (`access_token`,
  `refresh_token`), set automatically by `/auth/register` and
  `/auth/login`. There is no `Authorization: Bearer` header -- the browser
  sends the cookies automatically as long as requests are made with
  `credentials: 'include'`.
- Errors always return `{ "error": string, "details"?: unknown }` with an
  appropriate HTTP status code (see [Error responses](#error-responses)).
- Trip-scoped routes enforce roles server-side
  (`OWNER` > `EDITOR` > `VIEWER`); accessing a trip you're not a member of
  returns `404` (not `403`), so membership existence isn't leaked.

## Auth

| Method | Path | Auth | Body | Notes |
|---|---|---|---|---|
| POST | `/auth/register` | none | `{ email, password, name }` | password >= 8 chars. Sets auth cookies. |
| POST | `/auth/login` | none | `{ email, password }` | Sets auth cookies. |
| POST | `/auth/refresh` | refresh cookie | -- | Rotates the refresh token, issues a new access token. |
| POST | `/auth/logout` | access cookie | -- | Revokes the session, clears cookies. |
| GET | `/auth/me` | required | -- | Returns the current user. |

## Trips

| Method | Path | Min role | Notes |
|---|---|---|---|
| GET | `/trips` | member | Lists trips the caller belongs to, with role/activity/member counts. |
| POST | `/trips` | (auth) | `{ name, destinationName, destinationLat, destinationLon, startDate, endDate }`. Creator becomes `OWNER`. |
| GET | `/trips/:tripId` | VIEWER | |
| PATCH | `/trips/:tripId` | OWNER | Partial update of the same fields as create. |
| DELETE | `/trips/:tripId` | OWNER | Cascades to places/activities/expenses/members. |
| POST | `/trips/:tripId/duplicate` | VIEWER | Copies core details + saved places into a new trip owned by the caller. |

## Members

| Method | Path | Min role | Notes |
|---|---|---|---|
| GET | `/trips/:tripId/members` | VIEWER | |
| POST | `/trips/:tripId/members` | OWNER | `{ email, role: "EDITOR" \| "VIEWER" }`. The invited user must already have a RouteRoom account. |
| PATCH | `/trips/:tripId/members/:memberId` | OWNER | `{ role }`. Cannot change the owner's role. |
| DELETE | `/trips/:tripId/members/:memberId` | OWNER | Cannot remove the owner. |

## Places

| Method | Path | Min role | Notes |
|---|---|---|---|
| GET | `/places/search?q=` | (auth) | Proxies a live Nominatim search. Not trip-scoped. |
| GET | `/trips/:tripId/places` | VIEWER | Saved places for the trip. |
| POST | `/trips/:tripId/places` | EDITOR | Persists a search result (or manual coordinates) to the trip. |
| DELETE | `/trips/:tripId/places/:placeId` | EDITOR | `409` if an activity still references this place. |

## Activities / itinerary

| Method | Path | Min role | Notes |
|---|---|---|---|
| GET | `/trips/:tripId/activities` | VIEWER | |
| POST | `/trips/:tripId/activities` | EDITOR | `{ placeId, date, startTime, endTime?, notes?, category?, status? }`. `400` if the date is outside the trip range, `endTime <= startTime`, or the place isn't saved to this trip. |
| PATCH | `/activities/:activityId` | EDITOR (on the activity's trip) | Partial update, same validation as create. |
| DELETE | `/activities/:activityId` | EDITOR (on the activity's trip) | |
| POST | `/trips/:tripId/activities/reorder` | EDITOR | `{ order: [{ id, orderIndex }] }` |
| GET | `/trips/:tripId/activities/analysis` | VIEWER | Computed per-day warnings (overlaps, travel conflicts, packed days) -- see [architecture.md](./architecture.md#itinerary-intelligence). |

`date` is `YYYY-MM-DD`; `startTime`/`endTime` are `HH:mm`.

## Routing

| Method | Path | Auth | Notes |
|---|---|---|---|
| GET | `/routes?fromLat=&fromLon=&toLat=&toLon=&profile=walking\|driving` | required | Ad-hoc route lookup (not trip-scoped). `502` if OSRM is unreachable or no route exists. |

## Weather

| Method | Path | Min role | Notes |
|---|---|---|---|
| GET | `/weather?lat=&lon=&date=` | (auth) | Ad-hoc forecast lookup. |
| GET | `/trips/:tripId/weather` | VIEWER | Forecast for every day of the trip, at the destination's coordinates. Each entry is `{ available: true, ... }` or `{ available: false, date, reason }` -- never fabricated. |

## Expenses

| Method | Path | Min role | Notes |
|---|---|---|---|
| GET | `/trips/:tripId/expenses` | VIEWER | Returns `{ expenses, balances, settlements }` -- `balances` is each member's net position, `settlements` is the simplified minimal set of "X owes Y" transactions. |
| POST | `/trips/:tripId/expenses` | EDITOR | `{ description, amountCents, currency?, paidByUserId, participants: [{ userId, shareCents? }] }`. Omit every `shareCents` for an equal split; provide all of them for a custom split (must sum to `amountCents`). All payers/participants must be trip members. |
| DELETE | `/expenses/:expenseId` | EDITOR (on the expense's trip) | |

Amounts are always integer cents to avoid floating-point rounding issues.

## Error responses

| Status | Meaning |
|---|---|
| 400 | Validation failure (bad input, business-rule violation like a date outside range) |
| 401 | Not authenticated / session expired |
| 403 | Authenticated, but the role doesn't allow this action |
| 404 | Resource not found, or not visible to the caller |
| 409 | Conflict (duplicate email on register, place still referenced by an activity, etc.) |
| 502 | An upstream service (Nominatim/OSRM/Open-Meteo) failed or is unreachable |
| 500 | Unexpected server error (logged server-side; response body never includes a stack trace) |

## WebSocket

`ws://<server>/ws?tripId=<id>` (auth cookie is read from the upgrade
request). On connecting, the server verifies the caller is a member of
that trip, then joins them to a broadcast room. Messages are
`{ event: "activity:created" | "activity:updated" | ..., tripId, at }` --
the payload is intentionally just a signal to re-fetch, not a patch to
apply (see [architecture.md](./architecture.md#real-time-collaboration)).
