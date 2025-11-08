import os
import uuid
import json
import shutil
from typing import Optional
from pathlib import Path
from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, FileResponse
import asyncio
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

from video_processor import VideoProcessor
from ai_analyzer import AIAnalyzer

app = FastAPI(title="PresentAI Backend")

# CORS for local development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Data directory setup
DATA_DIR = Path(__file__).parent.parent / "data"
DATA_DIR.mkdir(exist_ok=True)

# Job storage
jobs = {}

@app.get("/")
async def root():
    return {"status": "PresentAI Backend Running", "version": "1.0.0"}

@app.post("/api/upload")
async def upload_video(
    video: UploadFile = File(...),
    title: Optional[str] = Form(None),
    supporting_file: Optional[UploadFile] = File(None)
):
    """Upload video and optional supporting document, start analysis"""
    
    # Validate video file
    if not video.filename.endswith('.mp4'):
        raise HTTPException(status_code=400, detail="Only .mp4 files are accepted")
    
    # Check file size (500 MB limit)
    video_content = await video.read()
    if len(video_content) > 500 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="Video file exceeds 500 MB limit")
    
    # Create job
    job_id = str(uuid.uuid4())
    job_dir = DATA_DIR / "jobs" / job_id
    job_dir.mkdir(parents=True, exist_ok=True)
    
    # Save video
    video_path = job_dir / "input.mp4"
    with open(video_path, "wb") as f:
        f.write(video_content)
    
    # Save supporting file if provided
    supporting_path = None
    if supporting_file:
        ext = Path(supporting_file.filename).suffix
        if ext not in ['.pdf', '.docx', '.txt']:
            raise HTTPException(status_code=400, detail="Supporting file must be .pdf, .docx, or .txt")
        
        supporting_path = job_dir / f"supporting{ext}"
        supporting_content = await supporting_file.read()
        with open(supporting_path, "wb") as f:
            f.write(supporting_content)
    
    # Initialize job status
    jobs[job_id] = {
        "status": "queued",
        "title": title or "Untitled Presentation",
        "progress": 0,
        "message": "Queued for processing"
    }
    
    # Start processing in background
    asyncio.create_task(process_video(job_id, str(video_path), str(supporting_path) if supporting_path else None))
    
    return {"job_id": job_id}

@app.get("/api/status/{job_id}")
async def get_status(job_id: str):
    """Poll job status"""
    if job_id not in jobs:
        raise HTTPException(status_code=404, detail="Job not found")
    
    return jobs[job_id]

@app.get("/api/result/{job_id}")
async def get_result(job_id: str):
    """Fetch final analysis results"""
    if job_id not in jobs:
        raise HTTPException(status_code=404, detail="Job not found")
    
    if jobs[job_id]["status"] != "completed":
        raise HTTPException(status_code=400, detail="Job not completed")
    
    result_path = DATA_DIR / "jobs" / job_id / "result.json"
    if not result_path.exists():
        raise HTTPException(status_code=404, detail="Results not found")
    
    with open(result_path, "r") as f:
        result = json.load(f)
    
    return result

async def process_video(job_id: str, video_path: str, supporting_path: Optional[str]):
    """Background task to process video"""
    try:
        jobs[job_id]["status"] = "processing"
        jobs[job_id]["progress"] = 10
        jobs[job_id]["message"] = "Extracting audio and frames..."
        
        # Step 1: Preprocess video
        processor = VideoProcessor(video_path, Path(video_path).parent)
        metadata = processor.preprocess()
        
        # Check duration (3 min = 180 seconds)
        if metadata["duration"] > 180:
            jobs[job_id]["status"] = "failed"
            jobs[job_id]["message"] = "Video exceeds 3 minute duration limit"
            return
        
        jobs[job_id]["progress"] = 30
        jobs[job_id]["message"] = "Analyzing presentation with AI..."
        
        # Step 2: AI Analysis
        analyzer = AIAnalyzer()
        result = await analyzer.analyze(
            audio_path=str(Path(video_path).parent / "audio.wav"),
            frames_dir=str(Path(video_path).parent / "frames"),
            supporting_doc_path=supporting_path,
            metadata=metadata
        )
        
        jobs[job_id]["progress"] = 90
        jobs[job_id]["message"] = "Finalizing results..."
        
        # Step 3: Save results
        # Update result to include video URL
        result["video_url"] = f"/api/video/{job_id}"
        
        result_path = Path(video_path).parent / "result.json"
        with open(result_path, "w") as f:
            json.dump(result, f, indent=2)
        
        jobs[job_id]["status"] = "completed"
        jobs[job_id]["progress"] = 100
        jobs[job_id]["message"] = "Analysis complete!"
        
    except Exception as e:
        jobs[job_id]["status"] = "failed"
        jobs[job_id]["message"] = f"Error: {str(e)}"
        print(f"Error processing job {job_id}: {e}")

@app.get("/api/video/{job_id}")
async def get_video(job_id: str):
    """Stream video file for playback"""
    if job_id not in jobs:
        raise HTTPException(status_code=404, detail="Job not found")
    
    video_path = DATA_DIR / "jobs" / job_id / "input.mp4"
    if not video_path.exists():
        raise HTTPException(status_code=404, detail="Video not found")
    
    return FileResponse(video_path, media_type="video/mp4")

@app.delete("/api/jobs/{job_id}")
async def delete_job(job_id: str):
    """Clean up job data"""
    if job_id in jobs:
        job_dir = DATA_DIR / "jobs" / job_id
        if job_dir.exists():
            shutil.rmtree(job_dir)
        del jobs[job_id]
        return {"message": "Job deleted"}
    raise HTTPException(status_code=404, detail="Job not found")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
