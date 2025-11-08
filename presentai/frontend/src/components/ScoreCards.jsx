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
        className="lg:col-span-1 bg-gradient-to-br from-brand-accent-soft via-brand-accent to-brand-accent-strong rounded-3xl p-6 text-brand-text shadow-2xl shadow-brand-accent/30 border border-brand-accent/40 relative overflow-hidden"
      >
        {/* Animated gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-brand-text/15 to-transparent animate-gradient-xy opacity-50"></div>
        
        <div className="text-center relative z-10">
          <p className="text-sm font-medium opacity-90 mb-2 text-brand-text/80">Overall Score</p>
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
            className="text-7xl font-bold mb-1 drop-shadow-lg"
          >
            {scores.total}
          </motion.div>
          <p className="text-sm opacity-75 text-brand-text/75">out of 100</p>
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
            className="glass rounded-3xl p-6 shadow-lg shadow-black/40 border border-brand-border/40 hover:shadow-xl transition-shadow duration-300"
          >
            <div className="flex items-start justify-between mb-3">
              <div>
                <h3 className="font-semibold text-brand-text mb-1">
                  {category.name}
                </h3>
                <p className="text-2xl font-bold" style={{ color: category.color }}>
                  {cat.score}
                  <span className="text-sm text-brand-muted-dark font-normal ml-1">/ {cat.max}</span>
                </p>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="w-full h-2 bg-brand-surface-alt/70 rounded-full overflow-hidden">
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
