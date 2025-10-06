#!/bin/bash

# Wait for models to be available
echo "Waiting for model files..."
while [ ! -f "notebook/suicide_mood_model.keras" ] || [ ! -f "notebook/suicide-text-model.keras" ]; do
    echo "Model files not found, waiting..."
    sleep 5
done

echo "Starting Suicide Detection API..."
python main.py
