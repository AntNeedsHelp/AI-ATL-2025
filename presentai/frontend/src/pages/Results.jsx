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
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-500" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 flex items-center justify-center p-6">
        <div className="bg-white rounded-2xl p-8 shadow-lg max-w-md text-center">
          <div className="text-red-500 text-5xl mb-4">⚠️</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Error</h2>
          <p className="text-gray-600 mb-6">{error || 'Failed to load results'}</p>
          <button
            onClick={() => navigate('/')}
            className="px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-2xl hover:from-blue-600 hover:to-purple-700"
          >
            Back to Upload
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50">
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <button
            onClick={() => navigate('/')}
            className="flex items-center text-gray-600 hover:text-gray-900 mb-4 transition-colors"
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            New Analysis
          </button>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
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
            className="mt-8 bg-white rounded-2xl p-6 shadow-sm"
          >
            <h3 className="text-xl font-semibold text-gray-900 mb-4">
              Transcript
            </h3>
            <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">
              {data.transcript}
            </p>
          </motion.div>
        )}
      </div>
    </div>
  );
};
