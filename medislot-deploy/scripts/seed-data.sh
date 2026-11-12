#!/usr/bin/env bash
# Loads a few doctors and slots so the UI has something to show.
# Usage:  ./scripts/seed-data.sh [ui-url]      default http://localhost:8080
# (goes through the UI gateway, logs in as the dummy admin)
# Safe to run again: existing doctors are reused and fresh slots are added
# for the next three days, so run it again whenever the old slots have passed.
set -e
BASE=${1:-http://localhost:8080}

TOKEN=$(curl -s -X POST "$BASE/api/auth/login" -H 'Content-Type: application/json' \
  -d '{"username":"admin","password":"admin123"}' | sed -E 's/.*"token":"([^"]+)".*/\1/')

if [ -z "$TOKEN" ] || [ ${#TOKEN} -lt 50 ]; then
  echo "admin login failed - is the ui/auth service running at $BASE ?"
  exit 1
fi

# $1 = json body, $2 = email. Prints the doctor id, creating the doctor only if needed.
add_doctor() {
  RES=$(curl -s -X POST "$BASE/api/doctors" -H 'Content-Type: application/json' \
    -H "Authorization: Bearer $TOKEN" -d "$1")
  if echo "$RES" | grep -q '"id":'; then
    echo "$RES" | sed -E 's/.*"id":([0-9]+).*/\1/'
  else
    # already there - look it up by email
    curl -s "$BASE/api/doctors" | tr '}' '\n' | grep "\"email\":\"$2\"" | sed -E 's/.*"id":([0-9]+).*/\1/'
  fi
}

add_slot() {
  curl -s -o /dev/null -w "  slot $2 $3 -> %{http_code}\n" -X POST "$BASE/api/doctors/$1/slots" \
    -H 'Content-Type: application/json' -H "Authorization: Bearer $TOKEN" \
    -d "{\"date\":\"$2\",\"startTime\":\"$3\",\"endTime\":\"$4\"}"
}

D1=$(add_doctor '{"name":"Dr. Anita Rao","specialization":"Cardiology","email":"anita.rao@medislot.in","phone":"9876543210","consultationFee":800}' anita.rao@medislot.in)
D2=$(add_doctor '{"name":"Dr. Imran Qureshi","specialization":"Dermatology","email":"imran.q@medislot.in","phone":"9988776655","consultationFee":500}' imran.q@medislot.in)
D3=$(add_doctor '{"name":"Dr. Kavitha Menon","specialization":"Paediatrics","email":"kavitha.m@medislot.in","phone":"9445012345","consultationFee":600}' kavitha.m@medislot.in)
D4=$(add_doctor '{"name":"Dr. Sandeep Ghosh","specialization":"Orthopaedics","email":"sandeep.g@medislot.in","phone":"9830098300","consultationFee":750}' sandeep.g@medislot.in)
echo "doctors: $D1 $D2 $D3 $D4"
if [ -z "$D1" ] || [ -z "$D4" ]; then echo "could not create or find the doctors"; exit 1; fi

# next three days (GNU date; on mac use gdate)
DAY1=$(date -d "+1 day" +%F); DAY2=$(date -d "+2 day" +%F); DAY3=$(date -d "+3 day" +%F)

for D in $D1 $D2 $D3 $D4; do
  for DAY in $DAY1 $DAY2; do
    add_slot $D $DAY 10:00 10:20
    add_slot $D $DAY 10:20 10:40
    add_slot $D $DAY 10:40 11:00
    add_slot $D $DAY 17:00 17:20
  done
  add_slot $D $DAY3 11:00 11:20
done
echo "done"
