import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Loader2 } from 'lucide-react';
import { checkStatus, getResult } from '../utils/api';

export const Loading = () => {
  const { jobId } = useParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState('processing');
  const [error, setError] = useState('');
  const intervalRef = useRef(null);
  const isNavigatingRef = useRef(false);

  useEffect(() => {
    const pollStatus = async () => {
      // Prevent multiple navigation attempts
      if (isNavigatingRef.current) {
        console.log('[Loading] Already navigating, skipping poll');
        return;
      }

      try {
        console.log(`[Loading] Polling status for job: ${jobId}`);
        const result = await checkStatus(jobId);
        console.log(`[Loading] Status response:`, result);
        
        if (result.status === 'completed') {
          console.log(`[Loading] Job completed! Navigating to results...`);
          isNavigatingRef.current = true;
          if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
          }
          // Use setTimeout to ensure state updates are processed
          setTimeout(() => {
            navigate(`/results/${jobId}`);
          }, 100);
        } else if (result.status === 'failed') {
          console.log(`[Loading] Status is 'failed', checking if results exist...`);
          // Even if status is "failed", check if results actually exist
          // This handles cases where job failed but partial results were saved
          try {
            const results = await getResult(jobId);
            console.log(`[Loading] Results exist despite 'failed' status! Navigating to results...`);
            // If we can load results, navigate to results page
            isNavigatingRef.current = true;
            if (intervalRef.current) {
              clearInterval(intervalRef.current);
              intervalRef.current = null;
            }
            setTimeout(() => {
              navigate(`/results/${jobId}`);
            }, 100);
          } catch (resultsErr) {
            console.error(`[Loading] Results don't exist:`, resultsErr);
            // Results don't exist, show error
            isNavigatingRef.current = true;
            if (intervalRef.current) {
              clearInterval(intervalRef.current);
              intervalRef.current = null;
            }
            setError('Analysis failed. Please try again.');
          }
        } else {
          console.log(`[Loading] Status: ${result.status || 'processing'}`);
          setStatus(result.status || 'processing');
        }
      } catch (err) {
        console.error('[Loading] Error polling status:', err);
        // Try to check if results exist even if status check fails
        try {
          console.log(`[Loading] Status check failed, trying to load results directly...`);
          const results = await getResult(jobId);
          console.log(`[Loading] Results loaded successfully! Navigating to results...`);
          // If we can load results, navigate to results page
          isNavigatingRef.current = true;
          if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
          }
          setTimeout(() => {
            navigate(`/results/${jobId}`);
          }, 100);
        } catch (resultsErr) {
          console.error(`[Loading] Could not load results:`, resultsErr);
          setError('Failed to check status. Please refresh the page.');
        }
      }
    };

    // Poll immediately
    pollStatus();

    // Then poll every 3 seconds (reduced from 5 for faster response)
    intervalRef.current = setInterval(pollStatus, 3000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
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
