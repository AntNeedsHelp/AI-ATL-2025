import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Loader2 } from 'lucide-react';
import { checkStatus } from '../utils/api';

export const Loading = () => {
  const { jobId } = useParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState('processing');
  const [error, setError] = useState('');

  useEffect(() => {
    let interval;

    const pollStatus = async () => {
      try {
        const result = await checkStatus(jobId);
        
        if (result.status === 'completed') {
          clearInterval(interval);
          navigate(`/results/${jobId}`);
        } else if (result.status === 'failed') {
          clearInterval(interval);
          setError('Analysis failed. Please try again.');
        } else {
          setStatus(result.status || 'processing');
        }
      } catch (err) {
        console.error('Error polling status:', err);
        setError('Failed to check status. Please refresh the page.');
      }
    };

    // Poll immediately
    pollStatus();

    // Then poll every 5 seconds
    interval = setInterval(pollStatus, 5000);

    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [jobId, navigate]);

  if (error) {
    return (
      <div className="min-h-screen bg-brand-background flex items-center justify-center p-6 relative overflow-hidden">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-10 left-0 w-80 h-80 rounded-full bg-brand-accent-strong/25 blur-3xl animate-pulse" />
          <div className="absolute bottom-10 right-0 w-96 h-96 rounded-full bg-brand-accent-soft/20 blur-3xl animate-pulse" style={{ animationDelay: '2s' }} />
        </div>
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center relative z-10"
        >
          <div className="glass rounded-3xl p-8 shadow-2xl max-w-md border border-brand-accent/30">
            <div className="text-5xl mb-4">⚠️</div>
            <h2 className="text-2xl font-bold bg-gradient-to-r from-brand-accent-soft via-brand-accent to-brand-accent-strong bg-clip-text text-transparent mb-2">
              Something went wrong
            </h2>
            <p className="text-brand-muted mb-6">{error}</p>
            <button
              onClick={() => navigate('/')}
              className="px-6 py-3 rounded-2xl bg-gradient-to-r from-brand-accent-soft via-brand-accent to-brand-accent-strong text-brand-text shadow-lg shadow-brand-accent/20 hover:scale-105 transition-all duration-300"
            >
              Back to Upload
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-brand-background flex items-center justify-center p-6 relative overflow-hidden">
      {/* Animated background orbs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-16 left-0 w-96 h-96 bg-brand-accent/25 rounded-full blur-3xl animate-pulse" />
        <div className="absolute top-32 right-4 w-96 h-96 bg-brand-accent-strong/25 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }} />
        <div className="absolute bottom-16 left-1/2 w-96 h-96 bg-brand-accent-soft/25 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '4s' }} />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center relative z-10"
      >
        <div className="glass rounded-3xl p-12 shadow-2xl max-w-md border border-brand-accent/30">
          <motion.div
            animate={{
              rotate: 360,
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: 'linear',
            }}
            className="inline-block mb-6"
          >
          <div className="w-20 h-20 rounded-full bg-gradient-to-r from-brand-accent-soft via-brand-accent to-brand-accent-strong flex items-center justify-center shadow-inner shadow-brand-accent/30">
            <Loader2 className="w-12 h-12 text-brand-text" />
            </div>
          </motion.div>

          <h2 className="text-3xl font-bold bg-gradient-to-r from-brand-accent-soft via-brand-accent to-brand-accent-strong bg-clip-text text-transparent mb-3">
            Analyzing your presentation...
          </h2>

          <p className="text-brand-muted mb-6">
            This may take a minute. Our AI agents are reviewing your gestures, speech, clarity, and content.
          </p>

          <div className="flex justify-center space-x-2 mb-4">
            {[0, 1, 2].map((i) => (
              <motion.div
                key={i}
                className="w-3 h-3 bg-brand-accent rounded-full"
                animate={{
                  y: [0, -10, 0],
                  opacity: [0.5, 1, 0.5],
                }}
                transition={{
                  duration: 1,
                  repeat: Infinity,
                  delay: i * 0.2,
                }}
              />
            ))}
          </div>

          <p className="text-sm text-brand-muted-dark capitalize">
            Status: {status}
          </p>
        </div>
      </motion.div>
    </div>
  );
};
