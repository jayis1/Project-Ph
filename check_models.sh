#!/bin/bash

MODELS=("gemini-1.5-pro" "gemini-1.5-pro-001" "gemini-1.5-pro-latest" "gemini-1.5-flash" "gemini-pro")

echo "Testing Gemini Models..."
echo "----------------------"

# Source the .env file if it exists
if [ -f ~/.gemini/.env ]; then
  export $(grep -v '^#' ~/.gemini/.env | xargs)
fi

for model in "${MODELS[@]}"; do
  echo -n "Testing $model... "
  # Run gemini with a simple prompt. 
  # Using --no-stream (if available) or just piping output to null
  # Assuming 'gemini' is in PATH. 
  # We might need to handle the yolo flag or similar if prompted
  
  OUTPUT=$(gemini -p "hi" --model "$model" --yolo 2>&1)
  EXIT_CODE=$?
  
  if [ $EXIT_CODE -eq 0 ]; then
    echo "✅ SUCCESS"
  else
    echo "❌ FAILED (Code $EXIT_CODE)"
    # echo "Output: $OUTPUT" | head -n 2 
  fi
done
