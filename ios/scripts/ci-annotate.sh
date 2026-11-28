#!/usr/bin/env bash
# Turns compiler and test errors from a build log into GitHub annotations,
# so failures are readable without downloading the job log.
# Usage: ios/scripts/ci-annotate.sh <logfile>
set -u
log="${1:?logfile}"
[ -f "$log" ] || { echo "::warning::Log $log fehlt"; exit 0; }
ws="${GITHUB_WORKSPACE:-$PWD}"
re='^(/[^:]+):([0-9]+):([0-9]+): (error|fatal error): (.*)$'
count=0
# Compiler errors (swiftc, xcodebuild) and failing tests (Swift Testing, XCTest).
grep -E '(error: |recorded an issue|with [0-9]+ issues?|Test Case .* failed|failed \(|Testing failed)' "$log" \
  | grep -v 'Testing passed' | awk '!seen[$0]++' | head -n 40 \
  | while IFS= read -r line; do
      count=$((count + 1))
      if [[ "$line" =~ $re ]]; then
        file="${BASH_REMATCH[1]#"$ws"/}"
        echo "::error file=$file,line=${BASH_REMATCH[2]},col=${BASH_REMATCH[3]}::${BASH_REMATCH[5]}"
      elif [ "$count" -le 10 ]; then
        echo "::error::${line:0:900}"
      else
        echo "$line"
      fi
    done
exit 0
