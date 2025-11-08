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
    <div className="min-h-screen bg-gradient-to-br from-blue-100 via-purple-100 to-pink-100 animate-gradient-xy flex items-center justify-center p-6 relative overflow-hidden">
      {/* Animated background orbs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-72 h-72 bg-blue-400 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-pulse"></div>
        <div className="absolute top-40 right-10 w-72 h-72 bg-purple-400 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-pulse" style={{ animationDelay: '2s' }}></div>
        <div className="absolute bottom-20 left-1/2 w-72 h-72 bg-pink-400 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-pulse" style={{ animationDelay: '4s' }}></div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-2xl relative z-10"
      >
        <div className="text-center mb-8">
          <motion.h1 
            className="text-6xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent mb-3 animate-gradient-x"
            initial={{ scale: 0.9 }}
            animate={{ scale: 1 }}
            transition={{ duration: 0.5, type: "spring" }}
          >
            PresentAI
          </motion.h1>
          <p className="text-gray-700 text-lg font-medium">
            Upload your presentation for AI-powered feedback
          </p>
        </div>

        <Card className="glass shadow-2xl">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Video Upload */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Presentation Video <span className="text-red-500">*</span>
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
                  className="flex items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 rounded-2xl cursor-pointer hover:border-blue-500 transition-all duration-300 bg-gradient-to-br from-gray-50 to-blue-50 hover:from-blue-50 hover:to-purple-50 hover:shadow-lg"
                >
                  <div className="text-center">
                    <Video className="mx-auto h-10 w-10 text-gray-400 mb-2" />
                    <p className="text-sm text-gray-600">
                      {video ? video.name : 'Click to upload video (.mp4)'}
                    </p>
                  </div>
                </label>
              </div>
            </div>

            {/* Optional Document Upload */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
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
                  className="flex items-center justify-center w-full h-24 border-2 border-dashed border-gray-300 rounded-2xl cursor-pointer hover:border-purple-500 transition-all duration-300 bg-gradient-to-br from-gray-50 to-purple-50 hover:from-purple-50 hover:to-pink-50 hover:shadow-lg"
                >
                  <div className="text-center">
                    <FileText className="mx-auto h-8 w-8 text-gray-400 mb-1" />
                    <p className="text-sm text-gray-600">
                      {document ? document.name : 'Upload slides or script (.pdf, .docx, .txt)'}
                    </p>
                  </div>
                </label>
              </div>
            </div>

            {/* Title Input */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Presentation Title (Optional)
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., Q4 Sales Report"
                className="w-full px-4 py-3 border border-gray-300 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={uploading}
              />
            </div>

            {error && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="p-4 bg-red-50 border border-red-200 rounded-2xl text-red-700 text-sm"
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
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2" />
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
