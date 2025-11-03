import uvicorn
import uuid
import os
import base64 
from fastapi import FastAPI, Request, HTTPException
from fastapi import UploadFile, File
from google.cloud import storage
from langchain_core.messages import HumanMessage, AIMessage

# ... other imports ...
from fastapi.middleware.cors import CORSMiddleware

try:
    from Verifier_Agent import verifier_agent
except Exception as e:
    verifier_agent = None
    print("Warning: could not import Verifier_Agent:", e)

try:
    from main import agent
except Exception as e:
    agent = None
    print("Warning: could not import main.agent:", e)

import asyncio
import sys
import urllib.request

# ✅ This snippet must be here, at the top
if sys.platform == 'win32':
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())


app = FastAPI(
    title='Misinformation Classifier API',
    description='This API provides a conversational agent with persistent memory.'
)


app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],    # allow all origins
    allow_credentials=True, # ✅ must be False if using "*"
    allow_methods=["*"],
    allow_headers=["*"],
)

TEMP_DIR="base_images"
os.makedirs(TEMP_DIR, exist_ok=True)


# Storage client helper (used by upload and /chat when downloading gs:// URIs)
def _get_storage_client():
    key_path = os.getenv("GOOGLE_APPLICATION_CREDENTIALS") or os.getenv("GCS_KEY_PATH")
    # Try repo-local fallback (useful for quick local tests only)
    if not key_path:
        repo_key = os.path.join(os.path.dirname(__file__), "Truelens", "src", "serviceAccountKey.json")
        if os.path.exists(repo_key):
            key_path = repo_key

    if key_path and os.path.exists(key_path):
        try:
            return storage.Client.from_service_account_json(key_path)
        except Exception as e:
            print(f"Warning: failed to create storage client from key {key_path}: {e}")
    # Last resort: use default credentials (will fail if none available)
    return storage.Client()



@app.post("/upload-to-gcs")
async def upload_to_gcs(file: UploadFile = File(...)):
    """
    Uploads a file to Google Cloud Storage and returns the public URL (or object name).
    Set environment variable GCS_BUCKET to the target bucket. If GCS_PUBLIC is set to true,
    the uploaded object will be made public and its public URL returned. Otherwise the
    object name and a storage.googleapis.com URL are returned.
    """
    bucket_name = os.getenv("GCS_BUCKET") or "genai-hackathon-storage"
    make_public = os.getenv("GCS_PUBLIC", "true").lower() in ("1", "true", "yes")

    try:
        def _get_storage_client():
            key_path = os.getenv("GOOGLE_APPLICATION_CREDENTIALS") or os.getenv("GCS_KEY_PATH")
            # Try repo-local fallback (useful for quick local tests only)
            if not key_path:
                repo_key = os.path.join(os.path.dirname(__file__), "Truelens", "src", "serviceAccountKey.json")
                if os.path.exists(repo_key):
                    key_path = repo_key

            if key_path and os.path.exists(key_path):
                try:
                    return storage.Client.from_service_account_json(key_path)
                except Exception as e:
                    print(f"Warning: failed to create storage client from key {key_path}: {e}")
            # Last resort: use default credentials (will fail if none available)
            return storage.Client()

        client = _get_storage_client()
        bucket = client.bucket(bucket_name)
        object_name = f"uploads/{uuid.uuid4()}_{file.filename}"
        blob = bucket.blob(object_name)

        contents = await file.read()
        blob.upload_from_string(contents, content_type=file.content_type)

        public_url = f"https://storage.googleapis.com/{bucket_name}/{object_name}"
        if make_public:
            try:
                blob.make_public()
                public_url = blob.public_url
            except Exception as e:
                print("Warning: could not make object public:", e)

        return {"object_name": object_name, "public_url": public_url}
    except Exception as e:
        print("Error uploading to GCS:", e)
        raise HTTPException(status_code=500, detail=str(e))
