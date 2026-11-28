#!/usr/bin/env bash
# Turns compiler and test errors from a build log into GitHub annotations,
# so failures are readable without downloading the job log.
# GitHub keeps at most 10 error annotations per step, so causes come first.
# Usage: ios/scripts/ci-annotate.sh <logfile>
set -u
log="${1:?logfile}"
[ -f "$log" ] || { echo "::warning::Log $log fehlt"; exit 0; }
ws="${GITHUB_WORKSPACE:-$PWD}"
re='^(/[^:]+):([0-9]+):([0-9]+): (error|fatal error): (.*)$'
{
  # 1. Causes: compiler errors and failed expectations.
  grep -E '(: error: |: fatal error: |recorded an issue|error: -\[|XCTAssert)' "$log"
  # 2. Summary lines only if nothing else matched.
  grep -E '(Test run with .* failed|Testing failed|\*\* TEST FAILED|\*\* BUILD FAILED)' "$log"
} | awk '!seen[$0]++' | head -n 12 \
  | while IFS= read -r line; do
      if [[ "$line" =~ $re ]]; then
        file="${BASH_REMATCH[1]#"$ws"/}"
        msg="${BASH_REMATCH[5]//%/%25}"
        echo "::error file=$file,line=${BASH_REMATCH[2]},col=${BASH_REMATCH[3]}::$msg"
      else
        # Long issue lines (struct dumps of a failed #expect) in chunks,
        # so the differing field is not cut off.
        line="${line//%/%25}"
        part=1
        while [ -n "$line" ] && [ "$part" -le 4 ]; do
          echo "::error::[$part] ${line:0:3000}"
          line="${line:3000}"
          part=$((part + 1))
        done
      fi
    done
exit 0
