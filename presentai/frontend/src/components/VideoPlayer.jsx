import { useRef, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Play, Pause } from 'lucide-react';
import { CATEGORIES, calculateMarkerPosition, calculateMarkerWidth } from '../utils/markers';

export const VideoPlayer = ({ videoUrl, markers, activeFilter, onTimeUpdate, onMarkerClick }) => {
  const videoRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  const filteredMarkers = activeFilter === 'all' 
    ? markers 
    : markers.filter(m => m.category === activeFilter);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleTimeUpdate = () => {
      setCurrentTime(video.currentTime);
      onTimeUpdate(video.currentTime);
    };

    const handleLoadedMetadata = () => {
      setDuration(video.duration);
    };

    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('loadedmetadata', handleLoadedMetadata);

    return () => {
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('loadedmetadata', handleLoadedMetadata);
    };
  }, [onTimeUpdate]);

  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;

    if (isPlaying) {
      video.pause();
    } else {
      video.play();
    }
    setIsPlaying(!isPlaying);
  };

  const handleSeek = (e) => {
    const video = videoRef.current;
    if (!video) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percentage = x / rect.width;
    const newTime = percentage * duration;
    
    video.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const handleMarkerClickInternal = (marker) => {
    const video = videoRef.current;
    if (!video) return;

    // Jump to 1 second before the marker for context
    const jumpTime = Math.max(0, marker.start - 1);
    video.currentTime = jumpTime;
    setCurrentTime(jumpTime);
    onMarkerClick(marker);
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="space-y-4">
      {/* Video */}
      <div className="relative bg-black rounded-2xl overflow-hidden shadow-lg">
        <video
          ref={videoRef}
          src={videoUrl}
          className="w-full aspect-video"
          onClick={togglePlay}
        />
        
        {/* Play/Pause Overlay */}
        <button
          onClick={togglePlay}
          className="absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 hover:opacity-100 transition-opacity"
        >
          {isPlaying ? (
            <Pause className="w-16 h-16 text-white" />
          ) : (
            <Play className="w-16 h-16 text-white" />
          )}
        </button>
      </div>

      {/* Custom Timeline with Markers */}
      <div className="space-y-2">
        <div className="flex justify-between text-sm text-gray-600 px-1">
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(duration)}</span>
        </div>

        <div 
          className="relative h-12 bg-gray-200 rounded-full cursor-pointer overflow-visible"
          onClick={handleSeek}
        >
          {/* Progress Bar */}
          <motion.div
            className="absolute inset-y-0 left-0 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full"
            style={{ width: `${(currentTime / duration) * 100}%` }}
            initial={false}
          />

          {/* Markers */}
          {filteredMarkers.map((marker, idx) => {
            const category = CATEGORIES[marker.category];
            const left = calculateMarkerPosition(marker.start, duration);
            const width = calculateMarkerWidth(marker.start, marker.end, duration);

            return (
              <motion.div
                key={idx}
                className="absolute top-0 bottom-0 group"
                style={{
                  left: `${left}%`,
                  width: `${Math.max(width, 2)}%`,
                  backgroundColor: category.color,
                  opacity: 0.7,
                }}
                initial={{ scaleY: 0.6 }}
                whileHover={{ scaleY: 1, opacity: 1 }}
                onClick={(e) => {
                  e.stopPropagation();
                  handleMarkerClickInternal(marker);
                }}
              >
                {/* Tooltip */}
                <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-10">
                  <div className="font-medium">{marker.label}</div>
                  <div className="text-gray-300">{formatTime(marker.start)}</div>
                  <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-gray-900" />
                </div>
              </motion.div>
            );
          })}

          {/* Playhead */}
          <motion.div
            className="absolute top-1/2 transform -translate-y-1/2 w-4 h-4 bg-white border-2 border-blue-600 rounded-full shadow-lg"
            style={{ left: `${(currentTime / duration) * 100}%`, marginLeft: '-8px' }}
            initial={false}
          />
        </div>
      </div>
    </div>
  );
};
