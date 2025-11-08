import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft } from 'lucide-react';
import { getResult } from '../utils/api';
import { getCurrentMarker } from '../utils/markers';
import { ScoreCards } from '../components/ScoreCards';
import { VideoPlayer } from '../components/VideoPlayer';
import { CategoryFilters } from '../components/CategoryFilters';
import { FeedbackPanel } from '../components/FeedbackPanel';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export const Results = () => {
  const { jobId } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');
  const [currentTime, setCurrentTime] = useState(0);
  const [selectedMarker, setSelectedMarker] = useState(null);
  const [manuallySelectedMarker, setManuallySelectedMarker] = useState(null);

  useEffect(() => {
    const fetchResults = async () => {
      try {
        const result = await getResult(jobId);
        setData(result);
        setLoading(false);
      } catch (err) {
        setError(err.message || 'Failed to load results');
        setLoading(false);
      }
    };

    fetchResults();
  }, [jobId]);

  const handleTimeUpdate = (time) => {
    setCurrentTime(time);
    
    // Auto-update feedback based on current time (only if no marker was manually selected)
    if (data?.markers && !manuallySelectedMarker) {
      const marker = getCurrentMarker(data.markers, time);
      if (marker && marker !== selectedMarker) {
        setSelectedMarker(marker);
      }
    }
    
    // Clear manual selection if we've moved past the selected marker
    if (manuallySelectedMarker && (time < manuallySelectedMarker.start || time > manuallySelectedMarker.end)) {
      setManuallySelectedMarker(null);
    }
  };

  const handleMarkerClick = (marker) => {
    setManuallySelectedMarker(marker);
    setSelectedMarker(marker);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-brand-background flex items-center justify-center relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-1/4 w-64 h-64 bg-brand-accent/25 rounded-full blur-3xl animate-pulse" />
          <div className="absolute bottom-0 right-1/4 w-72 h-72 bg-brand-accent-soft/25 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }} />
        </div>
        <div className="w-20 h-20 rounded-full bg-gradient-to-r from-brand-accent-soft via-brand-accent to-brand-accent-strong flex items-center justify-center animate-spin shadow-xl shadow-brand-accent/30 relative z-10">
          <div className="w-16 h-16 rounded-full bg-brand-background"></div>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-brand-background flex items-center justify-center p-6 relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-14 left-8 w-80 h-80 bg-brand-accent-soft/25 rounded-full blur-3xl" />
        </div>
        <div className="glass rounded-3xl p-8 shadow-2xl max-w-md text-center border border-brand-accent/30 relative z-10">
          <div className="text-5xl mb-4">⚠️</div>
          <h2 className="text-2xl font-bold bg-gradient-to-r from-brand-accent-soft via-brand-accent to-brand-accent-strong bg-clip-text text-transparent mb-2">Error</h2>
          <p className="text-brand-muted mb-6">{error || 'Failed to load results'}</p>
          <button
            onClick={() => navigate('/')}
            className="px-6 py-3 rounded-2xl bg-gradient-to-r from-brand-accent-soft via-brand-accent to-brand-accent-strong text-brand-text shadow-lg shadow-brand-accent/20 hover:scale-105 transition-all duration-300"
          >
            Back to Upload
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-brand-background relative overflow-hidden">
      {/* Animated background orbs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 -left-24 w-96 h-96 bg-brand-accent/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute top-1/3 right-0 w-96 h-96 bg-brand-accent-strong/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }}></div>
        <div className="absolute bottom-20 left-1/3 w-96 h-96 bg-brand-accent-soft/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '4s' }}></div>
      </div>
      <div className="max-w-7xl mx-auto px-6 py-8 relative z-10">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <button
            onClick={() => navigate('/')}
            className="flex items-center px-4 py-2 rounded-xl bg-brand-surface-alt/70 backdrop-blur-sm text-brand-text/90 hover:text-brand-text hover:bg-brand-surface-glow/80 mb-4 transition-all duration-300 shadow-md shadow-black/40"
          >
            <ArrowLeft className="w-5 h-5 mr-2 text-brand-accent-soft" />
            New Analysis
          </button>
          <h1 className="text-5xl font-bold bg-gradient-to-r from-brand-accent-soft via-brand-accent to-brand-accent-strong bg-clip-text text-transparent animate-gradient-x">
            Presentation Analysis
          </h1>
        </motion.div>

        {/* Score Cards */}
        <div className="mb-8">
          <ScoreCards scores={data.scores} />
        </div>

        {/* Category Filters */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mb-6"
        >
          <CategoryFilters
            activeFilter={activeFilter}
            onFilterChange={setActiveFilter}
          />
        </motion.div>

        {/* Video Player */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="mb-6"
        >
          <VideoPlayer
            videoUrl={data.video_url 
              ? (data.video_url.startsWith('http') 
                  ? data.video_url 
                  : `${API_BASE_URL}${data.video_url}`)
              : `${API_BASE_URL}/api/video/${jobId}`}
            markers={data.markers}
            activeFilter={activeFilter}
            onTimeUpdate={handleTimeUpdate}
            onMarkerClick={handleMarkerClick}
          />
        </motion.div>

        {/* Feedback Panel */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <FeedbackPanel currentMarker={selectedMarker} />
        </motion.div>
      </div>
    </div>
  );
};
