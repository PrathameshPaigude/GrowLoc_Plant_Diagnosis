from sqlalchemy import Column, String, Float, DateTime, ForeignKey, JSON
from sqlalchemy.types import Uuid
from sqlalchemy.orm import relationship
from database.database import Base
import uuid
import datetime

class Plant(Base):
    __tablename__ = "plants"

    id = Column(Uuid, primary_key=True, default=uuid.uuid4, index=True)
    name = Column(String, index=True, default="Unknown Plant")
    species = Column(String, default="Unknown")
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    scans = relationship("Scan", back_populates="plant", cascade="all, delete-orphan", order_by="desc(Scan.timestamp)")

class Scan(Base):
    __tablename__ = "scans"

    id = Column(Uuid, primary_key=True, default=uuid.uuid4, index=True)
    plant_id = Column(Uuid, ForeignKey("plants.id"), index=True)
    timestamp = Column(DateTime, default=datetime.datetime.utcnow, index=True)
    image_url = Column(String, nullable=True)
    note = Column(String, nullable=True)
    
    # Canopy Metrics
    canopy_area_m2 = Column(Float, nullable=True)
    
    # JSON columns for dynamic colors (Works in both SQLite and PostgreSQL)
    fruit_counts = Column(JSON, default=dict)
    leaf_counts = Column(JSON, default=dict)
    
    plant = relationship("Plant", back_populates="scans")
