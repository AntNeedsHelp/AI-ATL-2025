import { useRef, useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Play, Pause } from 'lucide-react';
import { CATEGORIES, calculateMarkerPosition, calculateMarkerWidth } from '../utils/markers';

export const VideoPlayer = ({ videoUrl, markers, activeFilter, onTimeUpdate, onMarkerClick }) => {
  const videoRef = useRef(null);
  const sliderRef = useRef(null);
  const animationFrameRef = useRef(null);
  const isRunningRef = useRef(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDragging, setIsDragging] = useState(false);

  const filteredMarkers = activeFilter === 'all' 
    ? markers 
    : markers.filter(m => m.category === activeFilter);

  // Reset state when video URL changes
  useEffect(() => {
    setIsLoading(true);
    setError(null);
    setCurrentTime(0);
    setDuration(0);
    setIsPlaying(false);
    
    const video = videoRef.current;
    if (video && videoUrl) {
      console.log('Loading video:', videoUrl);
      video.load();
    }
  }, [videoUrl]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleLoadedMetadata = () => {
      setDuration(video.duration);
      setIsLoading(false);
      setError(null);
    };

    const handleCanPlay = () => {
      setIsLoading(false);
      setError(null);
    };

    const handleError = (e) => {
      setIsLoading(false);
      setError('Failed to load video. Please check the URL and try again.');
      console.error('Video error:', video.error, videoUrl);
    };

    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);

    video.addEventListener('loadedmetadata', handleLoadedMetadata);
    video.addEventListener('canplay', handleCanPlay);
    video.addEventListener('error', handleError);
    video.addEventListener('play', handlePlay);
    video.addEventListener('pause', handlePause);

    // Use requestAnimationFrame for smooth, synchronized updates
    let lastTime = -1;
    isRunningRef.current = true;
    
    const updatePosition = () => {
      if (!isRunningRef.current) return;
      
      const currentVideo = videoRef.current;
      if (!currentVideo) {
        animationFrameRef.current = requestAnimationFrame(updatePosition);
        return;
      }
      
      const currentVideoTime = currentVideo.currentTime;
      
      // Always update - no threshold to ensure smooth, real-time sync
      if (Math.abs(currentVideoTime - lastTime) > 0.001 || isDragging) {
        lastTime = currentVideoTime;
        setCurrentTime(currentVideoTime);
        onTimeUpdate(currentVideoTime);
      }
      
      // Continue animation frame loop
      animationFrameRef.current = requestAnimationFrame(updatePosition);
    };

    // Start the animation loop
    animationFrameRef.current = requestAnimationFrame(updatePosition);

    return () => {
      isRunningRef.current = false;
      video.removeEventListener('loadedmetadata', handleLoadedMetadata);
      video.removeEventListener('canplay', handleCanPlay);
      video.removeEventListener('error', handleError);
      video.removeEventListener('play', handlePlay);
      video.removeEventListener('pause', handlePause);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [onTimeUpdate, isDragging]);

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

  const updateTimeFromPosition = useCallback((clientX) => {
    const video = videoRef.current;
    const slider = sliderRef.current;
    if (!video || !slider || !duration || duration === 0) return;

    const rect = slider.getBoundingClientRect();
    const x = Math.max(0, Math.min(clientX - rect.left, rect.width));
    const percentage = Math.max(0, Math.min(x / rect.width, 1));
    const newTime = percentage * duration;
    
    // Update video time immediately
    video.currentTime = newTime;
    // Update state immediately for instant visual feedback
    setCurrentTime(newTime);
    // Also notify parent component
    onTimeUpdate(newTime);
  }, [duration, onTimeUpdate]);

  const handleSeek = (e) => {
    if (isDragging) return;
    updateTimeFromPosition(e.clientX);
  };

  const handleMouseDown = (e) => {
    e.preventDefault();
    const video = videoRef.current;
    if (video && isPlaying) {
      video.pause();
      setIsPlaying(false);
    }
    setIsDragging(true);
    updateTimeFromPosition(e.clientX);
  };

  const handleMouseMove = (e) => {
    if (!isDragging) return;
    updateTimeFromPosition(e.clientX);
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Handle mouse events for dragging
  useEffect(() => {
    if (isDragging) {
      const handleGlobalMouseMove = (e) => {
        updateTimeFromPosition(e.clientX);
      };
      const handleGlobalMouseUp = () => {
        setIsDragging(false);
      };

      window.addEventListener('mousemove', handleGlobalMouseMove);
      window.addEventListener('mouseup', handleGlobalMouseUp);

      return () => {
        window.removeEventListener('mousemove', handleGlobalMouseMove);
        window.removeEventListener('mouseup', handleGlobalMouseUp);
      };
    }
  }, [isDragging, updateTimeFromPosition]);

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

  // Assign markers to tracks with minimum overlap
  const assignMarkersToTracks = (markers, duration) => {
    if (!markers || markers.length === 0 || !duration) return [];
    
    // Sort markers by start time
    const sortedMarkers = [...markers].sort((a, b) => a.start - b.start);
    const tracks = [];
    
    sortedMarkers.forEach((marker) => {
      const left = calculateMarkerPosition(marker.start, duration);
      const width = calculateMarkerWidth(marker.start, marker.end, duration);
      const right = left + width;
      
      // Find the first track where this marker doesn't overlap
      let assignedTrack = -1;
      for (let trackIdx = 0; trackIdx < tracks.length; trackIdx++) {
        const track = tracks[trackIdx];
        const hasOverlap = track.some((existingMarker) => {
          const existingLeft = calculateMarkerPosition(existingMarker.start, duration);
          const existingWidth = calculateMarkerWidth(existingMarker.start, existingMarker.end, duration);
          const existingRight = existingLeft + existingWidth;
          
          // Check if intervals overlap
          return !(right <= existingLeft || left >= existingRight);
        });
        
        if (!hasOverlap) {
          assignedTrack = trackIdx;
          break;
        }
      }
      
      // If no track found, create a new one
      if (assignedTrack === -1) {
        assignedTrack = tracks.length;
        tracks.push([]);
      }
      
      tracks[assignedTrack].push(marker);
    });
    
    return tracks;
  };

  const markerTracks = assignMarkersToTracks(filteredMarkers, duration);

  return (
    <div className="space-y-4">
      {/* Video */}
      <div className="relative bg-black rounded-3xl overflow-hidden shadow-2xl border-4 border-white/30">
        <video
          ref={videoRef}
          src={videoUrl}
          className="w-full aspect-video object-contain bg-black"
          onClick={togglePlay}
          preload="metadata"
          playsInline
          style={{ display: 'block' }}
        />
        
        {/* Loading Indicator */}
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50">
            <div className="w-16 h-16 rounded-full border-4 border-white/30 border-t-white animate-spin"></div>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/80">
            <div className="text-center p-6">
              <p className="text-white text-lg mb-2">⚠️ Video Error</p>
              <p className="text-gray-300 text-sm">{error}</p>
            </div>
          </div>
        )}
        
        {/* Play/Pause Overlay */}
        {!error && (
          <button
            onClick={togglePlay}
            className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-black/30 via-purple-900/20 to-blue-900/30 opacity-0 hover:opacity-100 transition-all duration-300 z-10"
          >
            <div className="w-20 h-20 rounded-full bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 flex items-center justify-center shadow-2xl hover:scale-110 transition-transform duration-300">
              {isPlaying ? (
                <Pause className="w-10 h-10 text-white" />
              ) : (
                <Play className="w-10 h-10 text-white ml-1" />
              )}
            </div>
          </button>
        )}
      </div>

      {/* Timeline */}
      <div className="glass rounded-2xl p-4 space-y-3 border-2 border-white/50 shadow-lg">
        <div className="flex justify-between text-xs font-medium text-gray-600 px-1">
          <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">{formatTime(currentTime)}</span>
          <span className="text-gray-500">{formatTime(duration)}</span>
        </div>

        {/* Playback Bar - Theme-matched, distinct from issues */}
        <div className="flex items-center gap-3">
          {/* Play/Pause Button */}
          <button
            onClick={togglePlay}
            className="flex-shrink-0 w-10 h-10 rounded-full bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 flex items-center justify-center text-white shadow-lg hover:scale-110 transition-transform duration-200"
            aria-label={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? (
              <Pause className="w-5 h-5" />
            ) : (
              <Play className="w-5 h-5 ml-0.5" />
            )}
          </button>

          {/* Slider Container */}
          <div 
            ref={sliderRef}
            className="flex-1 relative h-2 bg-gray-200/60 rounded-full cursor-pointer group hover:h-2.5 transition-all shadow-inner border border-gray-300/50"
            onClick={handleSeek}
            onMouseDown={handleMouseDown}
            title="Click or drag to seek"
          >
            {/* Progress Bar - Theme gradient */}
            <div
              className="absolute inset-y-0 left-0 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 rounded-full shadow-sm"
              style={{ 
                width: duration > 0 ? `${Math.max(0, Math.min((currentTime / duration) * 100, 100))}%` : '0%',
                transition: isDragging ? 'none' : 'width 0.05s linear'
              }}
            />

            {/* Draggable Playhead/Slider Handle */}
            <div
              className={`absolute top-1/2 transform -translate-y-1/2 rounded-full bg-gradient-to-br from-blue-400 to-purple-600 shadow-lg border-2 border-white ${
                isDragging || isPlaying
                  ? 'w-4 h-4 opacity-100'
                  : 'w-0 h-0 opacity-0 group-hover:w-4 group-hover:h-4 group-hover:opacity-100'
              }`}
              style={{ 
                left: duration > 0 ? `${Math.max(0, Math.min((currentTime / duration) * 100, 100))}%` : '0%', 
                marginLeft: '-8px',
                cursor: isDragging ? 'grabbing' : 'grab',
                transition: isDragging ? 'none' : 'left 0.05s linear, width 0.2s, opacity 0.2s'
              }}
              onMouseDown={(e) => {
                e.stopPropagation();
                handleMouseDown(e);
              }}
            />
          </div>
        </div>

        {/* Marker Tracks - Issues/Feedback */}
        {markerTracks.length > 0 && (
          <div className="space-y-1.5 pt-3 border-t border-gray-300/40">
            <div className="text-[10px] font-medium text-gray-500 uppercase tracking-wide px-1 mb-1.5">
              Feedback Issues
            </div>
            {markerTracks.map((track, trackIdx) => (
              <div
                key={trackIdx}
                className="relative h-3 bg-gray-100/40 rounded overflow-visible border border-gray-200/40 group/track"
              >
                {track.map((marker, markerIdx) => {
                  const category = CATEGORIES[marker.category];
                  const left = calculateMarkerPosition(marker.start, duration);
                  const width = calculateMarkerWidth(marker.start, marker.end, duration);
                  const minWidth = Math.max(width, 0.3); // Minimum 0.3% width for visibility

                  return (
                    <motion.div
                      key={`${trackIdx}-${markerIdx}`}
                      className="absolute top-0 bottom-0 rounded cursor-pointer group/marker transition-all"
                      style={{
                        left: `${left}%`,
                        width: `${minWidth}%`,
                        backgroundColor: category.color,
                        opacity: 0.65,
                      }}
                      initial={{ scaleY: 0.9 }}
                      whileHover={{ 
                        scaleY: 1.2, 
                        opacity: 1, 
                        zIndex: 10,
                        boxShadow: `0 2px 12px ${category.color}50`,
                        border: `1px solid ${category.color}80`
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleMarkerClickInternal(marker);
                      }}
                    >
                      {/* Subtle hover glow - intuitive but not obvious */}
                      <div className="absolute inset-0 rounded opacity-0 group-hover/marker:opacity-30 bg-white/30 transition-opacity" />
                      
                      {/* Tooltip */}
                      <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2.5 py-1.5 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover/marker:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-20 shadow-xl">
                        <div className="font-medium">{marker.label}</div>
                        <div className="text-gray-300 text-[10px] mt-0.5">{formatTime(marker.start)} - {formatTime(marker.end)}</div>
                        <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-gray-900" />
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
