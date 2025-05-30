# Technical Design Document: Advisee Text-to-Speech Web Application

## 1. Introduction

### 1.1 Purpose

This document outlines the technical design of the Advisee Text-to-Speech (TTS) web application, which allows users to convert written text into spoken audio using Google's Text-to-Speech API. The application provides a simple, user-friendly interface, for generating high-quality audio from text input with multiple voice options.

### 1.2 Scope

The application's primary features include:

- Text input with clipboard paste functionality
- Male and female voice selection
- UTF-8 byte counting with limit enforcement
- Hyperlink detection and handling
- Text preprocessing for improved pronunciation
- Audio generation and download capabilities
- Support for text of any length through automatic chunking
- User authentication system
- Credit-based usage tracking
- Payment processing via Stripe
- Usage limits for free and anonymous users
- Anonymous user identification and tracking

### 1.3 Target Users

- Content creators requiring audio narration
- Accessibility applications
- Language learners practicing pronunciation
- Educators creating audio materials
- Free-tier users with limited daily needs
- Premium users requiring unlimited access

### 1.4 Desktop-First Development Strategy

The Advisee Text-to-Speech Application follows a strictly desktop-first development approach. Development focuses exclusively on optimizing the desktop experience. While the mobile version remains accessible, no further optimizations will be made for mobile-specific views. This approach allows us to:

- Focus development resources on providing the best possible desktop experience
- Simplify the codebase by reducing the need for responsive design considerations
- Rely on iOS Safari and other mobile browsers to handle mobile rendering as they see fit
- Direct users to the desktop version for the optimal experience via a notification banner

The application is extensively tested on desktop browsers (Chrome, Firefox, Edge, Safari) with large screen resolutions. Mobile access is maintained as a convenience but without dedicated optimizations or enhancements.

## 2. System Architecture:

### 2.1 Overview

The application follows a client-server architecture:

- **Frontend**: HTML, CSS, and JavaScript for the user interface
- **Backend**: Python Flask server for handling requests and interacting with the Google TTS API
- **Database**: PostgreSQL for storing user data and transaction records
- **External Services**:
  - Google Cloud Text-to-Speech API for speech synthesis
  - Stripe for payment processing

### 2.2 Architecture Diagram

```
┌─────────────┐     ┌───────────────┐     ┌────────────────────┐
│             │     │               │     │                    │
│  Web Client │───▶│  Flask Server │────▶│ Google TTS API     │
│  (Browser)  │◀───│               │◀────│                    │
│             │     │               │     │                    │
└─────────────┘     └───────┬───────┘     └────────────────────┘
                            │
                            │
                    ┌───────▼───────┐     ┌────────────────────┐
                    │               │     │                    │
                    │  PostgreSQL   │     │  Stripe API        │
                    │  Database     │     │  (Payments)        │
                    │               │     │                    │
                    └───────────────┘     └────────────────────┘
```

### 2.3 Development/Production Parity

The application is designed with perfect parity between development and production environments:

- The same codebase runs in both environments
- Environment-specific configurations are managed through environment variables
- PostgreSQL database is used in both environments
- Audio processing with FFmpeg is consistent across environments

### 2.4 Cross-Domain Session Management

The application implements robust session handling to manage the payment flow across domains:

- **Persistent Sessions**: Session data is preserved during external redirects to payment processors
- **SameSite Cookie Configuration**: Uses SameSite=Lax cookie attribute to maintain sessions during redirects
- **Session Backup**: Critical user data is stored in session for recovery after payment processing
- **Automatic Re-authentication**: Ability to restore user authentication state after returning from payment
- **Environment-Aware URLs**: Payment callback URLs are dynamically adjusted based on environment (test/production)

This approach ensures a seamless payment experience with no authentication loss during the payment flow.

## 3. Frontend Design

### 3.1 User Interface Components

- Text input area with character/byte counter
- Male/female voice selection buttons
- Generate Audio buttons with emoji indicators
- Paste and Clear buttons for text management
- **Undo button with history tracking and audio state persistence**
- Byte counter with warning/error states (using 891 bytes = 1 minute ratio for accurate time estimation)
- Audio playback section with download option
- User account section (login/register/credits)
- Payment processing interface for purchasing credits

### 3.2 Responsive Design

While the application initially featured a fully responsive design, the development strategy has shifted to prioritize desktop optimization:

- Desktop view (>768px): Fully optimized for desktop browsers with refined layout and styling
- Mobile view (≤768px): Basic access is maintained but with minimal optimizations
- A mobile recommendation banner informs users that the optimal experience is available on desktop
- Text and UI elements are sized appropriately for desktop screens
- Mobile view relies primarily on browser-native responsiveness

This desktop-first approach allows for more focused development and a more refined experience on the primary target platform. Users on mobile devices are encouraged to use a laptop or desktop computer for the full experience.

### 3.3 State Management

The application implements robust state management to ensure user work is never lost:

- **Text History**: Complete text editing history is maintained using localStorage
- **Audio State Preservation**: Audio generation state is preserved even after clearing the interface
- **Undo Functionality**: Users can undo text changes and restore audio player state
- **Cross-Page Persistence**: Content is preserved across page reloads and form submissions
- **Session Recovery**: Previous text and audio state can be restored after browser restart

The state management system is designed to:

- Preserve user work without requiring manual saves
- Allow recovery from accidental actions like clearing text
- Maintain proper history states for undo operations
- Persist audio generation results for access to generated files

### 3.4 CSS Framework

