#!/bin/bash
isTesting=$2

# Check if the extension is already installed
if [ "${isTesting}" != 'true' ]; then
  if ! gh extension list | grep -q 'github/gh-models'; then
    gh extension install https://github.com/github/gh-models
  fi
fi

# Summarize issues update
summarize() {
  local update="$1"
  echo "$update" | gh models run gpt-4o-mini "Create a short one to two sentence summary for the update on a project initiative"
}

# Capture the output of the while loop
output=$(echo "$1" | jq -c '.[]' | while read -r issue; do
  update=$(echo "$issue" | jq -r '.update')
  if [ -n "${update}" ]; then
    if [ "${isTesting}" == 'true' ]; then
      summary=$(echo "$update summarized")
    else
      summary=$(summarize "${update}")
    fi
    issue=$(echo "${issue}" | jq --arg summary "${summary}" '. + {summary: $summary}')
  fi
  echo "${issue}"
done)

# Parse the captured output back into a JSON object
parsed_output=$(echo "$output" | jq -s '.')

# Use the parsed JSON object
echo "$parsed_output"
