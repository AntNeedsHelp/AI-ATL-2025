import { motion } from 'framer-motion';
import { CATEGORIES } from '../utils/markers';

export const ScoreCards = ({ scores }) => {
  const categoryScores = [
    { id: 'gestures', score: scores.gestures, max: 25 },
    { id: 'inflection', score: scores.inflection, max: 25 },
    { id: 'clarity', score: scores.clarity, max: 25 },
    { id: 'content', score: scores.content, max: 25 },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
      {/* Overall Score - Larger Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="lg:col-span-1 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl p-6 text-white shadow-lg"
      >
        <div className="text-center">
          <p className="text-sm font-medium opacity-90 mb-2">Overall Score</p>
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
            className="text-6xl font-bold mb-1"
          >
            {scores.total}
          </motion.div>
          <p className="text-sm opacity-75">out of 100</p>
        </div>
      </motion.div>

      {/* Category Scores */}
      {categoryScores.map((cat, idx) => {
        const category = CATEGORIES[cat.id];
        const percentage = (cat.score / cat.max) * 100;

        return (
          <motion.div
            key={cat.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: idx * 0.1 }}
            className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200"
          >
            <div className="flex items-start justify-between mb-3">
              <div>
                <h3 className="font-semibold text-gray-900 mb-1">
                  {category.name}
                </h3>
                <p className="text-2xl font-bold" style={{ color: category.color }}>
                  {cat.score}
                  <span className="text-sm text-gray-500 font-normal ml-1">/ {cat.max}</span>
                </p>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
              <motion.div
                className="h-full rounded-full"
                style={{ backgroundColor: category.color }}
                initial={{ width: 0 }}
                animate={{ width: `${percentage}%` }}
                transition={{ duration: 1, delay: 0.5 + idx * 0.1 }}
              />
            </div>
          </motion.div>
        );
      })}
    </div>
  );
};
