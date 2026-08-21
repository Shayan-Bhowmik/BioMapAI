import io
import os
from uuid import uuid4
from PIL import Image, ImageOps

UPLOAD_DIR = os.getenv("UPLOAD_DIR", "./uploads")
MAX_UPLOAD_MB = float(os.getenv("MAX_UPLOAD_MB", "8"))
MAX_UPLOAD_BYTES = int(MAX_UPLOAD_MB * 1024 * 1024)
ALLOWED_MIME_TYPES = {"image/jpeg", "image/png", "image/webp"}


def validate_image_file(content_type: str, file_bytes: bytes):
    if content_type not in ALLOWED_MIME_TYPES:
        raise ValueError("Invalid file type. Allowed formats: JPEG, PNG, WebP.")
    
    if len(file_bytes) > MAX_UPLOAD_BYTES:
        raise ValueError(f"File size exceeds maximum limit of {MAX_UPLOAD_MB} MB.")
    
    try:
        verify_img = Image.open(io.BytesIO(file_bytes))
        verify_img.verify()
    except Exception:
        raise ValueError("Corrupt or invalid image file.")


def save_and_normalize_image(file_bytes: bytes) -> str:
    img = Image.open(io.BytesIO(file_bytes))
    img = ImageOps.exif_transpose(img)
    img = img.convert("RGB")
    
    max_edge = 1600
    w, h = img.size
    if w > max_edge or h > max_edge:
        img.thumbnail((max_edge, max_edge), Image.Resampling.LANCZOS)
    
    filename = f"{uuid4().hex}.jpg"
    os.makedirs(UPLOAD_DIR, exist_ok=True)
    file_path = os.path.join(UPLOAD_DIR, filename)
    img.save(file_path, "JPEG", quality=85)
    
    return filename
