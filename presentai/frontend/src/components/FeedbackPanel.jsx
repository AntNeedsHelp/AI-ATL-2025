import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Lightbulb } from 'lucide-react';
import { CATEGORIES } from '../utils/markers';

export const FeedbackPanel = ({ currentMarker }) => {
  const [showDescription, setShowDescription] = useState(false);
  const containerRef = useRef(null);

  // Reset description popup when marker changes
  useEffect(() => {
    setShowDescription(false);
  }, [currentMarker?.start, currentMarker?.category]);

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

  return (
    <div className="relative">
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
          onMouseEnter={() => setShowDescription(true)}
          onMouseLeave={() => setShowDescription(false)}
        >
          <div className="flex items-start space-x-5">
            <div
              ref={containerRef}
              className="relative flex-shrink-0"
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
