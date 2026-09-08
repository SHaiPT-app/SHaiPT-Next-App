#!/usr/bin/env bash
# Sync the Vercel project env for www.shaipt.com with .env.local.
# Run from the repo root:  bash scripts/vercel-env-sync.sh
# It never prints a secret value: only variable names and pass/fail.
set -uo pipefail

SCOPE="alis-projects-e60465e8"
cd "$(dirname "$0")/.." || exit 1

if [ ! -f .env.local ]; then echo "no .env.local here"; exit 1; fi

val() { grep -m1 "^$1=" .env.local | cut -d= -f2-; }

rm_var() { # name env
  vercel env rm "$1" "$2" -y --scope "$SCOPE" >/dev/null 2>&1 && echo "  removed $1 ($2)" || true
}

add_var() { # name env value
  if [ -z "${3:-}" ]; then echo "  SKIP    $1 ($2): empty in .env.local"; return; fi
  printf '%s' "$3" | vercel env add "$1" "$2" --scope "$SCOPE" >/dev/null 2>&1 \
    && echo "  added   $1 ($2)" || echo "  FAILED  $1 ($2)"
}

echo "1/3 removing dead Firebase + old OpenAI variables"
for n in NEXT_PUBLIC_FIREBASE_APP_ID NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID \
         NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET NEXT_PUBLIC_FIREBASE_PROJECT_ID \
         NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN NEXT_PUBLIC_FIREBASE_API_KEY \
         FIREBASE_PRIVATE_KEY FIREBASE_CLIENT_EMAIL FIREBASE_PROJECT_ID; do
  for e in development preview production; do rm_var "$n" "$e"; done
done

echo "2/3 replacing the app variables"
PUBLIC_VARS="NEXT_PUBLIC_SUPABASE_URL NEXT_PUBLIC_SUPABASE_ANON_KEY"
SECRET_VARS="SUPABASE_SERVICE_ROLE_KEY OPENAI_API_KEY"

for n in $PUBLIC_VARS; do
  for e in development preview production; do rm_var "$n" "$e"; done
  v="$(val "$n")"
  for e in development preview production; do add_var "$n" "$e" "$v"; done
done

for n in $SECRET_VARS; do
  for e in development preview production; do rm_var "$n" "$e"; done
  add_var "$n" production "$(val "$n")"
done

for e in development preview production; do
  rm_var AI_MONTHLY_CAP_USD "$e"
  rm_var ADMIN_EMAILS "$e"
done
add_var AI_MONTHLY_CAP_USD production "15"
add_var ADMIN_EMAILS production "alihomaei1997@gmail.com"

echo "3/3 result"
vercel env ls --scope "$SCOPE"
echo
echo "Next:  vercel deploy --prod --yes --scope $SCOPE"
