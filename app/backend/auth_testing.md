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