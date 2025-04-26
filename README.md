# Grocery Delivery App

A full-stack application for grocery delivery services.

## Backend Setup

### Prerequisites
- Python 3.8 or higher
- pip (Python package manager)
- Firebase account

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd <repository-name>
```

2. Create and activate a virtual environment:
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

3. Install dependencies:
```bash
cd backend
pip install -r requirements.txt
```

### Firebase Configuration

1. Create a Firebase Project:
   - Go to [Firebase Console](https://console.firebase.google.com/)
   - Click "Add project"
   - Enter a project name and follow the setup wizard
   - Enable Firestore Database in your project

2. Generate Service Account Credentials:
   - In Firebase Console, go to Project Settings (gear icon)
   - Go to "Service accounts" tab
   - Click "Generate new private key"
   - Save the downloaded JSON file securely

3. Set up Firebase Configuration:
   - Copy `firebase_config.template.py` to `firebase_config.py`
   - Open the downloaded service account JSON file
   - Copy the values from the JSON file to the corresponding fields in `firebase_config.py`:
     - `project_id`
     - `private_key_id`
     - `private_key`
     - `client_email`
     - `client_id`
     - `client_x509_cert_url`

4. Start the backend server:
```bash
cd backend
uvicorn main:app --reload
```

The server will start at `http://localhost:8000`

## Security Notes

- Never commit `firebase_config.py` or service account JSON files to version control
- Keep your Firebase credentials secure and private
- Use environment variables for sensitive information in production

## API Documentation

Once the server is running, you can access the API documentation at:
- Swagger UI: `http://localhost:8000/docs`
- ReDoc: `http://localhost:8000/redoc` 