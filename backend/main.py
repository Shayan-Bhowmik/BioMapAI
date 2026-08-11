import os
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from database import engine, Base
import models
from auth import router as auth_router

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Create tables on startup if database is available
    if not os.getenv("TESTING"):
        try:
            Base.metadata.create_all(bind=engine)
        except Exception as e:
            print(f"Warning: Could not create tables on startup: {e}")
    yield

app = FastAPI(title="BioMap AI", version="0.1.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)

@app.get("/")
def root():
    return {"message": "BioMap AI API is running"}

@app.get("/health")
def health():
    return {"status": "ok"}