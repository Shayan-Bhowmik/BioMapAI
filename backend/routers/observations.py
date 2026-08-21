from datetime import datetime, timezone
import os
from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError

from database import get_db
from auth import get_current_user
import models
import schemas
from services import storage, identification

router = APIRouter(prefix="/observations", tags=["Observations"])


@router.post("/upload")
async def upload_observation_image(
    file: UploadFile = File(...),
    current_user: models.User = Depends(get_current_user),
):
    file_bytes = await file.read()
    try:
        storage.validate_image_file(file.content_type or "", file_bytes)
    except ValueError as e:
        status_code = status.HTTP_413_REQUEST_ENTITY_TOO_LARGE if "exceeds" in str(e) else status.HTTP_400_BAD_REQUEST
        raise HTTPException(status_code=status_code, detail=str(e))

    filename = storage.save_and_normalize_image(file_bytes)
    public_base_url = os.getenv("PUBLIC_BASE_URL", "http://localhost:8000").rstrip("/")
    image_url = f"{public_base_url}/uploads/{filename}"

    return {"image_url": image_url, "filename": filename}


@router.post("/identify", response_model=schemas.IdentifyResponse)
def identify_observation_species(
    payload: schemas.IdentifyRequest,
    current_user: models.User = Depends(get_current_user),
):
    upload_dir_abs = os.path.abspath(storage.UPLOAD_DIR)
    filename = payload.filename

    if ".." in filename or "/" in filename or "\\" in filename:
        raise HTTPException(status_code=400, detail="Invalid filename format.")

    file_path = os.path.join(upload_dir_abs, filename)
    target_abs = os.path.abspath(file_path)

    if not target_abs.startswith(upload_dir_abs):
        raise HTTPException(status_code=400, detail="Path traversal attempt detected.")

    if not os.path.isfile(target_abs):
        raise HTTPException(status_code=404, detail="Uploaded file not found.")

    result = identification.identify_species(target_abs)
    return result


@router.post("", response_model=schemas.ObservationResponse, status_code=status.HTTP_201_CREATED)
def create_observation(
    payload: schemas.ObservationCreate,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    # Server-side rebuild of image_url from filename + PUBLIC_BASE_URL
    public_base_url = os.getenv("PUBLIC_BASE_URL", "http://localhost:8000").rstrip("/")
    image_url = f"{public_base_url}/uploads/{payload.filename}"

    species_id = None
    if payload.species_scientific:
        scientific_clean = payload.species_scientific.strip()
        species = db.query(models.Species).filter(models.Species.scientific_name == scientific_clean).first()
        if not species:
            common_clean = payload.species_common.strip() if payload.species_common else scientific_clean
            species = models.Species(
                common_name=common_clean,
                scientific_name=scientific_clean
            )
            try:
                db.add(species)
                db.commit()
                db.refresh(species)
            except IntegrityError:
                db.rollback()
                species = db.query(models.Species).filter(models.Species.scientific_name == scientific_clean).first()

        if species:
            species_id = species.id

    obs = models.Observation(
        image_url=image_url,
        species_common=payload.species_common,
        species_scientific=payload.species_scientific,
        lat=payload.lat,
        lng=payload.lng,
        observed_at=payload.observed_at or datetime.now(timezone.utc),
        confidence_score=payload.confidence_score,
        verification_status=models.VerificationStatus.PENDING,
        notes=payload.notes,
        observer_id=current_user.id,
        species_id=species_id,
    )

    db.add(obs)
    db.commit()
    db.refresh(obs)
    return obs


@router.get("/{id}", response_model=schemas.ObservationResponse)
def get_observation(
    id: int,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    obs = db.query(models.Observation).filter(models.Observation.id == id).first()
    if not obs:
        raise HTTPException(status_code=404, detail="Observation not found")
    return obs


@router.patch("/{id}/flag", response_model=schemas.ObservationResponse)
def flag_or_correct_observation(
    id: int,
    payload: schemas.FlagPredictionRequest,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Flag or correct an observation species prediction.
    If a suggestion is supplied -> status becomes CORRECTED.
    If only a reason is supplied -> status becomes FLAGGED.

    Authorisation: Any authenticated user may flag/correct (citizen science correction loop).
    However, only the original observer's suggestion updates the primary species_common and
    species_scientific fields on the observation row itself; third-party suggestions are stored
    in suggested_species_common/suggested_species_scientific columns to preserve observer record integrity.
    """
    obs = db.query(models.Observation).filter(models.Observation.id == id).first()
    if not obs:
        raise HTTPException(status_code=404, detail="Observation not found")

    has_suggestion = bool(payload.suggested_species_common or payload.suggested_species_scientific)

    if has_suggestion:
        obs.verification_status = models.VerificationStatus.CORRECTED
        obs.suggested_species_common = payload.suggested_species_common
        obs.suggested_species_scientific = payload.suggested_species_scientific
    elif payload.reason:
        obs.verification_status = models.VerificationStatus.FLAGGED

    if payload.reason:
        obs.flagged_reason = payload.reason

    # If original observer corrects their own observation, update primary species fields & relink species table row
    if current_user.id == obs.observer_id and has_suggestion:
        if payload.suggested_species_common:
            obs.species_common = payload.suggested_species_common
        if payload.suggested_species_scientific:
            obs.species_scientific = payload.suggested_species_scientific
            scientific_clean = payload.suggested_species_scientific.strip()
            species = db.query(models.Species).filter(models.Species.scientific_name == scientific_clean).first()
            if not species:
                common_clean = payload.suggested_species_common.strip() if payload.suggested_species_common else scientific_clean
                species = models.Species(common_name=common_clean, scientific_name=scientific_clean)
                try:
                    db.add(species)
                    db.commit()
                    db.refresh(species)
                except IntegrityError:
                    db.rollback()
                    species = db.query(models.Species).filter(models.Species.scientific_name == scientific_clean).first()
            if species:
                obs.species_id = species.id

    db.commit()
    db.refresh(obs)
    return obs

