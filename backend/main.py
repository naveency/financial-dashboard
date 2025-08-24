from fastapi import FastAPI, HTTPException, Query
from pydantic import BaseModel
import logging
from datetime import datetime
from contextlib import asynccontextmanager
from database import init_database
from routers.stocks import router as stocks_router

# Set up logging
logging.basicConfig(level=logging.INFO)

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    try:
        init_database()
        logging.info("Database initialized successfully")
    except Exception as e:
        logging.error(f"Failed to initialize database: {e}")
    yield
    # Shutdown (if needed)

# Create FastAPI instance
app = FastAPI(
    title="Financial Dashboard API",
    description="A FastAPI backend for financial dashboard with stock data",
    version="1.0.0",
    lifespan=lifespan
)

# Root and health endpoints only
class HealthResponse(BaseModel):
    status: str
    message: str

@app.get("/")
async def root():
    return {"message": "Welcome to Financial Dashboard API"}

@app.get("/health", response_model=HealthResponse)
async def health_check():
    return HealthResponse(status="healthy", message="API is running successfully")

# Include stocks router
app.include_router(stocks_router)

# Run the application
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8080)
