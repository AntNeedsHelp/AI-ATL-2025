# PresentAI - Quick Start (2 Minutes)

## ✅ What's Already Done

- ✅ All frontend dependencies installed
- ✅ `.env` file created with `VITE_API_URL=http://localhost:8000`
- ✅ All React components built
- ✅ Build tested successfully

## 🚀 Start Development (3 Commands)

```bash
# 1. Navigate to frontend
cd presentai/frontend

# 2. Start development server
npm run dev

# 3. Open browser
# Go to: http://localhost:5173
```

**That's it!** Your frontend is now running.

---

## 🔗 Connect to Backend

### Your backend needs 3 endpoints:

1. **POST /api/upload**
   - Accept video file (FormData)
   - Return: `{ "job_id": "uuid" }`

2. **GET /api/status/{job_id}**
   - Return: `{ "status": "processing" | "completed" | "failed" }`

3. **GET /api/result/{job_id}**
   - Return scores, markers, transcript, video_url
   - See `DEPLOYMENT_CHECKLIST.md` for exact JSON format

### Enable CORS in your FastAPI backend:

```python
from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

---

## 📝 What You Need To Do

### **Only 2 things left:**

1. **Start your backend** on port 8000
   - Or change `VITE_API_URL` in `.env` to your backend URL

2. **Implement the 3 API endpoints** listed above

---

## 🧪 Test It

1. Start frontend: `npm run dev`
2. Start backend on port 8000
3. Go to http://localhost:5173
4. Upload a video
5. Watch the magic happen! ✨

---

## 📚 More Info

- `DEPLOYMENT_CHECKLIST.md` - Complete deployment guide
- `FRONTEND_SUMMARY.md` - All features explained
- `FRONTEND_QUICKSTART.md` - Detailed setup
- `frontend/README.md` - Technical docs

---

## 🆘 Troubleshooting

**Can't connect to backend?**
- Check `.env` has correct `VITE_API_URL`
- Verify backend is running: `curl http://localhost:8000`
- Check CORS is enabled
- Restart frontend after changing `.env`

**Port 5173 already in use?**
```bash
npm run dev -- --port 3000
```

---

## 🎯 Production Build

```bash
npm run build
# Output: dist/ folder
# Deploy to Vercel, Netlify, or any static host
```

---

**You're all set!** 🎉

Frontend is ready. Just connect your backend and you're live!
