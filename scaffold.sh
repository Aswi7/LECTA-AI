#!/bin/bash

# ==============================================================================
# Multilingual Lecture Assistant - Project Scaffolding Script (Linux/macOS)
# This script creates the directory structure and empty file placeholders.
# ==============================================================================

echo "Starting project scaffolding..."

# 1. Create Directory Structure
echo "Creating directories..."
mkdir -p backend/modules
mkdir -p backend/utils
mkdir -p backend/uploads
mkdir -p frontend/src/components
mkdir -p frontend/src/pages
mkdir -p frontend/public
mkdir -p exports
mkdir -p outputs
mkdir -p tests

# 2. Create Backend Files
echo "Creating backend files..."
touch backend/__init__.py
touch backend/modules/__init__.py
touch backend/utils/__init__.py
touch backend/app.py
touch backend/modules/transcriber.py
touch backend/modules/nlp_processor.py
touch backend/modules/language_detector.py
touch backend/modules/summarizer.py
touch backend/modules/translator.py
touch backend/modules/keyword_extractor.py
touch backend/modules/question_generator.py
touch backend/utils/audio_processor.py
touch backend/utils/db_handler.py
touch backend/utils/export_handler.py

# 3. Create Root Configuration Files
echo "Creating root configuration files..."
touch config.py
touch requirements.txt
touch .env
touch .env.example
touch README.md

# 4. Create Test Files
echo "Creating test files..."
touch tests/test_pipeline.py
touch tests/test_api.py

# 5. Create Frontend Files
echo "Creating frontend files..."
touch frontend/src/App.jsx
touch frontend/src/index.js
touch frontend/src/App.css

# Create 6 Components
touch frontend/src/components/Header.jsx
touch frontend/src/components/Footer.jsx
touch frontend/src/components/FileUploader.jsx
touch frontend/src/components/TranscriptDisplay.jsx
touch frontend/src/components/SummaryDisplay.jsx
touch frontend/src/components/QuestionDisplay.jsx

# Create 2 Pages
touch frontend/src/pages/Home.jsx
touch frontend/src/pages/History.jsx

# 6. Create .gitignore
echo "Generating .gitignore..."
cat <<EOF > .gitignore
# Environments
venv/
.env

# Python
__pycache__/
*.pyc
*.pyo
*.pyd
.pytest_cache/

# Project Specific
backend/uploads/*
!backend/uploads/.gitkeep
exports/*
!exports/.gitkeep
outputs/*
!outputs/.gitkeep

# Node/Frontend
node_modules/
dist/
.DS_Store

# IDEs
.vscode/
.idea/
EOF

# 7. Add .gitkeep to empty folders to ensure they are tracked if needed
touch backend/uploads/.gitkeep
touch exports/.gitkeep
touch outputs/.gitkeep

echo "------------------------------------------------"
echo "Scaffold complete. All folders and files created."
echo "------------------------------------------------"
