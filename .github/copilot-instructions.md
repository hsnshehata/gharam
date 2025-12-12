Project: beauty-center-manager (gharamm)

This project is a two-part full-stack app: an Express/MongoDB backend in `server/` and a Create-React-App frontend in `client/`.

Quick dev commands
- `npm run dev` (root): runs both backend and frontend concurrently (uses `concurrently`).
- `npm start` (root): starts only the backend (`node server.js`).
- `npm run client` (root) or `cd client && npm start`: runs the React dev server.
- `cd client && npm run build`: builds the production front-end into `client/build` which the server serves when `NODE_ENV=production`.

Big picture architecture
- Backend: `server/server.js` (Express) mounts route modules from `server/routes/*.js` and uses controllers in `server/controllers/*.js` to handle business logic and persist via Mongoose models in `server/models/*.js`.
- Frontend: CRA app under `client/` — pages live in `client/src/pages/` and UI components in `client/src/components/`.
- API surface: backend routes are mounted under `/api/*` (see `server/server.js`) and the front-end directly calls `http://localhost:5000/api/...` in many pages (see examples below).

Important conventions and patterns (concrete, not aspirational)
- Controller pattern: each route file (e.g. `server/routes/users.js`) delegates to a controller in `server/controllers/<name>Controller.js`.
- Models: Mongoose models are single-file exports under `server/models/` (e.g. `User.js`, `Booking.js`) and are used directly in controllers.
- Auth: JWT-based. Middleware `server/middleware/authenticate.js` expects token in header `x-auth-token` and sets `req.user` after verification. Frontend stores token in `localStorage` and sends it as `x-auth-token` in axios requests.
- Frontend API calls: many pages hard-code the backend base URL as `http://localhost:5000` (examples: `client/src/pages/Bookings.js`, `AddUser.js`, `Dashboard.js`). When changing ports or deploying, update those files or centralize into an env variable.

Environment variables to be aware of
- `MONGO_URI` – MongoDB connection string (used in `server/server.js`).
- `JWT_SECRET` – secret used by `jsonwebtoken` (used in `server/middleware/authenticate.js` and auth controller).
- `PORT` – optional override for server port; default is `5000` in `server/server.js`.
- `NODE_ENV` – server serves `client/build` when `production`.

Examples taken from the codebase
- Starting server: `server/server.js` uses `process.env.PORT || 5000` and serves APIs under `/api/*`.
- Auth header in client: `headers: { 'x-auth-token': localStorage.getItem('token') }` (see `client/src/pages/Dashboard.js`).
- Direct API call example: `axios.post('http://localhost:5000/api/users', formData, { headers: ... })` (see `client/src/pages/AddUser.js`).

Integration notes for contributors/AI agents
- If editing or adding API endpoints, update corresponding `server/routes/*` and create a controller in `server/controllers/` and a Mongoose model under `server/models/` if needed.
- When changing the API base URL, search for `http://localhost:5000` across `client/src/` and update callsites (or add a single `REACT_APP_API_BASE` env var and replace occurrences) — the codebase currently prefers explicit URLs.
- For authentication changes, ensure `x-auth-token` header usage stays consistent; the middleware expects that header name.

Where to look first when changing a feature
- Backend request flow: `server/routes/*` -> `server/controllers/*` -> `server/models/*`.
- Frontend: `client/src/pages/*` for page-level data fetching and `client/src/components/*` for reusable UI.

If something is unclear or I missed a pattern you rely on, tell me which area (backend routes, auth, frontend API usage, or build/deploy) and I will extend this guidance with concrete file examples or automated fixes.
تحدث دائماً باللغة العربية 
اللهجة المصرية في الشروحات المصحوبة لاي تعديلات 
