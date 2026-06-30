/app/frontend/src/components/ui/calendar.jsx:59:19: Do not define components during render. React will see a new component type on every render and destroy the entire subtree’s DOM nodes and state (https://reactjs.org/docs/reconciliation.html#elements-of-different-types). Instead, move this component definition out of the parent component “Calendar” and pass data as props. If you want to allow component creation in props, set allowAsProps option to true. [Error/react/no-unstable-nested-components] /app/frontend/src/components/ui/calendar.jsx:62:20: Do not define components during render. React will see a new component type on every render and destroy the entire subtree’s DOM nodes and state (https://reactjs.org/docs/reconciliation.html#elements-of-different-types). Instead, move this component definition out of the parent component “Calendar” and pass data as props. If you want to allow component creation in props, set allowAsProps option to true. [Error/react/no-unstable-nested-components] /app/frontend/src/components/ui/command.jsx:36:52: Unknown property 'cmdk-input-wrapper' found [Error/react/no-unknown-property] /app/frontend/src/context/AuthContext.jsx:46:55: Empty block statement. [Error/no-empty] /app/frontend/src/context/AuthContext.jsx:55:17: Empty block statement. [Error/no-empty] /app/frontend/src/pages/Dashboard.jsx:40:59: ' can be escaped with &apos;, &lsquo;, &#39;, &rsquo;. [Error/react/no-unescaped-entities] /app/frontend/src/pages/Dashboard.jsx:125:80: ' can be escaped with &apos;, &lsquo;, &#39;, &rsquo;. [Error/react/no-unescaped-entities] /app/frontend/src/pages/Landing.jsx:34:59: ' can be escaped with &apos;, &lsquo;, &#39;, &rsquo;. [Error/react/no-unescaped-entities] /app/frontend/src/pages/Login.jsx:39:13: " can be escaped with &quot;, &ldquo;, &#34;, &rdquo;. [Error/react/no-unescaped-entities] /app/frontend/src/pages/Login.jsx:39:35: ' can be escaped with &apos;, &lsquo;, &#39;, &rsquo;. [Error/react/no-unescaped-entities] /app/frontend/src/pages/Login.jsx:39:74: " can be escaped with &quot;, &ldquo;, &#34;, &rdquo;. [Error/react/no-unescaped-entities]

$ BASE=$(grep REACT_APP_BACKEND_URL /app/frontend/.env | cut -d'=' -f2) && \ echo "== login ==" && \ curl -s -X POST "$BASE/api/auth/login" -H "Content-Type: application/json" -d '{"email":"admin@foodai.com","password":"Admin123!"}' | head -c 500 && \ echo "" && echo "== /me via bearer ==" && \ TOKEN=$(curl -s -X POST "$BASE/api/auth/login" -H "Content-Type: application/json" -d '{"email":"admin@foodai.com","password":"Admin123!"}' | python3 -c "import sys,json;print(json.load(sys.stdin)['token'])") && \ curl -s -H "Authorization: Bearer $TOKEN" "$BASE/api/auth/me" | head -c 400 && \ echo "" && echo "== dashboard ==" && \ curl -s -H "Authorization: Bearer $TOKEN" "$BASE/api/dashboard" | head -c 400

$ BASE=$(grep REACT_APP_BACKEND_URL /app/frontend/.env | cut -d'=' -f2) && \ echo "== login ==" && \ curl -s -X POST "$BASE/api/auth/login" -H "Content-Type: application/json" -d '{"email":"admin@foodai.com","password":"Admin123!"}' | head -c 500 && \ echo "" && echo "== /me via bearer ==" && \ TOKEN=$(curl -s -X POST "$BASE/api/auth/login" -H "Content-Type: application/json" -d '{"email":"admin@foodai.com","password":"Admin123!"}' | python3 -c "import sys,json;print(json.load(sys.stdin)['token'])") && \ curl -s -H "Authorization: Bearer $TOKEN" "$BASE/api/auth/me" | head -c 400 && \ echo "" && echo "== dashboard ==" && \ curl -s -H "Authorization: Bearer $TOKEN" "$BASE/api/dashboard" | head -c 400

"# Auth Testing Playbook

## Mongo verification
mongosh \"$MONGO_URL\"
use food_ai_db
db.users.find({role:\"admin\"}, {password_hash:1}).pretty()
- bcrypt hashes must start with `$2b$`
- index on users.email (unique) must exist

## API tests
BASE=$REACT_APP_BACKEND_URL

# Login
curl -c /tmp/c.txt -X POST $BASE/api/auth/login \
  -H \"Content-Type: application/json\" \
  -d '{\"email\":\"admin@foodai.com\",\"password\":\"Admin123!\"}'

# Returns user + token, sets access_token cookie.

# /me via cookie
curl -b /tmp/c.txt $BASE/api/auth/me

# /me via bearer
TOKEN=$(curl -s -X POST $BASE/api/auth/login -H \"Content-Type: application/json\" \
  -d '{\"email\":\"admin@foodai.com\",\"password\":\"Admin123!\"}' | python3 -c \"import sys,json;print(json.load(sys.stdin)['token'])\")
curl -H \"Authorization: Bearer $TOKEN\" $BASE/api/auth/me
"

"# Image Integration Testing Rules
- Use base64-encoded images for all tests.
- Accepted formats: JPEG, PNG, WEBP only.
- Never use blank, solid-color, or uniform-variance images.
- Each image must contain real visual features (food objects, edges, textures).
- If non-JPEG/PNG/WEBP, transcode to JPEG/PNG before upload, and update MIME type.
- For animated formats, extract first frame only.
- Resize large images to reasonable bounds before upload.
- Endpoint to test: POST /api/predict (multipart, field name \"file\")
"

"# PRD – AI Food Recognition & Calorie Estimator

## Original Problem Statement
Build a complete web app that recognizes food from an uploaded image or webcam, estimates nutrition and calories using AI, and displays the result in a modern dashboard.

## Stack (user-confirmed)
- Frontend: React + Tailwind + shadcn
- Backend: FastAPI (Python 3.12)
- DB: MongoDB
- AI: Gemini 3 Flash Vision via Emergent LLM key (emergentintegrations)
- Auth: JWT custom (email/password)
- Reports: PDF (reportlab) + CSV

## Core Requirements
1. Auth: register / login / forgot-password / JWT cookies + bearer
2. Profile: name, age, gender, height, weight, goal, daily calorie target
3. Food recognition: upload image OR webcam → Gemini Vision → structured nutrition JSON
4. Meal history per meal type (breakfast/lunch/dinner/snack)
5. Dashboard: daily calories, remaining, macros, weekly chart, recognition count
6. Reports: PDF + CSV (daily/weekly/monthly)

## What's been implemented (Phase 1 – Feb 2026)
- JWT auth (register/login/me/logout/forgot/reset)
- User profile CRUD
- POST /api/predict – Gemini 3 Flash vision food recognition + nutrition
- Meal history CRUD with date + meal_type
- Dashboard stats endpoint (today, week, macros, recognition count)
- /api/report/pdf and /api/report/csv (daily/weekly/monthly)
- React frontend: Login, Register, Dashboard, Scan (upload + webcam), History, Profile, Reports

"# Test Credentials – AI Food Recognition & Calorie Estimator

## Admin Account
- **Email:** admin@foodai.com
- **Password:** Admin123!
- **Role:** admin

## Test User (can be registered fresh during testing)
- Email: test@foodai.com
- Password: Test123!

## Auth Endpoints (all under /api/auth)
- POST /api/auth/register
- POST /api/auth/login
- POST /api/auth/logout
- GET  /api/auth/me
- POST /api/auth/forgot-password
- POST /api/auth/reset-password

Auth uses JWT in `Authorization: Bearer <token>` header AND httpOnly cookies.
"