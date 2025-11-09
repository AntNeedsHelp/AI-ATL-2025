import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Upload as UploadIcon, FileText, Video } from 'lucide-react';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { uploadPresentation } from '../utils/api';

export const Upload = () => {
  const navigate = useNavigate();
  const [video, setVideo] = useState(null);
  const [document, setDocument] = useState(null);
  const [title, setTitle] = useState('');
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  const handleVideoChange = (e) => {
    const file = e.target.files[0];
    if (file && file.type.startsWith('video/')) {
      setVideo(file);
      setError('');
    } else {
      setError('Please select a valid video file (.mp4)');
    }
  };

  const handleDocumentChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setDocument(file);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!video) {
      setError('Please select a video file');
      return;
    }

    setUploading(true);
    setError('');

    try {
      const result = await uploadPresentation(video, document, title);
      navigate(`/loading/${result.job_id}`);
    } catch (err) {
      setError(err.message || 'Failed to upload presentation');
      setUploading(false);
    }
  };

  return (
    <div className="min-h-screen bg-brand-background flex items-center justify-center p-6 relative overflow-hidden">
      {/* Animated background orbs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-16 -left-10 w-80 h-80 rounded-full bg-brand-accent/35 mix-blend-screen filter blur-3xl opacity-30 animate-pulse"></div>
        <div className="absolute top-40 right-0 w-96 h-96 rounded-full bg-brand-accent-strong/35 mix-blend-screen filter blur-3xl opacity-30 animate-pulse" style={{ animationDelay: '2s' }}></div>
        <div className="absolute bottom-16 left-1/3 w-80 h-80 rounded-full bg-brand-accent-soft/40 mix-blend-screen filter blur-3xl opacity-30 animate-pulse" style={{ animationDelay: '4s' }}></div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-2xl relative z-10"
      >
        <div className="text-center mb-8">
          <motion.h1 
            className="text-6xl font-bold bg-gradient-to-r from-brand-accent-soft via-brand-accent to-brand-accent-strong bg-clip-text text-transparent mb-3 animate-gradient-x"
            initial={{ scale: 0.9 }}
            animate={{ scale: 1 }}
            transition={{ duration: 0.5, type: "spring" }}
          >
            Plum
          </motion.h1>
          <p className="text-brand-muted text-lg font-medium">
            Upload your video for AI-powered feedback
          </p>
        </div>

        <Card className="glass shadow-2xl">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Video Upload */}
            <div>
              <label className="block text-sm font-medium text-brand-muted mb-2">
                Video <span className="text-brand-accent-soft">*</span>
              </label>
              <div className="relative">
                <input
                  type="file"
                  accept="video/mp4,video/quicktime"
                  onChange={handleVideoChange}
                  className="hidden"
                  id="video-upload"
                  disabled={uploading}
                />
                <label
                  htmlFor="video-upload"
                  className="flex items-center justify-center w-full h-32 border-2 border-dashed border-brand-border/60 rounded-2xl cursor-pointer transition-all duration-300 bg-brand-surface/70 hover:border-brand-accent hover:bg-brand-surface-alt/80 hover:shadow-lg"
                >
                  <div className="text-center">
                    <Video className="mx-auto h-10 w-10 text-brand-muted mb-2" />
                    <p className="text-sm text-brand-muted">
                      {video ? video.name : 'Click to upload video (.mp4)'}
                    </p>
                  </div>
                </label>
              </div>
            </div>

            {/* Optional Document Upload */}
            <div>
              <label className="block text-sm font-medium text-brand-muted mb-2">
                Supporting Document (Optional)
              </label>
              <div className="relative">
                <input
                  type="file"
                  accept=".pdf,.docx,.txt"
                  onChange={handleDocumentChange}
                  className="hidden"
                  id="doc-upload"
                  disabled={uploading}
                />
                <label
                  htmlFor="doc-upload"
                  className="flex items-center justify-center w-full h-24 border-2 border-dashed border-brand-border/60 rounded-2xl cursor-pointer transition-all duration-300 bg-brand-surface/70 hover:border-brand-accent-mid hover:bg-brand-surface-alt/80 hover:shadow-lg"
                >
                  <div className="text-center">
                    <FileText className="mx-auto h-8 w-8 text-brand-muted mb-1" />
                    <p className="text-sm text-brand-muted">
                      {document ? document.name : 'Upload slides or script (.pdf, .docx, .txt)'}
                    </p>
                  </div>
                </label>
              </div>
            </div>

            {/* Additional Context Input */}
            <div>
              <label className="block text-sm font-medium text-brand-muted mb-2">
                Additional Context (Optional)
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., Q4 Sales Report"
                className="w-full px-4 py-3 border border-brand-border/60 rounded-2xl bg-brand-surface-alt/60 text-brand-text placeholder:text-brand-muted focus:outline-none focus:ring-2 focus:ring-brand-accent focus:border-transparent"
                disabled={uploading}
              />
            </div>

            {error && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="p-4 bg-brand-surface-alt/70 border border-brand-accent/40 rounded-2xl text-brand-accent-soft text-sm"
              >
                {error}
              </motion.div>
            )}

            {/* Submit Button */}
            <Button
              type="submit"
              disabled={!video || uploading}
              size="lg"
              className="w-full"
            >
              {uploading ? (
                <div className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-brand-text mr-2" />
                  Uploading...
                </div>
              ) : (
                <div className="flex items-center justify-center">
                  <UploadIcon className="mr-2 h-5 w-5" />
                  Start Analysis
                </div>
              )}
            </Button>
          </form>
        </Card>
      </motion.div>
    </div>
  );
};
