#!/bin/sh
# Vercel "Ignored Build Step" (vercel.json ignoreCommand, RAZ-886).
# Exit 1 = build, exit 0 = skip. Only production (main) builds: PR previews
# cost about half of all build minutes and CI is the merge gate anyway.
# Need a preview link for a PR? Put [preview] in that commit's message.
if [ "$VERCEL_ENV" = "production" ]; then
  echo "Production build."
  exit 1
fi
case "$VERCEL_GIT_COMMIT_MESSAGE" in
  *"[preview]"*)
    echo "Preview requested with [preview]."
    exit 1
    ;;
esac
echo "Skipping preview build (add [preview] to the commit message to get one)."
exit 0
