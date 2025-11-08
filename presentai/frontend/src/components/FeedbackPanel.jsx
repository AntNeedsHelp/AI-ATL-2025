import { motion, AnimatePresence } from 'framer-motion';
import { Lightbulb } from 'lucide-react';
import { CATEGORIES } from '../utils/markers';

export const FeedbackPanel = ({ currentMarker }) => {
  if (!currentMarker) {
    return (
      <div className="glass rounded-3xl p-8 min-h-[200px] flex items-center justify-center border-2 border-white/50 shadow-lg">
        <p className="text-gray-600 text-center font-medium text-lg">
          Click on a marker or play the video to see feedback
        </p>
      </div>
    );
  }

  const category = CATEGORIES[currentMarker.category];

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={currentMarker.start}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        transition={{ duration: 0.3 }}
        className="glass rounded-3xl p-8 min-h-[200px] shadow-xl border-2 hover:shadow-2xl transition-shadow duration-300"
        style={{ borderColor: category.color }}
      >
        <div className="flex items-start space-x-5">
          <div
            className="flex-shrink-0 w-14 h-14 rounded-full flex items-center justify-center"
            style={{ backgroundColor: `${category.color}20` }}
          >
            <Lightbulb
              className="w-7 h-7"
              style={{ color: category.color }}
            />
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
              <span className="text-sm text-gray-500 font-medium">
                {formatTime(currentMarker.start)}
                {currentMarker.end && ` - ${formatTime(currentMarker.end)}`}
              </span>
            </div>

            {/* Issue Label */}
            <div>
              <p className="text-gray-700 font-semibold text-lg mb-1">
                Issue:
              </p>
              <p className="text-gray-900 font-medium text-base">
                {currentMarker.label}
              </p>
            </div>

            {/* Feedback */}
            <div>
              <p className="text-gray-700 font-semibold text-lg mb-2">
                Feedback:
              </p>
              <p className="text-gray-700 leading-relaxed">
                {currentMarker.feedback || 'No specific feedback available for this issue.'}
              </p>
            </div>

            {/* Severity Indicator */}
            {currentMarker.severity && (
              <div className="flex items-center pt-2">
                <span className="text-sm text-gray-600 font-medium mr-3">Severity:</span>
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
                <span className="ml-3 text-sm text-gray-600">
                  {currentMarker.severity}/5
                </span>
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};
