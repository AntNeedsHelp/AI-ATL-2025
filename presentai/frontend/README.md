# PresentAI Frontend

Modern React frontend for PresentAI - an AI-powered presentation coach that provides real-time feedback on gestures, speech, clarity, and content.

## Features

- **Upload Page**: Drag-and-drop video upload with optional supporting documents
- **Loading Screen**: Beautiful animated loading state with status polling
- **Results Page**: Interactive dashboard with:
  - Overall and category scores (Gestures, Speech/Inflection, Clarity, Content)
  - Video player with colored timeline markers
  - Interactive marker filtering by category
  - Real-time feedback panel synced with video playback
  - Clickable markers that jump to specific timestamps
  - Hover tooltips on markers

## Tech Stack

- **React 19** - UI framework
- **React Router** - Client-side routing
- **TailwindCSS** - Utility-first styling
- **Framer Motion** - Smooth animations
- **Lucide React** - Icon library
- **Vite** - Build tool

## Getting Started

### Installation

```bash
npm install
```

### Environment Setup

Create a `.env` file in the frontend directory:

```bash
cp .env.example .env
```

Edit `.env` to configure your backend API URL:

```
VITE_API_URL=http://localhost:8000
```

### Development

```bash
npm run dev
```

The app will be available at `http://localhost:5173`

### Build

```bash
npm run build
```

### Preview Production Build

```bash
npm run preview
```

## Project Structure

```
src/
├── components/          # Reusable UI components
│   ├── Button.jsx
│   ├── Card.jsx
│   ├── CategoryFilters.jsx
│   ├── FeedbackPanel.jsx
│   ├── ScoreCards.jsx
│   └── VideoPlayer.jsx
├── pages/              # Route pages
│   ├── Upload.jsx
│   ├── Loading.jsx
│   └── Results.jsx
├── utils/              # Utility functions
│   ├── api.js         # API calls
│   └── markers.js     # Marker filtering/calculations
├── lib/
│   └── utils.js       # Helper functions
├── App.jsx            # Main app with routing
└── index.css          # Global styles
```

## API Integration

The frontend expects the following backend endpoints:

- `POST /api/upload` - Upload video and optional document
- `GET /api/status/{job_id}` - Check analysis status
- `GET /api/result/{job_id}` - Fetch analysis results

### Expected Response Format

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
    }
  ],
  "transcript": "Full transcript text...",
  "video_url": "/path/to/video.mp4"
}
```

## Category Colors

- **Gestures**: `#2BB39A` (Teal)
- **Speech/Inflection**: `#FF8A33` (Orange)
- **Clarity**: `#7C5CFF` (Purple)
- **Content**: `#3388FF` (Blue)

## Features in Detail

### Video Timeline Markers

- Markers are color-coded by category
- Click to jump to timestamp (with -1 sec offset for context)
- Hover to see tooltip with label and time
- Filter by category using filter buttons

### Feedback Panel

- Dynamically updates based on current video time
- Shows relevant advice and suggestions
- Visual severity indicators
- Smooth animations on transitions

### Responsive Design

- Desktop-first approach
- Adapts to tablet and larger mobile screens
- Smooth animations throughout

## Development Notes

- All components use functional components with hooks
- Framer Motion for all animations
- TailwindCSS for styling (no custom CSS files needed)
- API calls abstracted in `utils/api.js`

## License

MIT

# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) (or [oxc](https://oxc.rs) when used in [rolldown-vite](https://vite.dev/guide/rolldown)) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.
