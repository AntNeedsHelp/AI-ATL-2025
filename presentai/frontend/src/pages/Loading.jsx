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
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 flex items-center justify-center p-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center"
        >
          <div className="bg-white rounded-2xl p-8 shadow-lg max-w-md">
            <div className="text-red-500 text-5xl mb-4">⚠️</div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Something went wrong
            </h2>
            <p className="text-gray-600 mb-6">{error}</p>
            <button
              onClick={() => navigate('/')}
              className="px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-2xl hover:from-blue-600 hover:to-purple-700 transition-all"
            >
              Back to Upload
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 flex items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center"
      >
        <div className="bg-white rounded-2xl p-12 shadow-lg max-w-md">
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
            <Loader2 className="w-16 h-16 text-blue-500" />
          </motion.div>

          <h2 className="text-3xl font-bold text-gray-900 mb-3">
            Analyzing your presentation...
          </h2>

          <p className="text-gray-600 mb-6">
            This may take a minute. Our AI agents are reviewing your gestures, speech, clarity, and content.
          </p>

          <div className="flex justify-center space-x-2 mb-4">
            {[0, 1, 2].map((i) => (
              <motion.div
                key={i}
                className="w-3 h-3 bg-blue-500 rounded-full"
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

          <p className="text-sm text-gray-500 capitalize">
            Status: {status}
          </p>
        </div>
      </motion.div>
    </div>
  );
};
