import { motion, AnimatePresence } from 'framer-motion';
import { Lightbulb } from 'lucide-react';
import { CATEGORIES } from '../utils/markers';

export const FeedbackPanel = ({ currentMarker }) => {
  if (!currentMarker) {
    return (
      <div className="glass rounded-3xl p-6 min-h-[120px] flex items-center justify-center border-2 border-white/50 shadow-lg">
        <p className="text-gray-600 text-center font-medium">
          Click on a marker or play the video to see feedback
        </p>
      </div>
    );
  }

  const category = CATEGORIES[currentMarker.category];

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={currentMarker.start}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        transition={{ duration: 0.3 }}
        className="glass rounded-3xl p-6 shadow-xl border-2 hover:shadow-2xl transition-shadow duration-300"
        style={{ borderColor: category.color }}
      >
        <div className="flex items-start space-x-4">
          <div
            className="flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center"
            style={{ backgroundColor: `${category.color}20` }}
          >
            <Lightbulb
              className="w-6 h-6"
              style={{ color: category.color }}
            />
          </div>

          <div className="flex-1">
            <div className="flex items-center justify-between mb-2">
              <h4
                className="font-semibold text-lg"
                style={{ color: category.color }}
              >
                {category.name}
              </h4>
              <span className="text-sm text-gray-500">
                {Math.floor(currentMarker.start / 60)}:{String(Math.floor(currentMarker.start % 60)).padStart(2, '0')}
              </span>
            </div>

            <p className="text-gray-800 font-medium mb-2">
              {currentMarker.label}
            </p>

            <p className="text-gray-600">
              💡 {currentMarker.feedback}
            </p>

            {currentMarker.severity && (
              <div className="mt-3 flex items-center">
                <span className="text-xs text-gray-500 mr-2">Priority:</span>
                <div className="flex space-x-1">
                  {[1, 2, 3].map((level) => (
                    <div
                      key={level}
                      className={`w-2 h-4 rounded-full ${
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
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};
