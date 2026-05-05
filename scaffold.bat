@echo off
:: ==============================================================================
:: Multilingual Lecture Assistant - Project Scaffolding Script (Windows)
:: This script creates the directory structure and empty file placeholders.
:: ==============================================================================

echo Starting project scaffolding...

:: 1. Create Directory Structure
echo Creating directories...
if not exist "backend\modules" mkdir backend\modules
if not exist "backend\utils" mkdir backend\utils
if not exist "backend\uploads" mkdir backend\uploads
if not exist "frontend\src\components" mkdir frontend\src\components
if not exist "frontend\src\pages" mkdir frontend\src\pages
if not exist "frontend\public" mkdir frontend\public
if not exist "exports" mkdir exports
if not exist "outputs" mkdir outputs
if not exist "tests" mkdir tests

:: 2. Create Backend Files
echo Creating backend files...
type nul > backend\__init__.py
type nul > backend\modules\__init__.py
type nul > backend\utils\__init__.py
type nul > backend\app.py
type nul > backend\modules\transcriber.py
type nul > backend\modules\nlp_processor.py
type nul > backend\modules\language_detector.py
type nul > backend\modules\summarizer.py
type nul > backend\modules\translator.py
type nul > backend\modules\keyword_extractor.py
type nul > backend\modules\question_generator.py
type nul > backend\utils\audio_processor.py
type nul > backend\utils\db_handler.py
type nul > backend\utils\export_handler.py

:: 3. Create Root Configuration Files
echo Creating root configuration files...
type nul > config.py
type nul > requirements.txt
type nul > .env
type nul > .env.example
type nul > README.md

:: 4. Create Test Files
echo Creating test files...
type nul > tests\test_pipeline.py
type nul > tests\test_api.py

:: 5. Create Frontend Files
echo Creating frontend files...
type nul > frontend\src\App.jsx
type nul > frontend\src\index.js
type nul > frontend\src\App.css

:: Create 6 Components
type nul > frontend\src\components\Header.jsx
type nul > frontend\src\components\Footer.jsx
type nul > frontend\src\components\FileUploader.jsx
type nul > frontend\src\components\TranscriptDisplay.jsx
type nul > frontend\src\components\SummaryDisplay.jsx
type nul > frontend\src\components\QuestionDisplay.jsx

:: Create 2 Pages
type nul > frontend\src\pages\Home.jsx
type nul > frontend\src\pages\History.jsx

:: 6. Create .gitignore
echo Generating .gitignore...
(
echo # Environments
echo venv/
echo .env
echo.
echo # Python
echo __pycache__/
echo *.pyc
echo *.pyo
echo *.pyd
echo .pytest_cache/
echo.
echo # Project Specific
echo backend/uploads/*
echo !backend/uploads/.gitkeep
echo exports/ *
echo !exports/.gitkeep
echo outputs/ *
echo !outputs/.gitkeep
echo.
echo # Node/Frontend
echo node_modules/
echo dist/
echo .DS_Store
echo.
echo # IDEs
echo .vscode/
echo .idea/
) > .gitignore

:: 7. Add .gitkeep to empty folders
type nul > backend\uploads\.gitkeep
type nul > exports\.gitkeep
type nul > outputs\.gitkeep

echo ------------------------------------------------
echo Scaffold complete. All folders and files created.
echo ------------------------------------------------
pause
