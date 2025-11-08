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

export const Results = () => {
  const { jobId } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');
  const [currentTime, setCurrentTime] = useState(0);
  const [selectedMarker, setSelectedMarker] = useState(null);

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
    
    // Auto-update feedback based on current time
    if (data?.markers) {
      const marker = getCurrentMarker(data.markers, time);
      if (marker && marker !== selectedMarker) {
        setSelectedMarker(marker);
      }
    }
  };

  const handleMarkerClick = (marker) => {
    setSelectedMarker(marker);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-100 via-purple-100 to-pink-100 animate-gradient-xy flex items-center justify-center">
        <div className="w-20 h-20 rounded-full bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 flex items-center justify-center animate-spin">
          <div className="w-16 h-16 rounded-full bg-white"></div>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-100 via-purple-100 to-pink-100 animate-gradient-xy flex items-center justify-center p-6">
        <div className="glass rounded-3xl p-8 shadow-2xl max-w-md text-center border-2 border-white/50">
          <div className="text-5xl mb-4">⚠️</div>
          <h2 className="text-2xl font-bold bg-gradient-to-r from-red-500 to-orange-500 bg-clip-text text-transparent mb-2">Error</h2>
          <p className="text-gray-700 mb-6">{error || 'Failed to load results'}</p>
          <button
            onClick={() => navigate('/')}
            className="px-6 py-3 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 text-white rounded-2xl hover:shadow-lg hover:scale-105 transition-all duration-300"
          >
            Back to Upload
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-100 via-purple-100 to-pink-100 animate-gradient-xy relative overflow-hidden">
      {/* Animated background orbs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 -left-20 w-96 h-96 bg-blue-400 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-pulse"></div>
        <div className="absolute top-1/3 right-0 w-96 h-96 bg-purple-400 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-pulse" style={{ animationDelay: '2s' }}></div>
        <div className="absolute bottom-20 left-1/3 w-96 h-96 bg-pink-400 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-pulse" style={{ animationDelay: '4s' }}></div>
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
            className="flex items-center px-4 py-2 rounded-xl bg-white/60 backdrop-blur-sm text-gray-700 hover:text-gray-900 hover:bg-white/80 mb-4 transition-all duration-300 shadow-sm hover:shadow-md"
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            New Analysis
          </button>
          <h1 className="text-5xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent animate-gradient-x">
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
            videoUrl={data.video_url || '/placeholder-video.mp4'}
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

        {/* Transcript Section (Optional) */}
        {data.transcript && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="mt-8 glass rounded-3xl p-6 shadow-lg border-2 border-white/50"
          >
            <h3 className="text-xl font-semibold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-4">
              Transcript
            </h3>
            <p className="text-gray-800 leading-relaxed whitespace-pre-wrap">
              {data.transcript}
            </p>
          </motion.div>
        )}
      </div>
    </div>
  );
};
