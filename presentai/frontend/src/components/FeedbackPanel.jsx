import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Lightbulb, Maximize2, X, Video } from 'lucide-react';
import { CATEGORIES } from '../utils/markers';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export const FeedbackPanel = ({ currentMarker }) => {
  const [showDescription, setShowDescription] = useState(false);
  const [showVideoPopup, setShowVideoPopup] = useState(false);
  const [videoError, setVideoError] = useState(null);
  const [showVideoOverlay, setShowVideoOverlay] = useState(false);
  const containerRef = useRef(null);
  const videoPopupRef = useRef(null);

  // Reset description popup and video error when marker changes
  useEffect(() => {
    setShowDescription(false);
    setShowVideoPopup(false);
    setVideoError(null);
    setShowVideoOverlay(false);
  }, [currentMarker?.start, currentMarker?.category, currentMarker?.video_url]);

  // Close overlay on Escape key (must be before early return to follow Rules of Hooks)
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && showVideoOverlay) {
        setShowVideoOverlay(false);
      }
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [showVideoOverlay]);

  if (!currentMarker) {
    return (
      <div className="glass rounded-3xl p-8 min-h-[200px] flex items-center justify-center border border-brand-border/50 shadow-lg shadow-black/40">
        <p className="text-brand-muted text-center font-medium text-lg">
          Click on a marker or play the video to see feedback
        </p>
      </div>
    );
  }

  // Safely get category, with fallback and debug logging
  const categoryKey = currentMarker.category || 'gestures';
  const category = CATEGORIES[categoryKey] || CATEGORIES.gestures;
  
  // Debug: Log if category is missing or incorrect
  if (!CATEGORIES[categoryKey]) {
    console.warn('Unknown category:', categoryKey, 'Marker:', currentMarker, 'Using fallback: gestures');
  }

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Get video URL if available (only if currentMarker exists)
  const videoUrl = currentMarker?.video_url 
    ? (currentMarker.video_url.startsWith('http') 
        ? currentMarker.video_url 
        : `${API_BASE_URL}${currentMarker.video_url}`)
    : null;

  return (
    <div className="relative">
      {/* Video Overlay Modal */}
      <AnimatePresence>
        {showVideoOverlay && currentMarker && currentMarker.category === "gestures" && videoUrl && category && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100]"
              onClick={() => setShowVideoOverlay(false)}
            />
            {/* Modal Content */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-4 sm:inset-8 md:inset-16 lg:inset-20 xl:inset-32 z-[101] flex items-center justify-center"
              onClick={(e) => e.stopPropagation()}
            >
              <div 
                className="relative w-full h-full max-w-6xl max-h-[90vh] glass rounded-3xl p-6 shadow-2xl border border-brand-border/60 flex flex-col"
              >
                {/* Header */}
                <div className="flex items-center justify-between mb-4">
                  <h3 
                    className="text-2xl font-bold"
                    style={{ color: category?.color || '#ffffff' }}
                  >
                    Gesture Demonstration
                  </h3>
                  <button
                    onClick={() => setShowVideoOverlay(false)}
                    className="p-2 rounded-full hover:bg-brand-surface-alt transition-colors"
                    aria-label="Close video overlay"
                  >
                    <X className="w-6 h-6 text-brand-text" />
                  </button>
                </div>
                {/* Video Container */}
                <div className="flex-1 relative rounded-xl overflow-hidden bg-black">
                  {videoError ? (
                    <div className="w-full h-full flex items-center justify-center p-8">
                      <div className="text-center">
                        <p className="text-lg text-brand-muted mb-2">⚠️ Video Load Failed</p>
                        <p className="text-sm text-brand-muted-dark mb-4">
                          {videoError === '404' 
                            ? 'Video may still be generating. Please refresh in a moment.'
                            : 'Unable to load video. Please try again later.'}
                        </p>
                        <button
                          onClick={() => {
                            setVideoError(null);
                          }}
                          className="px-4 py-2 rounded bg-brand-surface text-brand-text hover:bg-brand-surface-glow transition-colors"
                        >
                          Retry
                        </button>
                      </div>
                    </div>
                  ) : (
                    <video
                      key={`overlay-video-${currentMarker.start}-${currentMarker.end}`}
                      src={videoUrl}
                      className="w-full h-full object-contain"
                      controls
                      autoPlay
                      playsInline
                      crossOrigin="anonymous"
                      onError={(e) => {
                        const video = e.target;
                        const error = video.error;
                        console.error('Error loading gesture video in overlay:', {
                          error: error,
                          code: error?.code,
                          message: error?.message,
                          src: video.src,
                        });
                        
                        if (error) {
                          const isNetworkError = error.code === 2 || error.code === 4 || video.networkState === 3;
                          if (isNetworkError) {
                            fetch(video.src, { method: 'HEAD' })
                              .then(response => {
                                if (response.status === 404) {
                                  setVideoError('404');
                                } else {
                                  setVideoError('network');
                                }
                              })
                              .catch(() => {
                                setVideoError('network');
                              });
                          } else {
                            setVideoError('other');
                          }
                        } else {
                          setVideoError('other');
                        }
                      }}
                      onLoadStart={() => {
                        setVideoError(null);
                      }}
                      onLoadedData={() => {
                        setVideoError(null);
                      }}
                    >
                      Your browser does not support the video tag.
                    </video>
                  )}
                </div>
                {/* Footer */}
                <div className="mt-4 text-center">
                  <p className="text-sm text-brand-muted">
                    Watch this demonstration to see the improved gesture technique
                  </p>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Category Description Popup - positioned above the feedback box */}
      <AnimatePresence>
        {showDescription && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 10 }}
            transition={{ duration: 0.2 }}
            className="absolute bottom-full left-0 mb-3 z-50 w-72 sm:w-80 glass rounded-2xl p-5 shadow-2xl border border-brand-border/60 max-w-[calc(100vw-2rem)] pointer-events-auto"
            style={{
              borderColor: `${category.color}66`,
              backgroundColor: 'rgba(20, 20, 30, 0.95)',
            }}
            onMouseEnter={() => setShowDescription(true)}
            onMouseLeave={() => setShowDescription(false)}
          >
            <div className="flex items-start justify-between mb-3">
              <h5
                className="font-bold text-lg"
                style={{ color: category.color }}
              >
                {category.name}
              </h5>
            </div>
            <p className="text-brand-muted text-sm leading-relaxed">
              {category.description}
            </p>
            {/* Arrow pointing down to the feedback box */}
            <div
              className="absolute -bottom-2 left-6 w-4 h-4 transform rotate-45"
              style={{
                backgroundColor: 'rgba(20, 20, 30, 0.95)',
                borderRight: `1px solid ${category.color}66`,
                borderBottom: `1px solid ${category.color}66`,
              }}
            />
          </motion.div>
        )}
      </AnimatePresence>


      <AnimatePresence mode="wait">
        <motion.div
          key={`${currentMarker.category}-${currentMarker.start}-${currentMarker.end}`}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.3 }}
          className="glass rounded-3xl p-8 min-h-[200px] shadow-xl border hover:shadow-2xl transition-shadow duration-300"
          style={{ borderColor: `${category.color}66` }}
        >
          <div className="flex items-start space-x-5 flex-wrap lg:flex-nowrap">
            {/* Icon Buttons Container - Stacked vertically */}
            <div className="flex flex-col items-center space-y-3 flex-shrink-0">
              {/* Category Description Button (Lightbulb) */}
              <div
                ref={containerRef}
                className="relative"
                onMouseEnter={() => setShowDescription(true)}
                onMouseLeave={() => setShowDescription(false)}
              >
                <div
                  className="flex-shrink-0 w-14 h-14 rounded-full flex items-center justify-center transition-all duration-200 hover:scale-110 cursor-pointer"
                  style={{
                    backgroundColor: `${category.color}22`,
                  }}
                  aria-label="Category description"
                >
                  <Lightbulb
                    className="w-7 h-7 transition-transform duration-200"
                    style={{ color: category.color }}
                  />
                </div>
              </div>

              {/* Gesture Video Button (only for gesture markers with video) */}
              {currentMarker.category === "gestures" && currentMarker.video_url && (
                <div
                  ref={videoPopupRef}
                  className="relative"
                  onMouseEnter={() => setShowVideoPopup(true)}
                  onMouseLeave={() => setShowVideoPopup(false)}
                >
                  <div
                    className="flex-shrink-0 w-14 h-14 rounded-full flex items-center justify-center transition-all duration-200 hover:scale-110 cursor-pointer"
                    style={{
                      backgroundColor: `${category.color}22`,
                    }}
                    aria-label="Show improved gesture video"
                    title="Hover to see improved gesture example"
                  >
                    <Video
                      className="w-7 h-7 transition-transform duration-200"
                      style={{ color: category.color }}
                    />
                  </div>
                  {/* Gesture Video Popup - positioned above and to the right of the video button */}
                  <AnimatePresence>
                    {showVideoPopup && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 10 }}
                        transition={{ duration: 0.2 }}
                        className="absolute bottom-full left-full mb-3 ml-3 z-[60] w-96 sm:w-[28rem] md:w-[32rem] lg:w-[36rem] glass rounded-2xl p-5 shadow-2xl border border-brand-border/60 max-w-[calc(100vw-2rem)] pointer-events-auto"
                        style={{
                          borderColor: `${category.color}66`,
                          backgroundColor: 'rgba(20, 20, 30, 0.95)',
                        }}
                        onMouseEnter={() => setShowVideoPopup(true)}
                        onMouseLeave={() => setShowVideoPopup(false)}
                      >
                        {/* Arrow pointing down to the video button */}
                        <div
                          className="absolute -bottom-2 -left-2 w-4 h-4 transform rotate-45"
                          style={{
                            backgroundColor: 'rgba(20, 20, 30, 0.95)',
                            borderRight: `1px solid ${category.color}66`,
                            borderBottom: `1px solid ${category.color}66`,
                          }}
                        />
                        <div className="flex items-center justify-between mb-4">
                          <h5
                            className="font-bold text-xl"
                            style={{ color: category.color }}
                          >
                            Improved Gesture Example
                          </h5>
                          <button
                            onClick={() => setShowVideoOverlay(true)}
                            className="p-2 rounded-full hover:bg-brand-surface-alt transition-colors"
                            aria-label="Expand video"
                            title="Expand video to full size"
                          >
                            <Maximize2 className="w-5 h-5" style={{ color: category.color }} />
                          </button>
                        </div>
                        <div className="relative rounded-xl overflow-hidden bg-black" style={{ aspectRatio: '16/9' }}>
                          {videoError ? (
                            <div className="w-full aspect-video flex items-center justify-center p-4">
                              <div className="text-center">
                                <p className="text-sm text-brand-muted mb-2">⚠️ Video Load Failed</p>
                                <p className="text-xs text-brand-muted-dark mb-3">
                                  {videoError === '404' 
                                    ? 'Video may still be generating. Please refresh in a moment.'
                                    : 'Unable to load video. Please try again later.'}
                                </p>
                                <button
                                  onClick={() => {
                                    setVideoError(null);
                                    const video = document.querySelector(`video[data-marker-id="${currentMarker.start}"]`);
                                    if (video) {
                                      video.load();
                                    }
                                  }}
                                  className="text-xs px-3 py-1 rounded bg-brand-surface text-brand-text hover:bg-brand-surface-glow transition-colors"
                                >
                                  Retry
                                </button>
                              </div>
                            </div>
                          ) : (
                            <video
                              key={`popup-video-${currentMarker.start}-${currentMarker.end}`}
                              data-marker-id={currentMarker.start}
                              src={videoUrl}
                              className="w-full aspect-video object-contain"
                              controls
                              preload="metadata"
                              playsInline
                              crossOrigin="anonymous"
                              onError={(e) => {
                                const video = e.target;
                                const error = video.error;
                                console.error('Error loading gesture video in popup:', {
                                  error: error,
                                  code: error?.code,
                                  message: error?.message,
                                  src: video.src,
                                });
                                
                                if (error) {
                                  const isNetworkError = error.code === 2 || error.code === 4 || video.networkState === 3;
                                  if (isNetworkError) {
                                    fetch(video.src, { method: 'HEAD' })
                                      .then(response => {
                                        if (response.status === 404) {
                                          setVideoError('404');
                                        } else {
                                          setVideoError('network');
                                        }
                                      })
                                      .catch(() => {
                                        setVideoError('network');
                                      });
                                  } else {
                                    setVideoError('other');
                                  }
                                } else {
                                  setVideoError('other');
                                }
                              }}
                              onLoadStart={() => {
                                console.log('Gesture video load started in popup:', currentMarker.video_url);
                                setVideoError(null);
                              }}
                              onLoadedData={() => {
                                console.log('Gesture video loaded successfully in popup');
                                setVideoError(null);
                              }}
                            >
                              Your browser does not support the video tag.
                            </video>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}

              {/* Gesture Video Generating Message (only if no video_url yet) */}
              {currentMarker.category === "gestures" && !currentMarker.video_url && (
                <div className="flex-shrink-0">
                  <div className="w-14 h-14 rounded-full flex items-center justify-center bg-brand-surface-alt border border-brand-border/60">
                    <span className="text-xs text-brand-muted">⏳</span>
                  </div>
                </div>
              )}
            </div>

            <div className="flex-1 space-y-4">
              {/* Category and Time */}
              <div className="flex items-center justify-between">
                <h4
                  className="font-bold text-xl"
                  style={{ color: category.color }}
                >
                  {category.name}
                </h4>
                <span className="text-sm text-brand-muted-dark font-medium">
                  {formatTime(currentMarker.start)}
                  {currentMarker.end && ` - ${formatTime(currentMarker.end)}`}
                </span>
              </div>

              {/* Issue Label */}
              <div>
                <p className="text-brand-muted font-semibold text-lg mb-1">
                  Issue:
                </p>
                <p className="text-brand-text font-medium text-base">
                  {currentMarker.label}
                </p>
              </div>

              {/* Feedback */}
              <div>
                <p className="text-brand-muted font-semibold text-lg mb-2">
                  Feedback:
                </p>
                <p className="text-brand-muted leading-relaxed">
                  {currentMarker.feedback || 'No specific feedback available for this issue.'}
                </p>
              </div>

              {/* Severity Indicator */}
              {currentMarker.severity && (
                <div className="flex items-center pt-2">
                  <span className="text-sm text-brand-muted-dark font-medium mr-3">Severity:</span>
                  <div className="flex space-x-1.5">
                    {[1, 2, 3, 4, 5].map((level) => (
                      <div
                        key={level}
                        className={`w-3 h-5 rounded-full transition-all ${
                          level <= currentMarker.severity
                            ? 'opacity-100'
                            : 'opacity-20'
                        }`}
                        style={{
                          backgroundColor: category.color,
                        }}
                      />
                    ))}
                  </div>
                  <span className="ml-3 text-sm text-brand-muted-dark">
                    {currentMarker.severity}/5
                  </span>
                </div>
              )}
            </div>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
};
