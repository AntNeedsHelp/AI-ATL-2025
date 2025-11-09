import { motion, AnimatePresence } from 'framer-motion';
import { HelpCircle, Loader2, X } from 'lucide-react';

export const FollowUpQuestions = ({ questions, loading, error, onClose }) => {
  // Don't render anything if there's nothing to show
  if (!questions && !loading && !error) {
    return null;
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 20 }}
        transition={{ duration: 0.3 }}
        className="glass rounded-3xl p-6 shadow-xl border border-brand-border/60"
      >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-r from-brand-accent-soft via-brand-accent to-brand-accent-strong flex items-center justify-center">
                <HelpCircle className="w-5 h-5 text-brand-text" />
              </div>
              <h3 className="text-xl font-bold bg-gradient-to-r from-brand-accent-soft via-brand-accent to-brand-accent-strong bg-clip-text text-transparent">
                Follow-Up Questions
              </h3>
            </div>
            {onClose && (
              <button
                onClick={onClose}
                className="text-brand-muted hover:text-brand-text transition-colors duration-200 p-1 rounded-full hover:bg-brand-surface/50"
                aria-label="Close questions"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>

          {loading && (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-8 h-8 text-brand-accent animate-spin" />
              <span className="ml-3 text-brand-muted">Generating questions...</span>
            </div>
          )}

          {error && (
            <div className="p-4 bg-brand-surface-alt/70 border border-brand-accent/40 rounded-2xl text-brand-accent-soft text-sm">
              {error}
            </div>
          )}

          {questions && questions.length > 0 && (
            <div className="space-y-3">
              {questions.map((question, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="p-4 bg-brand-surface-alt/50 rounded-2xl border border-brand-border/40 hover:border-brand-accent/60 transition-all duration-200 hover:shadow-lg"
                >
                  <div className="flex items-start space-x-3">
                    <div className="flex-shrink-0 w-6 h-6 rounded-full bg-brand-accent/20 flex items-center justify-center mt-0.5">
                      <span className="text-xs font-bold text-brand-accent">{index + 1}</span>
                    </div>
                    <p className="text-brand-text leading-relaxed flex-1">{question}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          )}

          {questions && questions.length === 0 && !loading && !error && (
            <p className="text-brand-muted text-center py-4">No questions generated.</p>
          )}
        </motion.div>
    </AnimatePresence>
  );
};