- Custom CSS styles without external dependencies
- Material Design-inspired color scheme:
  - Male button: Blue (#2196f3)
  - Female button: Green (#4caf50)
  - Download button: Purple (#9c27b0)

## 4. Backend System

### 4.1 Server Components

- Flask web framework
- Flask-Login for user authentication
- Flask-SQLAlchemy for database interaction
- Text preprocessing utilities
- Byte calculation service
- Google TTS API client integration
- Text chunking and audio merging components
- Stripe integration for payment processing

#### 4.1.1 Optimized Application Initialization

The application follows a streamlined initialization process:

- Fast startup with minimal database verification:
  - On application start, only a basic schema check is performed
  - Uses a single lightweight command: `python db_tools.py schema`
  - Additional database verification steps are deferred until needed
  - This approach prevents unnecessary startup delays, particularly after system restarts
- Environment variable loading is prioritized:
  - Critical configuration is loaded first to enable early validation
  - Non-critical configuration is loaded asynchronously
- Modular component initialization:
  - Core components initialize immediately
  - Secondary features initialize only when accessed
  - Reduces the startup overhead and memory footprint

### 4.2 Routes

- `/` - Main application page
- `/synthesize` - Endpoint for processing text and generating audio
- `/check_bytes` - Endpoint for calculating text byte size
- `/clear` - Endpoint for clearing the application state
- `/login` - User login
- `/register` - User registration
- `/logout` - User logout
- `/buy_credits` - Interface for purchasing credits
- `/create-payment-intent` - Stripe payment processing
- `/payment-success` - Payment confirmation

### 4.3 Dependencies

- Python 3.x
- Flask
- Flask-Login
- Flask-SQLAlchemy
- Google Cloud Text-to-Speech client library
- Pydub for audio processing and merging
- FFmpeg for audio file manipulation
- Stripe Python SDK
- psycopg2 for PostgreSQL connection
- Other Python packages as specified in requirements.txt

### 4.4 Database Client Tools

- **Primary Method**: Python database utility tool (`db_tools.py`) for PostgreSQL connection
- Provides a comprehensive command-line interface for database operations
- Multiple commands available for different database tasks:
  ```
  python db_tools.py                    # Show database info and all tables
  python db_tools.py schema [table]     # Show schema for specific table or all tables
  python db_tools.py users              # Show user information and credit balances
  python db_tools.py transactions [n]   # Show recent n transactions
  python db_tools.py anonymous          # Show anonymous usage statistics
  python db_tools.py stats              # Show overall system statistics
  ```
- Direct SQL commands can be executed programmatically using the utility functions:

  ```python
  from db_tools import execute_query, fetch_all, fetch_one

  # Connect and execute query
  execute_query("UPDATE user SET credits = credits + 10 WHERE id = 1")

  # Fetch data
  users = fetch_all("SELECT * FROM user")
  ```

- VS Code with PostgreSQL extension also provides database visualization and query capabilities

### 4.5 Stripe Payment Integration

The payment processing system utilizes Stripe for secure handling of credit card transactions:

- **Environment-Aware Configuration**:

  - Test mode uses current domain (localhost) for callbacks
  - Production mode uses the custom domain (advisee.ai)
  - Configuration detected automatically based on Stripe API keys

- **Robust Session Handling**:

  - Sessions are made permanent before redirecting to Stripe
  - Session data is preserved across domains using appropriate cookie attributes
  - User authentication state is recoverable even if session cookies are restricted

- **Dual Processing Paths**:

  - Client-side success URL handling (payment_success route)
  - Server-side webhook processing for asynchronous confirmation
  - Both paths update user credits and mark user as paid

- **Test Mode Protection**:
  - Special handling for test mode payments to maintain session state
  - Fallback mechanisms for test card payments
  - Comprehensive logging of payment flow states

This implementation ensures that users remain authenticated throughout the payment process and receive their purchased credits reliably in both test and production environments.

## 5. Database Design

### 5.1 Database Technology

- PostgreSQL is used exclusively in both development and production environments
- Connection is configured through environment variables:
  - `DATABASE_URL` for the PostgreSQL connection string
- Database access is provided through the `db_tools.py` utility and VS Code PostgreSQL extension

### 5.2 Data Models

#### User Model

```python
class User(db.Model, UserMixin):
    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.String(128), nullable=False)
    credits = db.Column(db.Float, default=0.0)  # Stored as float with 1 decimal precision
    daily_attempts = db.Column(db.Integer, default=0)  # Track daily synthesis attempts
    last_attempt_date = db.Column(db.Date, default=date.today)  # Last attempt date for reset
    is_paid_user = db.Column(db.Boolean, default=False)  # Premium status
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    # Relationship with transactions
    transactions = db.relationship('Transaction', backref='user', lazy=True)
```

#### AnonymousUsage Model

```python
class AnonymousUsage(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    ip_address = db.Column(db.String(45), nullable=False)  # IPv6 can be up to 45 chars
    cookie_id = db.Column(db.String(64), nullable=False)
    attempts = db.Column(db.Integer, default=0)
    last_attempt_date = db.Column(db.Date, default=date.today)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    __table_args__ = (db.UniqueConstraint('ip_address', 'cookie_id', name='uix_ip_cookie'),)
```

#### Transaction Model

```python
class Transaction(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    amount = db.Column(Numeric(10, 2), nullable=False)  # Number of credits with exactly 2 decimal places
    transaction_type = db.Column(db.String(20), nullable=False)  # 'purchase' or 'usage'
    stripe_payment_id = db.Column(db.String(100), nullable=True)  # For purchases
    text_length = db.Column(db.Integer, nullable=True)  # For usage
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def __repr__(self):
        return f'<Transaction {self.id}: {self.transaction_type} {self.amount:.2f} credits>'
```

### 5.3 Database Schema Upgrades

#### Decimal Precision Management (Implemented March 2025)

- The `Transaction.amount` column was upgraded from `db.Float` to `Numeric(10, 2)` type
- This ensures all transaction amounts are stored with exactly 2 decimal places (e.g., `90.00`, `-3.22`)
- Change was implemented with the following SQL commands:

  ```sql
  ALTER TABLE transaction
  ALTER COLUMN amount TYPE numeric(10,2);

  UPDATE transaction
  SET amount = CAST(amount AS numeric(10,2));
  ```

- Python model was updated to match this change:

  ```python
  # Import the Numeric type
  from sqlalchemy import Numeric

  # In Transaction model
  amount = db.Column(Numeric(10, 2), nullable=False)
  ```

- This update ensures consistent decimal representation in database while maintaining the same user experience

#### Migration Files Management

- Migration script system for schema updates
- All migrations are stored in the dedicated `migrations/` directory for better organization
- Key migration files include:
  - `migrate_credits_to_float.py`: Converts integer credits to float with 1 decimal place
  - `update_transaction_decimals.py`: Updates transaction amounts to use exact 2-decimal precision
  - `add_migration_history_table.py`: Creates a table to track executed migrations
  - `update_user_credits_precision.py`: Standardizes credit precision across all user accounts
- Each migration includes validation steps to ensure data integrity
- Backup tables created before migrations with naming convention `table_name_backup_YYYYMMDD`
- Verification of changes post-migration using the database utility
- Direct SQL schema alterations executed through the database utility:

  ```python
  from db_tools import execute_query

  execute_query("ALTER TABLE transaction ALTER COLUMN amount TYPE numeric(10,2);")
  ```

- Rollback procedures are included for reverting migrations if needed:

  ```sql
  -- Example rollback for credits-to-float migration
  -- Drop current tables
  DROP TABLE "transaction";
  DROP TABLE "user";

  -- Rename backup tables
  ALTER TABLE user_backup RENAME TO "user";
  ALTER TABLE transaction_backup RENAME TO "transaction";
  ```

- Migration logging system records all changes with timestamps and execution details
- Standard process for executing migrations:
  1. Development and testing in local environment
  2. Backup of production database
  3. Execution of migration in production
  4. Verification of changes
  5. Update of migration history record

### 5.4 Database Initialization

Database initialization is handled through the `init_db.py` script, which:

- Creates the database schema if it doesn't exist
- Uses environment variables to connect to the PostgreSQL database
- Can be run in both development and production environments

#### 5.4.1 Optimized Startup Verification

The application implements a streamlined database verification process on startup:

- Instead of running comprehensive validation tests, a single schema check is performed:

  ```python
  # Verify database connection and schema with a single command
  import subprocess

  def verify_database():
      """Quick database verification using simplified schema check"""
      try:
          # Use db_tools.py utility for schema verification only
          result = subprocess.run(["python", "db_tools.py", "schema"],
                                 capture_output=True, text=True, timeout=5)
          return result.returncode == 0
      except Exception as e:
          logger.error(f"Database verification error: {e}")
          return False
  ```

- This approach eliminates unnecessary verification steps that can slow down startup
- If this fast check succeeds, the application proceeds normally without additional tests
- Full verification is only performed when explicitly requested by an administrator
- This significantly improves startup times, especially after system restarts or new sessions

## 6. Data Flow

### 6.1 Text Input Processing

1. User enters text or pastes content
2. JavaScript processes the text client-side:
   - Hyperlink detection
   - Real-time byte counting
   - Special character preprocessing (e.g., replacing "&" with "and")
   - Special text formatting (e.g., replacing "(AI)" with "AI,")
3. Visual feedback is provided:
   - Hyperlink notification when links are detected
   - Warning when approaching the 5000-byte limit
   - Information about chunking when the 5000-byte limit is exceeded

### 6.2 Audio Generation

1. User selects male or female voice and clicks "Generate Audio"
2. Client sends form data to the server
3. Server processes the text:
   - Final text preprocessing
   - Byte limit verification
   - Text chunking if the 5000-byte limit is exceeded
   - Credit deduction from user's account
4. For standard-length text (under 5000 bytes):
   - Server makes a single request to Google TTS API
   - Audio file is generated and stored temporarily
5. For long text (over 5000 bytes):
   - Text is split into multiple chunks, each under 4500 bytes
   - Multiple requests are made to Google TTS API, one for each chunk
   - Individual audio segments are merged into a single file using pydub
6. User is redirected to the main page with audio playback controls

### 6.2.1 Celery Task URL Generation (Local Development / No S3)

When S3 is not configured (typically in local development), the audio files generated by the Celery task (`build_audio_task`) are served as static files from the Flask application. Correctly generating the URL for these files from within the Celery task context is critical.

- **Problem**: Celery tasks run in a separate context from Flask HTTP requests. If `url_for` is used naively within the Celery task to generate an external URL for a static file, it may:

  - Lack the correct server name and scheme (e.g., `http://localhost:3000`).
  - Generate a relative path (e.g., `/static/processed/audio.mp3`) which is unusable if the client expects an absolute URL.
  - Or, if `SERVER_NAME` is not set or is `localhost`, it might generate a URL based on `localhost` which won't work if the user is accessing the app via an IP address.
    This led to issues like 0-second audio players or `GET http://<host>/null` errors because the frontend received an invalid or incomplete URL for the audio file.

- **Diagnostic Steps**:

  - Logging within the Celery task revealed that the `file_url` being generated was incorrect or incomplete.
  - Attempts to use `url_for(..., _external=True)` directly in the Celery task were problematic without the proper application context or `SERVER_NAME` configuration that aligns with all possible access methods (localhost, IP).

- **Solution**:
  1.  **Pass Base URL to Task**: The `request.host_url` (e.g., `http://10.0.0.67:3000/` or `http://localhost:3000/`) from the original HTTP request context (in the `/synthesize` route) is passed as a `request_base_url` parameter to the `build_audio_task.delay()` Celery call.
  2.  **Construct URL Manually in Task**: Inside the Celery task (`build_audio_task` in `app.py`), when S3 is not configured: - A relative path for the static audio file is constructed manually: `relative_url = f"/static/processed/{output_filename}"`. - This `relative_url` is then prepended with the `request_base_url` (after stripping any trailing slashes from `request_base_url`) to form an absolute URL: `file_url = f"{request_base_url.rstrip('/')}{relative_url}"`.
      This ensures the `file_url` returned by the Celery task to the frontend is an absolute URL that correctly reflects how the user accessed the application (e.g., via IP or localhost), allowing the audio player to fetch the file.

### 6.3 Audio Playback

1. Audio player is displayed with controls
2. Download link is provided for saving the MP3 file
3. Random query parameter is added to prevent browser caching

### 6.4 Credit System Flow

1. User registers/logs in to access the credit system
2. Credits are displayed on the main page
3. User purchases credits through the Stripe integration
4. Credits are deducted when generating audio (calculated by text length)
5. Transaction history is recorded in the database with exact 2-decimal precision
6. Database transactions can be monitored and managed directly through the database utility or VS Code extension

## 7. Text Processing Features

### 7.1 Text Preprocessing

- Replacing "&" with "and" for better pronunciation
- Processing the special case of "(AI)" to "AI," for proper pronunciation
- Stripping Markdown formatting from pasted content
- Preserving paragraph structure from HTML content

### 7.2 Hyperlink Handling

- Detection of URLs in the text input
- Displaying notification when hyperlinks are present
- Preserving the notification for large chunked texts

### 7.3 HTML Content Processing

- Extracting text from HTML while preserving structure
- Handling ordered and unordered lists
- Preserving paragraph breaks
- Removing script tags and embedded media

## 8. Byte Limit Implementation

### 8.1 Byte Calculation

- Server-side calculation of UTF-8 byte count
- Estimation of SSML overhead
- Real-time feedback through AJAX requests

### 8.2 Text Chunking System

- Smart text chunking algorithm that preserves word boundaries
- Maximum chunk size of 4500 bytes to leave room for SSML tags
- Word-aware chunking to avoid splitting in the middle of words

### 8.3 User Interface for Large Texts

- Visual indication when text will be chunked
- Buttons remain enabled for large texts
- Transparent processing that doesn't require user intervention

## 9. Google TTS API Integration

### 9.1 Voice Selection

- Male voice: en-US-Wavenet-D
- Female voice: en-US-Wavenet-F
- Default voice settings:
  - Speaking rate: 0.95
  - Pitch: 0
  - Volume gain: 0

### 9.2 Voice Marker System

- Support for "mmm" and "fff" markers anywhere within the text, not just at paragraph beginnings
- Intelligent marker detection that preserves text around markers while switching voices
- Standalone markers can be used to set voice for subsequent content
- Automatic voice switching based on markers with seamless audio transitions
- Information modal explaining marker usage
- Enhanced parsing algorithm that accurately separates text into segments based on marker positions

### 9.3 Audio Configuration

- High-quality MP3 audio format (128 kbps)
- Enhanced audio fidelity with "headphone-class-device" effects profile
- Higher sample rate (24000 Hz) for improved clarity
- Consistent 128 kbps quality maintained across:
  - Single voice generation
  - Multi-voice marker segments
  - Long text chunking and merging
  - Downloaded MP3 files
- Premium audio quality parameters for FFmpeg (-q:a 0)
- Seamless audio segment transitions when merging multiple voices

## 10. Audio Chunking and Merging

### 10.1 Chunking Process

- Text is split into chunks based on word boundaries
- Each chunk is processed to create standalone SSML
- Individual API calls are made for each chunk
- Progress tracking for multi-chunk processing

### 10.2 Audio Merging

- Pydub library used for audio processing
- Individual MP3 chunks are loaded into AudioSegments
- Segments are concatenated to create a single continuous audio file
- Final merged audio maintains consistent quality and flow

## 11. User Authentication System

### 11.1 Registration and Login

- Email-based registration
- Secure password hashing using Werkzeug
- Flask-Login for session management
- Remember me functionality

### 11.2 Authorization Controls

- Protected routes for authenticated users
- Limit on text length for non-authenticated users
- Role-based permission system for potential future admin features

## 12. Credit System

### 12.1 Credit Calculation

- Credits represent available minutes of audio
- Each 891 bytes of text requires 1 minute of credit (revised from 1500 bytes)
- Credits are deducted after successful audio generation
- Minimum credit deduction of 0.1 minutes per synthesis
- Credit calculation:
  - `required_credits = max(0.1, byte_count / 891)`
  - Credits are rounded to 1 decimal place
- Credit purchase options:
  - 5 minutes: $1 (Mini package)
  - 30 minutes: $5 (Small package)
  - 90 minutes: $10 (Medium package)
  - 300 minutes: $25 (Large package)

### 12.2 Credit Purchase

- Integration with Stripe for secure payments
- Multiple credit package options
- Successful payments trigger automatic credit addition
- Transaction history for both purchases and usage
- All transactions are recorded with exactly 2 decimal place precision

## 13. Stripe Integration

### 13.1 Payment Processing

- Secure payment form using Stripe Elements
- Server-side payment intent creation
- Webhook handling for payment confirmation
- Error handling for failed payments

### 13.2 Security Measures

- No storage of payment card details
- Stripe.js for secure element rendering
- HTTPS enforcement for all payment interactions
- Idempotency keys to prevent duplicate charges

### 13.3 Environment Configuration

- Separate TEST and LIVE environments controlled by APP_MODE variable in .env
- Local development always uses TEST mode with test keys
- Production environment (Heroku) always uses LIVE mode with live keys
- name of the project in heroku dashboard is: advisee-tts
- Only admin users (sasan345@gmail.com) can see the current mode in the UI
- TEST mode processes test cards only (like 4242 4242 4242 4242)
- LIVE mode processes real credit cards and charges actual money
- Environment separation ensures developers can test without affecting production
- Strict configuration prevents accidental test/live mode switching in production
- Environment variables in Heroku control production mode independently from code repository

## 14. Security Considerations

### 14.1 Input Validation

- Server-side validation of text input
- Sanitization of user input for API calls
- Validation of voice parameters
- CSRF protection using Flask's built-in mechanisms

### 14.2 Authentication Security

- Secure password storage with salted hashing
- Rate limiting for login attempts
- Secure session handling
- HTTPS enforcement

### 14.3 API Key Security

- Environment variable storage for sensitive keys
- API key rotation policies
- Restricted API key permissions
- No exposure of keys to client-side code

## 15. Error Handling

### 15.1 User-Facing Errors

- Friendly error messages with clear instructions
- Flash messages for form validation errors
- Visual feedback for payment processing errors
- Clear guidance for resolving common issues

### 15.2 Server-Side Error Handling

- Comprehensive try-except blocks
- Detailed logging with different severity levels
- Graceful fallbacks for API failures
- Error reporting and monitoring

## 16. Deployment and DevOps

### 16.0.1 Version Control Considerations (.gitignore)

To maintain a clean repository and avoid committing generated or sensitive files, the project's `.gitignore` file should be kept up-to-date. Key considerations include:

- **Generated Assets**: Files generated during runtime, such as processed audio files, should be ignored. For example, `static/processed/*.mp3` has been added to `.gitignore` to prevent synthesized MP3 files from being tracked by Git.
- **Environment Files**: The `.env` file, which contains environment-specific configurations and sensitive credentials (API keys, database URLs), must always be included in `.gitignore` to prevent accidental commits.
- **Virtual Environments**: Python virtual environment directories (e.g., `.venv/`, `env/`) should be ignored.
- **IDE/Editor Specific Files**: Common IDE or editor-specific configuration files/directories (e.g., `.vscode/`, `.idea/`) are often ignored.

Regularly reviewing and updating `.gitignore` is important as the project evolves and new types of generated files or sensitive configurations are introduced.

### 16.0 Initial Local Setup Instructions

This section outlines the steps required to set up and run the Advisee TTS application for the first time on a new local development machine.

1.  **Prerequisites:**

    - Python 3.x installed (check with `python --version` or `python3 --version`).
    - Git installed (check with `git --version`).
    - PostgreSQL server installed and running. You'll need to be able to create a new database.

2.  **Clone the Repository:**
    Open your terminal or command prompt and navigate to the directory where you want to store the project. Then, clone the repository:

    ```bash
    git clone <repository-url>
    cd <repository-directory>
    ```

    Replace `<repository-url>` with the actual URL of the Git repository and `<repository-directory>` with the name of the folder created by cloning (it's usually the project name).

3.  **Create and Activate a Python Virtual Environment (Highly Recommended):**
    A virtual environment keeps your project's dependencies isolated from other Python projects and your global Python installation.

        ```bash
        python -m venv .venv
        ```

        This command creates a directory named `.venv` (or any name you prefer, e.g., `env`) in your project folder. To activate it:

        - On Windows (Command Prompt or PowerShell):
          ```bash
          .venv\Scripts\activate
          ```
        - On macOS/Linux (bash/zsh):
          `bash

    source .venv/bin/activate
    `      Your terminal prompt should change to indicate that the virtual environment is active (e.g.,`(.venv) Your-PC:...`).

4.  **Configure Environment Variables:**

    - The application uses a `.env` file to manage environment-specific configurations. Create this file in the root project directory (the same directory where `localhost.py` and `requirements.txt` are located).
    - Populate the `.env` file with the necessary environment variables. Refer to existing documentation sections for details (e.g., section 13.3 for `APP_MODE` and Stripe keys, section 5.1 for `DATABASE_URL`). Key variables include:

      - `DATABASE_URL`: The connection string for your PostgreSQL database. Example: `postgresql://youruser:yourpassword@localhost:5432/advisee_db`. Ensure the specified database (e.g., `advisee_db`) has been created in your PostgreSQL server.
      - `GOOGLE_APPLICATION_CREDENTIALS`: The absolute path to your Google Cloud service account key JSON file, which is required for Text-to-Speech API access.
      - `STRIPE_SECRET_KEY` and `STRIPE_PUBLISHABLE_KEY`: Your Stripe API keys. For local development, use your Stripe **test** keys.
      - `FLASK_SECRET_KEY`: A strong, random secret key for Flask session management. You can generate one by running `python -c "import secrets; print(secrets.token_hex(16))"` in your terminal and pasting the output.
      - `ENV_MODE`: Set to `development`. This enables Flask's debug mode and other development-friendly features, as detailed in section 4.1.1 and utilized by `localhost.py`.
      - `APP_MODE`: Set to `TEST`. This ensures Stripe integration operates in test mode for local development (see section 13.3).
      - `PORT` (Optional): Defaults to `3000` if not set. You can specify a different port if needed (e.g., `PORT=3001`).

    - Example `.env` file content:
      ```env
      DATABASE_URL="postgresql://postgres:yourpassword@localhost:5432/advisee_db"
      GOOGLE_APPLICATION_CREDENTIALS="C:/Users/YourUser/path/to/your/google-cloud-credentials.json" # Use absolute paths
      STRIPE_SECRET_KEY="sk_test_YOUR_STRIPE_TEST_SECRET_KEY_HERE"
      STRIPE_PUBLISHABLE_KEY="pk_test_YOUR_STRIPE_TEST_PUBLISHABLE_KEY_HERE"
      FLASK_SECRET_KEY="your_generated_strong_random_secret_key_here"
      ENV_MODE="development"
      APP_MODE="TEST"
      # PORT=3000
      ```
    - **Security Note**: Ensure the `.env` file is added to your project's `.gitignore` file to prevent committing sensitive credentials to version control.

5.  **Install Dependencies (Python Packages and FFmpeg):**

    - The **recommended method** is to use the `localhost.py` script. This script not only installs Python packages from `requirements.txt` but also includes checks and setup for other dependencies like FFmpeg (as mentioned in sections 1.1, 4.3, and its usage in `localhost.py`). From your project root, with the virtual environment activated, run:
      ```bash
      python localhost.py
      ```
      This command executes the `setup_application()` function (typically located in `Python/install_requirements.py`), which handles the comprehensive setup. If FFmpeg is not found on your system, the script should provide guidance. You may need to install FFmpeg separately from its official website and ensure it's added to your system's PATH.
    - Alternatively, if you want to install _only_ the Python packages listed in `requirements.txt` manually (note: this will skip the FFmpeg check and other setup steps that `setup_application` might perform):
      ```bash
      pip install -r requirements.txt
      ```

6.  **Initialize the Database:**

    - First, ensure your PostgreSQL server is running and that you have created the empty database that you specified in the `DATABASE_URL` environment variable (e.g., `advisee_db`).
    - Then, run the database initialization script. This script will create the necessary tables and schema within your database, as defined in "5. Database Design" and mentioned in section 5.4.
      ```bash
      python init_db.py
      ```
    - After initialization, you can verify the database schema using the `db_tools.py` utility, as noted in sections 5.4.1 and 16.3.1:
      ```bash
      python db_tools.py schema
      ```

7.  **Run the Application:**
    - With all dependencies installed, environment variables configured, and the database initialized, you can start the local development server:
      ```bash
      python localhost.py
      ```
    - If you opted for manual dependency installation in step 5 and want to skip the automatic installation check when starting the server, you can use the `--skip-install` flag:
      ```bash
      python localhost.py --skip-install
      ```
    - The application should now be running. Open your web browser and navigate to `http://localhost:3000` (or the port specified by your `PORT` environment variable, as used in `localhost.py`). The development server usually includes features like hot reloading, which automatically updates the application in your browser when you save code changes.

This setup process ensures that your local environment is correctly configured to run and develop the Advisee TTS application.

### 16.1 Development/Production Parity

- Identical codebase for both environments
- Environment-specific configuration via environment variables
- PostgreSQL database used consistently across environments
- Single server script (`server.py`) for both environments
- Python database utility scripts for reliable database management in all environments

### 16.1.1 Local Development Server Accessibility

A key consideration for the local development environment is how the Flask application's `SERVER_NAME` configuration impacts accessibility, particularly when trying to access the server from other devices on the local network (e.g., via its IP address like `http://10.0.0.67:3000`) in addition to `http://localhost:3000`.

- **Issue**: If `app.config['SERVER_NAME']` is explicitly set to `'localhost:<port>'` (e.g., `'localhost:3000'`), Flask's routing can become strict. While `http://localhost:3000` will work, attempts to access the server using its local IP address might result in 404 Not Found errors. This is because the Host header of the incoming request (e.g., `10.0.0.67:3000`) does not match the configured `SERVER_NAME`.
- **Diagnostic Steps**:
  - This issue was diagnosed by temporarily commenting out the `app.config['SERVER_NAME']` line in `app.py` for the development environment block to ensure accessibility via IP address.
  - Bypassing `livereload` (used in `localhost.py`) and running the Flask app directly with `app.run(host='0.0.0.0', port=port)` also helped isolate the issue to Flask's configuration rather than the `livereload` proxy, though `livereload` itself generally respects the underlying Flask app's serving behavior.
- **Solution/Recommendation**:
  - For local development, if access via IP address is required (e.g., for testing on other devices), it's recommended to **not set `app.config['SERVER_NAME']`**. Flask will then be more lenient with the Host header.
  - Alternatively, if `SERVER_NAME` must be set for other reasons (e.g., `url_for` behavior with `_external=True`), ensure it's configured appropriately or manage URL generation carefully.
  - In the production environment, `SERVER_NAME` should be set to the correct public domain name (e.g., `advisee.ai`) for security and proper URL generation.
- **Current Configuration**: The `app.py` file has been modified to comment out the `app.config['SERVER_NAME']` line for the development environment block to ensure accessibility via IP address.

### 16.2 Heroku Deployment

- Procfile configuration for Heroku
- PostgreSQL addon integration
- Environment variable management through Heroku dashboard
- Buildpack configuration for FFmpeg support

### 16.3 Database Administration

- Unified database utility tool (`db_tools.py`) is the primary method for database access
- Database utility provides consistent access pattern with comprehensive command-line interface:

  ```
  # Show user credit balances
  python db_tools.py users

  # View transaction history
  python db_tools.py transactions 20

  # See system statistics
  python db_tools.py stats
  ```

- Programmatic access via import:

  ```python
  from db_tools import execute_query, fetch_all

  # Execute query
  execute_query("UPDATE user SET credits = credits + 10 WHERE id = 1")

  # Fetch data
  users = fetch_all("SELECT * FROM user")
  ```

- VS Code PostgreSQL extension configured for database visualization and management
- Heroku CLI commands available for database operations:
  ```
  heroku pg:info --app advisee-tts
  ```

### 16.3.1 Simplified Database Verification

- Minimal database verification on startup to improve load times:
  - Single schema verification command used for quick validation: `python db_tools.py schema`
  - Successful schema retrieval confirms database connectivity and structure
  - Extensive verification tests (user counting, transaction validation, etc.) are only run when actually needed, not on every startup
  - This approach significantly reduces startup time, especially on first run after computer restart or new session
- Database connection pooling implemented to reduce connection overhead:
  - Connection pool establishes minimal required connections
  - Connections are reused across requests
  - Avoids unnecessary reconnection delays
- Lazy-loading pattern for database statistics:
  - Details about users, transactions, and anonymous usage are only fetched when explicitly requested
  - Dashboard statistics are loaded asynchronously after initial page load
  - This prevents database bottlenecks during application startup

### 16.4 Continuous Integration

- GitHub repository for version control
- Potential for automated testing setup
- Release management process

### 16.5 Database Migrations

- Migration script system for schema updates
- All migrations are stored in the dedicated `migrations/` directory for better organization
- Key migration files include:
  - `migrate_credits_to_float.py`: Converts integer credits to float with 1 decimal place
  - `update_transaction_decimals.py`: Updates transaction amounts to use exact 2-decimal precision
  - `add_migration_history_table.py`: Creates a table to track executed migrations
  - `update_user_credits_precision.py`: Standardizes credit precision across all user accounts
- Each migration includes validation steps to ensure data integrity
- Backup tables created before migrations with naming convention `table_name_backup_YYYYMMDD`
- Verification of changes post-migration using the database utility
- Direct SQL schema alterations executed through the database utility:

  ```python
  from db_tools import execute_query

  execute_query("ALTER TABLE transaction ALTER COLUMN amount TYPE numeric(10,2);")
  ```

- Rollback procedures are included for reverting migrations if needed:

  ```sql
  -- Example rollback for credits-to-float migration
  -- Drop current tables
  DROP TABLE "transaction";
  DROP TABLE "user";

  -- Rename backup tables
  ALTER TABLE user_backup RENAME TO "user";
  ALTER TABLE transaction_backup RENAME TO "transaction";
  ```

- Migration logging system records all changes with timestamps and execution details
- Standard process for executing migrations:
  1. Development and testing in local environment
  2. Backup of production database
  3. Execution of migration in production
  4. Verification of changes
  5. Update of migration history record

## 17. Future Enhancements

### 17.1 Feature Roadmap

- Additional voice options
- Language selection beyond English
- Advanced SSML tag editor
- Batch processing of multiple texts
- Enhanced audio quality options
- Voice parameter adjustments (pitch, rate, etc.)
- Desktop-optimized keyboard shortcuts and UI refinements

### 17.2 Technical Improvements

- ✓ Database schema enhancement for float credit values (implemented)
- ✓ Transaction amount precision standardization to exactly 2 decimal places (implemented)
- ✓ Unified database access through Python utilities (implemented)
- ✓ Focus shifted to desktop-only optimization (implemented)
- ✓ Enhanced voice marker system to support markers anywhere in text (implemented)
- ✓ Upgraded audio quality to high-fidelity 128 kbps across all outputs (implemented)
- Caching system for frequently generated audio
- Enhanced analytics for usage patterns
- Improved chunking algorithms for better audio transitions
- Advanced desktop UI features, including keyboard shortcuts and drag-and-drop functionality

## 18. Recent Updates

### 18.1 Usage Tracking

- Added comprehensive usage tracking for both anonymous and authenticated users
- Anonymous tracking implemented through IP address and cookie identification
- Registered user tracking with detailed usage statistics
- Usage data stored in dedicated database tables for analytics and limit enforcement
- Admin dashboard for monitoring usage patterns and user activity

### 18.2 Stripe Environment Separation

- Implemented strict separation between TEST and LIVE modes for Stripe integration
- Environment modes controlled through APP_MODE variable in configuration
- LOCAL development always uses TEST mode with test keys
- PRODUCTION environment on Heroku always uses LIVE mode with live keys
- Secure handling of payment credentials across environments
- Test transactions processed with test cards (4242 4242 4242 4242)
- Live mode processes real credit cards with actual charges

### 18.3 Voice System and Audio Quality

- Enhanced voice marker system allowing "mmm" and "fff" markers to be placed anywhere in text
- Upgraded all audio output to high-fidelity 128 kbps (previously 32 kbps)
- Improved audio clarity and definition with enhanced TTS API configuration
- Seamless voice transitions in multi-voice content
- Consistent high-quality audio across all outputs and use cases

## 19. Conclusion

The Advisee Text-to-Speech application provides a robust solution for converting text to speech with user-friendly controls, advanced features, and a sustainable business model through the credit system. The architecture maintains perfect parity between development and production environments, ensuring consistent behavior and simplifying maintenance.

With the strategic shift to desktop-focused development, the application now delivers an optimized experience for its primary use case - users who need high-quality text-to-speech conversion in a desktop environment. While maintaining basic accessibility on mobile devices, this focused approach allows for more refined features and interfaces tailored to desktop users.

Database management has been enhanced with standardized decimal precision and direct access tools, providing more robust data handling capabilities while maintaining a seamless user experience.

## 20. Usage Limits System

### 20.1 Free User Limits

- Registered free users limited to 5 audio generation attempts per day
- Anonymous users limited to 7 short content generations per day
  - Short content is defined as text that generates approximately 5 minutes or less of audio
  - Text with 1000-1500 characters (roughly 200-300 words) typically produces about 1 minute of audio
  - This allows anonymous users to test the service with reasonable-length samples
- Premium users (paid accounts) have unlimited synthesis attempts
- Daily attempt counters reset at midnight UTC

### 20.2 Anonymous User Identification

- Anonymous users are identified using a combination of:
  - IP address: Stored in a hashed format for privacy
  - Cookie ID: Generated randomly and stored in the user's browser
- Anonymous usage data is stored in the AnonymousUsage table
- Cookie expires after 30 days, but IP tracking maintains usage restrictions

### 20.3 Upgrade Path

- Clear messaging when limits are reached
- "Log in for more!" prompt for anonymous users
- "Upgrade to unlimited usage" prompt for registered free users
- Seamless path to registration or purchasing credits

### 20.4 Implementation Details

- Helper functions in app.py to check limits before synthesis
- Automatic attempt counter increments after successful synthesis
- Daily reset logic based on tracking the last attempt date
- User-friendly messaging when limits are reached
- Consistent formatting of remaining attempts across all routes
- Display enhancement with "FREE" label for free tier usage
- Clickable login prompt for anonymous users with CSS styling

### 20.5 Developer Testing Utilities

- Dedicated utility for testing the limits system:

  - `db_tools.py reset-admin`: Resets admin free daily usage
    in localhost Terminal for anonymous user Put: python Python/db_tools.py reset-admin

- This utility allows developers to:
  - Test anonymous user flows without clearing browser cookies
  - Verify user experience across different usage counts
  - Check limit enforcement logic
  - Reset the system to a known state for UI testing
- Example usage:

  ```


  ```

- The utility implements verification checks to ensure changes are applied correctly

## 21. Stripe Integration Updates

### 21.1 New Pricing Tiers

- Simplified pricing structure with clear value proposition:
  - $1 for 5 minutes (entry-level option)
  - $10 for 90 minutes (11¢ per minute, 33% savings)
  - $25 for 300 minutes (8¢ per minute, 50% savings)
- Removed $5 tier to streamline purchasing options

### 21.2 Security Enhancements

- Migration to live mode for production transactions
- Restricted API key permissions for improved security
- Environment variable management for sensitive credentials
- Proper error handling for payment processing

## 22. Conclusion

The Advisee Text-to-Speech application has been enhanced with a robust usage limits system that creates a clear differentiation between anonymous users, registered free users, and premium paid users. This freemium model ensures the service remains accessible to casual users while encouraging upgrades to premium tiers for those requiring additional functionality. The implementation maintains a balance between user experience and business sustainability, with clear upgrade paths and intuitive messaging throughout the user journey.

Recent updates to display formatting and pricing tiers have further improved the user experience, making credit usage clearer and purchasing options more streamlined. The application continues to evolve with a focus on desktop-optimized experiences, providing professional-grade text-to-speech capabilities with an intuitive interface.

### 22.1 Performance Optimizations

Recent performance enhancements have significantly improved the application's startup time and overall responsiveness:

- Simplified database verification on startup:
  - Eliminates unnecessary database checks during initialization
  - Uses a single schema verification command (`python db_tools.py schema`) for quick validation
  - Reduces startup time by up to 80%, especially after system restarts or in new sessions
  - Comprehensive verification runs only when explicitly requested
- Lazy-loading of non-critical components:
  - Statistics and reporting features load only when requested
  - Dashboard metrics populate asynchronously after page render
  - User data fetched on-demand rather than during application startup
- These improvements create a more responsive experience across all devices while maintaining the desktop-first optimization focus

### 22.2 Audio Quality Enhancements

The application has been updated with significant audio quality improvements:

- All audio output upgraded to premium 128 kbps quality (previously 32 kbps)
- Enhanced audio configuration in Google TTS API requests:
  - Upgraded from "small-bluetooth-speaker-class-device" to "headphone-class-device" effects profile
  - Increased sample rate to 24000 Hz for improved clarity and definition
- Optimized audio processing pipeline:
  - Consistent high-quality export parameters throughout the application
  - Premium FFmpeg quality settings (-q:a 0) for all merged audio
  - Explicit bitrate specification for both streaming and downloadable content
- Voice marker implementation enhanced to maintain quality:
  - Multi-voice segments preserve 128 kbps quality during merging
  - Seamless transitions between different voice segments
  - Consistent audio quality regardless of voice switching
- These enhancements deliver professional-grade audio output suitable for content creation, making the application competitive with industry-standard TTS solutions

### 22.3 Credit System Improvements

Recent updates have fixed and enhanced the credit system to ensure proper credit deduction for all user types:

- Fixed logical issue in credit deduction workflow:
  - All users now correctly have credits deducted when generating audio, including paid users
  - Previously, paid users were incorrectly exempted from credit deduction
  - More robust credit calculation and transaction recording system implemented
- Enhanced credit display functionality:
  - Real-time credit updates visible immediately after generation
  - Visual feedback (color animation) when credit values change
  - Consistent decimal precision based on credit amount (whole numbers for ≥1.0, one decimal for <1.0)
- More reliable credit processing:
  - Direct SQL updates for transaction consistency
  - Multiple verification steps to ensure credit deductions are accurately recorded
  - Comprehensive logging for troubleshooting and audit purposes
  - Explicit handling of floating-point precision issues
- Revised user experience:
  - Clear visual indication of current credit balance
  - Immediate feedback when credits are consumed
  - Streamlined upgrade path for users with insufficient credits

### 22.4 JavaScript Enhancements

The application now features enhanced JavaScript functionality:

- Modular JS organization with dedicated files for specific functionality:
  - `text-processor.js` - Handles text preparation and parsing
  - `tts.js` - Manages credit display and audio generation UI
- New Time_Estimator function:
  - Provides real-time estimation of audio duration based on text length
  - Uses a calculation based on character-to-speech ratio (approximately 15 characters per second)
  - Updates the UI with human-readable time estimates (e.g., "About: 2.5 minutes")
  - Handles both short and long texts with appropriate formatting
- Credit refresh system:
  - Automatically updates credit display after audio generation
  - Implements an AJAX-based approach to fetch the latest credit value
  - Visual highlighting of credit changes to improve user awareness
  - Handles edge cases like page refreshes and back-button navigation
- Text formatting enhancements:
  - Improved handling of author bylines followed by numbered lists
  - Adds stronger pauses between author names and list items for better readability
  - Utilizes SSML breaks for proper pacing in voice synthesis
  - Creates natural-sounding transitions between document sections

The Time_Estimator function provides users with an immediate understanding of the expected audio duration before generation. This helps users make informed decisions about text length, particularly important in a credit-based system where longer texts consume more credits. The function is called both during text input (as users type) and when loading existing text into the editor.

## 23. Future Development Roadmap

The next phase of development will focus on:

1. Additional voice customization options
2. Advanced audio export formats
3. Enhanced keyboard shortcuts for desktop power users
4. Batch processing for multiple texts
5. Improved analytics for usage patterns and optimization

10,000 bytes is on average 11:00 minutes.

Google charges us:

| Minutes | Cost  |
| ------- | ----- |
| 5       | $0.07 |
| 10      | $0.15 |
| 15      | $0.22 |
| 30      | $0.44 |
| 45      | $0.65 |
| 60      | $0.87 |
| 90      | $1.31 |
| 100     | $1.45 |
| 150     | $2.18 |
| 200     | $2.91 |
| 250     | $3.64 |
| 300     | $4.36 |

We charge customers:

We charge:

15 mins $1 (standard price)  
60 mins $3.20 (20% discount from $4, based off $1/15 mins)  
300 mins $12 (40% discount from $20, based on $1/15 mins)
