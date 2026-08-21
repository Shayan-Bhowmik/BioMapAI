from sqlalchemy import (Column, Integer, String, Float, DateTime, Text, ForeignKey, Enum as SAEnum)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import enum

from database import Base

class VerificationStatus(str, enum.Enum):
    PENDING = "PENDING"
    VERIFIED = "VERIFIED"
    REJECTED = "REJECTED"
    FLAGGED = "FLAGGED"
    CORRECTED = "CORRECTED"


class User(Base):
    __tablename__ = "users"

    id=Column(Integer, primary_key=True, index=True)
    username=Column(String(50), unique=True, nullable=False, index=True)
    email=Column(String(255), unique=True, nullable=False, index=True)
    hashed_password=Column(String(255), nullable=False)
    full_name=Column(String(100))
    bio=Column(Text)
    avatar_url=Column(String(255))
    created_at=Column(DateTime(timezone=True), server_default=func.now())
    updated_at=Column(DateTime(timezone=True), onupdate=func.now())
    observations=relationship("Observation", back_populates="observer")


class Species(Base):
    __tablename__ = "species"
    id = Column(Integer, primary_key=True, index=True)
    common_name = Column(String(200), nullable=False, index=True)
    scientific_name = Column(String(200), unique=True, nullable=False, index=True)
    kingdom = Column(String(50))
    phylum = Column(String(50))
    class_name = Column(String(50))
    order = Column(String(50))
    family = Column(String(50))
    genus = Column(String(50))
    description = Column(Text)
    image_url = Column(String(500))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    observations = relationship("Observation", back_populates="species")


class Observation(Base):
    __tablename__ = "observations"
    id = Column(Integer, primary_key=True, index=True)
    image_url = Column(String(500), nullable=False)
    species_common = Column(String(200))
    species_scientific = Column(String(200))
    lat = Column(Float, nullable=False)
    lng = Column(Float, nullable=False)
    observed_at = Column(DateTime(timezone=True), nullable=False)
    confidence_score = Column(Float)
    verification_status = Column(
        SAEnum(VerificationStatus, name="verification_status_enum", values_callable=lambda x: [e.value for e in x]),
        default=VerificationStatus.PENDING,
        nullable=False
    )
    notes = Column(Text)
    flagged_reason = Column(Text, nullable=True)
    suggested_species_common = Column(String(200), nullable=True)
    suggested_species_scientific = Column(String(200), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    observer_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    species_id = Column(Integer, ForeignKey("species.id"), nullable=True)
    observer = relationship("User", back_populates="observations")
    species = relationship("Species", back_populates="observations")