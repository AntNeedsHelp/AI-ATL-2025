# PresentAI - Complete Deployment Checklist

## ✅ Current Status

### Frontend Dependencies
✅ **All dependencies are already installed** (you ran `npm install`)
- React, React Router, Framer Motion, TailwindCSS, Lucide Icons - all installed
- Build tested and working successfully

### What You Still Need To Do

---

## 🚀 **Step-by-Step Setup**

### **1. Create Environment File (REQUIRED)**

```bash
cd /Users/rishidesai/Documents/AI-ATL-2025/presentai/frontend
cp .env.example .env
```

Then edit `.env` and set your backend URL:
```env
VITE_API_URL=http://localhost:8000
```

**Note:** Change this to your actual backend URL when deployed.

---

### **2. Backend Setup (REQUIRED)**

Your backend needs to implement these 3 endpoints:

#### **POST /api/upload**
```python
# Expected: Accept video file + optional document
# Return: { "job_id": "some-uuid" }
```

#### **GET /api/status/{job_id}**
```python
# Return: { "status": "processing" | "completed" | "failed" }
```

#### **GET /api/result/{job_id}**
```python
# Return full analysis results (see format below)
```

**Backend Requirements Checklist:**
- [ ] FastAPI backend running on port 8000 (or update .env)
- [ ] CORS enabled for frontend origin (http://localhost:5173 in dev)
- [ ] File upload handling for video files
- [ ] Job queue/async processing system
- [ ] Storage for uploaded videos
- [ ] Storage for analysis results

---

### **3. Backend Response Format (CRITICAL)**

Your backend `/api/result/{job_id}` **MUST** return this exact structure:

```json
{
  "scores": {
    "gestures": 20,
    "inflection": 18,
    "clarity": 21,
    "content": 23,
    "total": 82
  },
  "markers": [
    {
      "category": "clarity",
      "start": 42.5,
      "end": 44,
      "label": "Spoke too quickly",
      "severity": 3,
      "feedback": "Pause slightly between ideas."
    },
    {
      "category": "gestures",
      "start": 60,
      "end": 63,
      "label": "Limited hand movement",
      "severity": 2,
      "feedback": "Use intentional gestures to emphasize key points."
    }
  ],
  "transcript": "Full transcript text here...",
  "video_url": "/path/to/uploaded/video.mp4"
}
```

**Field Requirements:**
- `scores.gestures` - 0 to 25
- `scores.inflection` - 0 to 25
- `scores.clarity` - 0 to 25
- `scores.content` - 0 to 25
- `scores.total` - 0 to 100
- `markers[].category` - Must be one of: `"gestures"`, `"inflection"`, `"clarity"`, `"content"`
- `markers[].start` - Timestamp in seconds (float)
- `markers[].end` - Timestamp in seconds (float)
- `markers[].label` - Short description
- `markers[].severity` - 1, 2, or 3 (priority)
- `markers[].feedback` - Actionable advice
- `video_url` - Accessible video URL

---

### **4. Backend CORS Configuration (REQUIRED)**

Your FastAPI backend needs CORS enabled:

```python
from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",  # Frontend dev
        "http://localhost:3000",  # Alternative port
        # Add your production domain here
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

---

### **5. Video File Serving (REQUIRED)**

The frontend needs to access uploaded videos. Options:

**Option A: Static File Serving (Development)**
```python
from fastapi.staticfiles import StaticFiles

app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")
# Then video_url = "/uploads/video.mp4"
```

**Option B: Presigned URLs (Production)**
```python
# Use S3, GCS, or similar with presigned URLs
# video_url = "https://s3.amazonaws.com/bucket/video.mp4?signature=..."
```

**Option C: Stream Through Backend**
```python
from fastapi.responses import FileResponse

@app.get("/video/{filename}")
async def get_video(filename: str):
    return FileResponse(f"uploads/{filename}", media_type="video/mp4")
```

---

## 📋 **Development Checklist**

### Frontend Setup
- [x] Dependencies installed (`npm install` already done)
- [ ] Create `.env` file from `.env.example`
- [ ] Update `VITE_API_URL` in `.env`
- [ ] Test frontend: `npm run dev`

### Backend Setup
- [ ] Backend running on correct port (default: 8000)
- [ ] CORS configured for frontend origin
- [ ] Implement `/api/upload` endpoint
- [ ] Implement `/api/status/{job_id}` endpoint
- [ ] Implement `/api/result/{job_id}` endpoint
- [ ] Video file storage configured
- [ ] Video file serving configured
- [ ] Response format matches frontend expectations

### Integration Testing
- [ ] Upload a test video through frontend
- [ ] Verify loading screen appears and polls backend
- [ ] Verify results page loads with correct data
- [ ] Test video playback
- [ ] Test timeline markers (click, hover)
- [ ] Test category filters
- [ ] Test feedback panel updates

---

## 🚀 **Production Deployment Checklist**

### Frontend Deployment

**Build for Production:**
```bash
cd presentai/frontend
npm run build
# Output: dist/ folder ready to deploy
```

**Deployment Options:**

1. **Vercel** (Recommended - easiest)
   ```bash
   npm install -g vercel
   vercel
   ```
   - Set environment variable: `VITE_API_URL=https://your-backend.com`

2. **Netlify**
   ```bash
   npm install -g netlify-cli
   netlify deploy --prod
   ```
   - Set environment variable: `VITE_API_URL=https://your-backend.com`

3. **Static Hosting (S3, GCS, etc.)**
   ```bash
   npm run build
   # Upload dist/ folder contents to your hosting
   ```

4. **Docker**
   ```dockerfile
   FROM node:20-alpine
   WORKDIR /app
   COPY package*.json ./
   RUN npm install
   COPY . .
   RUN npm run build
   
   FROM nginx:alpine
   COPY --from=0 /app/dist /usr/share/nginx/html
   EXPOSE 80
   CMD ["nginx", "-g", "daemon off;"]
   ```

### Backend Deployment

**Requirements:**
- [ ] Backend deployed and accessible
- [ ] CORS configured with production frontend URL
- [ ] Environment variables set
- [ ] Database/storage configured
- [ ] Video storage configured (S3, GCS, etc.)
- [ ] SSL/HTTPS enabled

**Update Frontend .env for Production:**
```env
VITE_API_URL=https://api.presentai.com  # Your actual backend URL
```

---

## 🔧 **Additional Configuration (Optional)**

### Custom Port
If frontend port 5173 is in use:
```bash
npm run dev -- --port 3000
```

### Custom Backend URL (Development)
Edit `.env`:
```env
VITE_API_URL=http://localhost:5000  # If your backend is on different port
```

### File Size Limits
Update backend to accept large video files:
```python
app.add_middleware(
    # ... CORS ...
)

# Increase file size limit if needed
app.add_middleware(
    ...,
    max_upload_size=500_000_000  # 500MB
)
```

---

## 🐛 **Common Issues & Solutions**

### Issue: Frontend can't connect to backend
**Solutions:**
1. Check `.env` file exists and has correct `VITE_API_URL`
2. Verify backend is running: `curl http://localhost:8000/health`
3. Check CORS is enabled in backend
4. Check browser console for CORS errors
5. Restart dev server after changing `.env`: `npm run dev`

### Issue: Video won't play
**Solutions:**
1. Verify `video_url` in API response is accessible
2. Check video file format (.mp4 recommended)
3. Check video file permissions
4. Use browser dev tools Network tab to see if video loads

### Issue: Build fails
**Solutions:**
1. Delete `node_modules` and reinstall: `rm -rf node_modules package-lock.json && npm install`
2. Clear cache: `npm cache clean --force`
3. Check Node.js version: `node --version` (should be 18+)

### Issue: Markers not showing
**Solutions:**
1. Verify `markers` array in API response
2. Check `category` values match: "gestures", "inflection", "clarity", "content"
3. Verify `start` and `end` are numbers (not strings)
4. Check browser console for errors

---

## 📝 **Summary: What You Need Right Now**

### **Immediate Steps:**

1. **Create .env file:**
   ```bash
   cd presentai/frontend
   cp .env.example .env
   echo "VITE_API_URL=http://localhost:8000" > .env
   ```

2. **Start frontend:**
   ```bash
   npm run dev
   ```
   Open: http://localhost:5173

3. **Ensure backend implements:**
   - POST `/api/upload` → returns `{ "job_id": "..." }`
   - GET `/api/status/{job_id}` → returns `{ "status": "..." }`
   - GET `/api/result/{job_id}` → returns full results JSON
   - CORS enabled for `http://localhost:5173`

4. **Test the flow:**
   - Upload a video
   - Wait for processing
   - View results

---

## ✅ **You're Ready When:**

- [x] All npm dependencies installed (DONE)
- [ ] `.env` file created with backend URL
- [ ] Backend running with all 3 endpoints
- [ ] CORS configured
- [ ] Video serving configured
- [ ] Test upload completes successfully

**That's it!** The frontend is production-ready. You just need the `.env` file and a working backend.

---

## 📞 **Need Help?**

Check these files for more info:
- `FRONTEND_QUICKSTART.md` - Quick start guide
- `FRONTEND_SUMMARY.md` - Complete feature list
- `frontend/README.md` - Technical documentation

Good luck! 🚀
