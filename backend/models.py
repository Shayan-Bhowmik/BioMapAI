from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from database import Base

def utcnow():
    return datetime.now(timezone.utc)

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    password_hash = Column(String, nullable=False)
    created_at = Column(DateTime(timezone=True), default=utcnow, nullable=False)

    observations = relationship("Observation", back_populates="observer", cascade="all, delete-orphan")

class Species(Base):
    __tablename__ = "species"

    id = Column(Integer, primary_key=True, index=True)
    common_name = Column(String, nullable=False)
    scientific_name = Column(String, nullable=False)
    category = Column(String, nullable=True)

class Observation(Base):
    __tablename__ = "observations"

    id = Column(Integer, primary_key=True, index=True)
    observer_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=True)
    species_common = Column(String, nullable=True)
    species_scientific = Column(String, nullable=True)
    lat = Column(Float, nullable=True)
    lng = Column(Float, nullable=True)
    image_url = Column(String, nullable=True)
    confidence_score = Column(Float, nullable=True)
    verification_status = Column(String, default="unverified", nullable=True)
    observed_at = Column(DateTime(timezone=True), default=utcnow, nullable=False)

    observer = relationship("User", back_populates="observations")
