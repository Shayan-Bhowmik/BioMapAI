from pydantic import BaseModel, EmailStr, Field
from typing import Optional
from datetime import datetime


class UserRegister(BaseModel):
    username: str
    email: EmailStr
    password: str
    full_name: Optional[str] = None


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserResponse(BaseModel):
    id: int
    username: str
    email: str
    full_name: Optional[str] = None
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class AuthResponse(BaseModel):
    access_token: str
    token_type: str
    user: UserResponse


class IdentifyRequest(BaseModel):
    filename: str


class PredictionOut(BaseModel):
    common_name: str
    scientific_name: str
    confidence: float
    raw: Optional[dict] = None


class IdentifyResponse(BaseModel):
    provider: str
    predictions: list[PredictionOut]


class ObservationCreate(BaseModel):
    filename: str
    species_common: Optional[str] = None
    species_scientific: Optional[str] = None
    lat: float = Field(..., ge=-90.0, le=90.0)
    lng: float = Field(..., ge=-180.0, le=180.0)
    observed_at: Optional[datetime] = None
    confidence_score: Optional[float] = Field(None, ge=0.0, le=1.0)
    notes: Optional[str] = None


class ObservationResponse(BaseModel):
    id: int
    image_url: str
    species_common: Optional[str] = None
    species_scientific: Optional[str] = None
    lat: float
    lng: float
    observed_at: datetime
    confidence_score: Optional[float] = None
    verification_status: str
    notes: Optional[str] = None
    flagged_reason: Optional[str] = None
    suggested_species_common: Optional[str] = None
    suggested_species_scientific: Optional[str] = None
    created_at: Optional[datetime] = None
    observer_id: int
    species_id: Optional[int] = None
    observer: UserResponse

    class Config:
        from_attributes = True


class FlagPredictionRequest(BaseModel):
    reason: Optional[str] = None
    suggested_species_common: Optional[str] = None
    suggested_species_scientific: Optional[str] = None
