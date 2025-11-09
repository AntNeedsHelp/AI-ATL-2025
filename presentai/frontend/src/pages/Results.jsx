import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft } from 'lucide-react';
import { getResult, generateFollowUpQuestions, checkQuestionsStatus } from '../utils/api';
import { getCurrentMarker } from '../utils/markers';
import { ScoreCards } from '../components/ScoreCards';
import { VideoPlayer } from '../components/VideoPlayer';
import { CategoryFilters } from '../components/CategoryFilters';
import { FeedbackPanel } from '../components/FeedbackPanel';
import { FollowUpQuestions } from '../components/FollowUpQuestions';

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
  const manualSelectionTimeoutRef = useRef(null);
  // Use a ref to track manual selection immediately (synchronous) to avoid race conditions
  const manualSelectionRef = useRef(null);
  const [followUpQuestions, setFollowUpQuestions] = useState(null);
  const [loadingQuestions, setLoadingQuestions] = useState(false);
  const [questionsError, setQuestionsError] = useState('');
  const pollingIntervalRef = useRef(null);
  const pollingTimeoutRef = useRef(null);

  useEffect(() => {
    const fetchResults = async () => {
      try {
        console.log('[Results] Fetching results for job:', jobId);
        const result = await getResult(jobId);
        console.log('[Results] Results loaded successfully, markers:', result?.markers?.length || 0);
        setData(result);
        setLoading(false);
      } catch (err) {
        console.error('[Results] Error fetching results:', err);
        setError(err.message || 'Failed to load results');
        setLoading(false);
      }
    };

    if (jobId) {
      fetchResults();
    } else {
      setError('No job ID provided');
      setLoading(false);
    }
  }, [jobId]);

  const handleTimeUpdate = (time) => {
    setCurrentTime(time);
    
    // Check ref first (synchronous) before checking state (async)
    const currentManualSelection = manualSelectionRef.current || manuallySelectedMarker;
    
    // If a marker was manually selected, ALWAYS prioritize it
    // Only clear it if we've moved significantly outside its range
    if (currentManualSelection) {
      // Use a larger buffer (2 seconds) to handle jumps to marker.start - 1
      // This ensures the clicked marker stays selected even when jumping slightly before it
      const buffer = 2.0;
      const bufferStart = currentManualSelection.start - buffer;
      const bufferEnd = currentManualSelection.end + buffer;
      
      // Check if we're within the buffer zone (includes the jump-to position)
      if (time >= bufferStart && time <= bufferEnd) {
        // Always keep the manually selected marker when in buffer zone
        // Compare by unique key to avoid unnecessary re-renders
        const manualKey = `${currentManualSelection.category}-${currentManualSelection.start}-${currentManualSelection.end}`;
        const selectedKey = selectedMarker ? `${selectedMarker.category}-${selectedMarker.start}-${selectedMarker.end}` : null;
        
        if (manualKey !== selectedKey) {
          // Force update to the manually selected marker
          console.log('Forcing update to manually selected marker:', currentManualSelection.category);
          setSelectedMarker(currentManualSelection);
          // Also update state to keep in sync
          if (!manuallySelectedMarker || manualKey !== `${manuallySelectedMarker.category}-${manuallySelectedMarker.start}-${manuallySelectedMarker.end}`) {
            setManuallySelectedMarker(currentManualSelection);
          }
        }
        // CRITICAL: Return early to prevent auto-selection from overriding
        // This ensures the clicked marker is never overridden by getCurrentMarker
        return;
      } else {
        // We've moved well outside the marker's buffer zone, clear manual selection
        console.log('Clearing manual selection - moved outside buffer zone');
        manualSelectionRef.current = null;
        setManuallySelectedMarker(null);
        // Then proceed to auto-select based on current time
      }
    }
    
    // Auto-update feedback based on current time (only if no marker was manually selected)
    if (data?.markers) {
      const marker = getCurrentMarker(data.markers, time);
      if (marker) {
        // Use a unique key to ensure we're comparing the same marker object
        const markerKey = `${marker.category}-${marker.start}-${marker.end}`;
        const selectedKey = selectedMarker ? `${selectedMarker.category}-${selectedMarker.start}-${selectedMarker.end}` : null;
        
        if (markerKey !== selectedKey) {
          setSelectedMarker(marker);
        }
      } else if (selectedMarker && !manuallySelectedMarker) {
        // Clear selected marker if we're not in any marker's time range
        // But only if no marker was manually selected
        setSelectedMarker(null);
      }
    }
  };

  const handleMarkerClick = (marker) => {
    // Clear any existing timeout
    if (manualSelectionTimeoutRef.current) {
      clearTimeout(manualSelectionTimeoutRef.current);
    }
    
    // Find the exact marker from the original data.markers array to ensure we have the correct object
    // This prevents issues with filtered markers or reference problems
    let exactMarker = marker;
    if (data?.markers) {
      const foundMarker = data.markers.find(m => 
        m.category === marker.category && 
        m.start === marker.start && 
        m.end === marker.end
      );
      if (foundMarker) {
        exactMarker = foundMarker;
      }
    }
    
    // Create a copy to ensure we have all properties and avoid reference issues
    const markerCopy = {
      ...exactMarker,
      category: exactMarker.category || 'gestures', // Ensure category is set with fallback
    };
    
    console.log('Marker clicked - Category:', markerCopy.category, 'Marker:', markerCopy); // Debug log
    console.log('All marker properties:', Object.keys(markerCopy));
    
    // CRITICAL: Set ref immediately (synchronous) before state update (async)
    // This ensures handleTimeUpdate can see the manual selection even if state hasn't updated yet
    manualSelectionRef.current = markerCopy;
    
    // Set manual selection in state (async, but ref is already set)
    setManuallySelectedMarker(markerCopy);
    setSelectedMarker(markerCopy);
    
    // Set a timeout to prevent time updates from overriding for a short period
    manualSelectionTimeoutRef.current = setTimeout(() => {
      manualSelectionTimeoutRef.current = null;
    }, 300);
  };
  
  // Cleanup timeouts and intervals on unmount
  useEffect(() => {
    return () => {
      if (manualSelectionTimeoutRef.current) {
        clearTimeout(manualSelectionTimeoutRef.current);
      }
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
      if (pollingTimeoutRef.current) {
        clearTimeout(pollingTimeoutRef.current);
      }
    };
  }, []);

  const handleGenerateQuestions = async () => {
    if (!jobId) return;
    
    // Clear any existing polling
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
    if (pollingTimeoutRef.current) {
      clearTimeout(pollingTimeoutRef.current);
      pollingTimeoutRef.current = null;
    }
    
    setLoadingQuestions(true);
    setQuestionsError('');
    setFollowUpQuestions(null);
    
    try {
      // Start the background generation
      const result = await generateFollowUpQuestions(jobId);
      
      // If questions are already available (completed), use them
      if (result.status === 'completed' && result.questions) {
        setFollowUpQuestions(result.questions);
        setLoadingQuestions(false);
        return;
      }
      
      // Otherwise, poll for status
      pollingIntervalRef.current = setInterval(async () => {
        try {
          const statusResult = await checkQuestionsStatus(jobId);
          
          if (statusResult.status === 'completed') {
            if (pollingIntervalRef.current) {
              clearInterval(pollingIntervalRef.current);
              pollingIntervalRef.current = null;
            }
            if (pollingTimeoutRef.current) {
              clearTimeout(pollingTimeoutRef.current);
              pollingTimeoutRef.current = null;
            }
            setFollowUpQuestions(statusResult.questions || []);
            setLoadingQuestions(false);
          } else if (statusResult.status === 'failed') {
            if (pollingIntervalRef.current) {
              clearInterval(pollingIntervalRef.current);
              pollingIntervalRef.current = null;
            }
            if (pollingTimeoutRef.current) {
              clearTimeout(pollingTimeoutRef.current);
              pollingTimeoutRef.current = null;
            }
            setQuestionsError(statusResult.error || 'Failed to generate questions. Please try again.');
            setLoadingQuestions(false);
          }
          // If still generating, continue polling
        } catch (err) {
          console.error('Error checking question status:', err);
          // Don't stop polling on transient errors
        }
      }, 2000); // Poll every 2 seconds
      
      // Stop polling after 120 seconds max (2 minutes)
      pollingTimeoutRef.current = setTimeout(() => {
        if (pollingIntervalRef.current) {
          clearInterval(pollingIntervalRef.current);
          pollingIntervalRef.current = null;
        }
        setLoadingQuestions(false);
        setQuestionsError('Question generation is taking longer than expected. Please check the server logs or try again.');
        pollingTimeoutRef.current = null;
      }, 120000); // Increased to 2 minutes
      
    } catch (err) {
      console.error('Error starting question generation:', err);
      setQuestionsError(err.message || 'Failed to start question generation. Please try again.');
      setLoadingQuestions(false);
    }
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

  if (error) {
    return (
      <div className="min-h-screen bg-brand-background flex items-center justify-center p-6 relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-14 left-8 w-80 h-80 bg-brand-accent-soft/25 rounded-full blur-3xl" />
        </div>
        <div className="glass rounded-3xl p-8 shadow-2xl max-w-md text-center border border-brand-accent/30 relative z-10">
          <div className="text-5xl mb-4">⚠️</div>
          <h2 className="text-2xl font-bold bg-gradient-to-r from-brand-accent-soft via-brand-accent to-brand-accent-strong bg-clip-text text-transparent mb-2">Error</h2>
          <p className="text-brand-muted mb-6">{error}</p>
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

  if (!data) {
    return (
      <div className="min-h-screen bg-brand-background flex items-center justify-center p-6 relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-14 left-8 w-80 h-80 bg-brand-accent-soft/25 rounded-full blur-3xl" />
        </div>
        <div className="glass rounded-3xl p-8 shadow-2xl max-w-md text-center border border-brand-accent/30 relative z-10">
          <div className="text-5xl mb-4">⚠️</div>
          <h2 className="text-2xl font-bold bg-gradient-to-r from-brand-accent-soft via-brand-accent to-brand-accent-strong bg-clip-text text-transparent mb-2">No Data</h2>
          <p className="text-brand-muted mb-6">Results data not available. Please check the job ID and try again.</p>
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

        {/* Follow-Up Questions Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="mt-6"
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold bg-gradient-to-r from-brand-accent-soft via-brand-accent to-brand-accent-strong bg-clip-text text-transparent">
              Audience Engagement
            </h2>
            <button
              onClick={handleGenerateQuestions}
              disabled={loadingQuestions || !data?.transcript || !data?.transcript.trim()}
              className="px-6 py-3 rounded-2xl bg-gradient-to-r from-brand-accent-soft via-brand-accent to-brand-accent-strong text-brand-text font-semibold shadow-lg shadow-brand-accent/20 hover:scale-105 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center space-x-2"
              title={!data?.transcript || !data?.transcript.trim() ? "No transcript available for this presentation" : "Generate AI-powered follow-up questions"}
            >
              {loadingQuestions ? (
                <>
                  <div className="w-5 h-5 border-2 border-brand-text border-t-transparent rounded-full animate-spin" />
                  <span>Generating...</span>
                </>
              ) : (
                <>
                  <span>Generate Follow-Up Questions</span>
                </>
              )}
            </button>
          </div>
          
          <FollowUpQuestions
            questions={followUpQuestions}
            loading={loadingQuestions}
            error={questionsError}
            onClose={() => {
              setFollowUpQuestions(null);
              setQuestionsError('');
            }}
          />
        </motion.div>
      </div>
    </div>
  );
};
