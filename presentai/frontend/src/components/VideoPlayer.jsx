import { useRef, useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Play, Pause, Maximize, Minimize } from 'lucide-react';
import { CATEGORIES, calculateMarkerPosition, calculateMarkerWidth } from '../utils/markers';

export const VideoPlayer = ({ videoUrl, markers, activeFilter, onTimeUpdate, onMarkerClick }) => {
  const containerRef = useRef(null);
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
  const [isFullscreen, setIsFullscreen] = useState(false);

  const filteredMarkers = activeFilter === 'all' 
    ? markers 
    : markers.filter(m => m.category === activeFilter);

  useEffect(() => {
    const handleFullscreenChange = () => {
      const fullscreenElement =
        document.fullscreenElement ||
        document.webkitFullscreenElement ||
        document.mozFullScreenElement ||
        document.msFullscreenElement;
      setIsFullscreen(fullscreenElement === containerRef.current);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('mozfullscreenchange', handleFullscreenChange);
    document.addEventListener('MSFullscreenChange', handleFullscreenChange);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
      document.removeEventListener('mozfullscreenchange', handleFullscreenChange);
      document.removeEventListener('MSFullscreenChange', handleFullscreenChange);
    };
  }, []);

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

  const toggleFullscreen = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;

    const fullscreenElement =
      document.fullscreenElement ||
      document.webkitFullscreenElement ||
      document.mozFullScreenElement ||
      document.msFullscreenElement;

    if (fullscreenElement) {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
      } else if (document.webkitExitFullscreen) {
        document.webkitExitFullscreen();
      } else if (document.mozCancelFullScreen) {
        document.mozCancelFullScreen();
      } else if (document.msExitFullscreen) {
        document.msExitFullscreen();
      }
    } else {
      if (container.requestFullscreen) {
        container.requestFullscreen().catch(() => {});
      } else if (container.webkitRequestFullscreen) {
        container.webkitRequestFullscreen();
      } else if (container.mozRequestFullScreen) {
        container.mozRequestFullScreen();
      } else if (container.msRequestFullscreen) {
        container.msRequestFullscreen();
      }
    }
  }, []);

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

    // IMPORTANT: Call onMarkerClick FIRST to set manual selection before time update
    // This prevents the timeupdate event from overriding the clicked marker
    onMarkerClick(marker);
    
    // Then jump to 1 second before the marker for context
    // Use requestAnimationFrame to ensure state update happens first
    requestAnimationFrame(() => {
      const jumpTime = Math.max(0, marker.start - 1);
      video.currentTime = jumpTime;
      setCurrentTime(jumpTime);
    });
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
    <div
      ref={containerRef}
      className={`space-y-4 transition-colors duration-300 ${isFullscreen ? 'bg-brand-background/95 w-full h-full flex flex-col justify-center p-4 sm:p-6 md:p-10 overflow-hidden' : ''}`}
    >
      {/* Video */}
      <div className="relative bg-brand-surface-alt rounded-3xl overflow-hidden shadow-2xl shadow-black/50 border border-brand-border/60">
        <video
          ref={videoRef}
          src={videoUrl}
          className="w-full aspect-video object-contain bg-black"
          onClick={togglePlay}
          preload="metadata"
          playsInline
          style={{ display: 'block' }}
        />
        <button
          type="button"
          onClick={toggleFullscreen}
          className="absolute top-4 right-4 z-20 flex items-center justify-center w-10 h-10 rounded-full bg-brand-surface-alt/90 text-brand-text shadow-lg shadow-black/40 border border-brand-border/60 hover:bg-brand-surface-glow/80 transition-all duration-200"
          aria-label={isFullscreen ? 'Exit full screen' : 'Enter full screen'}
          title={isFullscreen ? 'Exit full screen' : 'Full screen'}
        >
          {isFullscreen ? <Minimize className="w-5 h-5" /> : <Maximize className="w-5 h-5" />}
        </button>
        
        {/* Loading Indicator */}
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-brand-background/70">
            <div className="w-16 h-16 rounded-full border-4 border-brand-accent/30 border-t-brand-accent animate-spin"></div>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="absolute inset-0 flex items-center justify-center bg-brand-background/90">
            <div className="text-center p-6">
              <p className="text-brand-text text-lg mb-2">⚠️ Video Error</p>
              <p className="text-brand-muted text-sm">{error}</p>
            </div>
          </div>
        )}
        
        {/* Play/Pause Overlay */}
        {!error && (
          <button
            onClick={togglePlay}
            className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-brand-background/40 via-brand-surface-alt/40 to-brand-surface/40 opacity-0 hover:opacity-100 transition-all duration-300 z-10"
          >
            <div className="w-20 h-20 rounded-full bg-gradient-to-r from-brand-accent-soft via-brand-accent to-brand-accent-strong flex items-center justify-center shadow-2xl shadow-brand-accent/40 hover:scale-110 transition-transform duration-300">
              {isPlaying ? (
                <Pause className="w-10 h-10 text-brand-text" />
              ) : (
                <Play className="w-10 h-10 text-brand-text ml-1" />
              )}
            </div>
          </button>
        )}
      </div>

      {/* Timeline */}
      <div className="glass rounded-2xl p-4 space-y-3 border border-brand-border/60 shadow-lg">
        <div className="flex justify-between text-xs font-medium text-brand-muted px-1">
          <span className="bg-gradient-to-r from-brand-accent-soft to-brand-accent bg-clip-text text-transparent">{formatTime(currentTime)}</span>
          <span className="text-brand-muted-dark">{formatTime(duration)}</span>
        </div>

        {/* Playback Bar - Theme-matched, distinct from issues */}
        <div className="flex items-center gap-3">
          {/* Play/Pause Button */}
          <button
            onClick={togglePlay}
            className="flex-shrink-0 w-10 h-10 rounded-full bg-gradient-to-r from-brand-accent-soft via-brand-accent to-brand-accent-strong flex items-center justify-center text-brand-text shadow-lg shadow-brand-accent/30 hover:scale-110 transition-transform duration-200"
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
            className="flex-1 relative h-2 bg-brand-surface-alt/70 rounded-full cursor-pointer group hover:h-2.5 transition-all shadow-inner border border-brand-border/60"
            onClick={handleSeek}
            onMouseDown={handleMouseDown}
            title="Click or drag to seek"
          >
            {/* Progress Bar - Theme gradient */}
            <div
              className="absolute inset-y-0 left-0 bg-gradient-to-r from-brand-accent-soft via-brand-accent to-brand-accent-strong rounded-full shadow-sm"
              style={{ 
                width: duration > 0 ? `${Math.max(0, Math.min((currentTime / duration) * 100, 100))}%` : '0%',
                transition: isDragging ? 'none' : 'width 0.05s linear'
              }}
            />

            {/* Draggable Playhead/Slider Handle */}
            <div
              className={`absolute top-1/2 transform -translate-y-1/2 rounded-full bg-gradient-to-br from-brand-accent-soft to-brand-accent-strong shadow-lg border-2 border-brand-background ${
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
          <div className="space-y-1.5 pt-3 border-t border-brand-border/50">
            <div className="text-[10px] font-medium text-brand-muted-dark uppercase tracking-wide px-1 mb-1.5">
              Feedback
            </div>
            {markerTracks.map((track, trackIdx) => (
              <div
                key={trackIdx}
                className="relative h-3 bg-brand-surface-alt/60 rounded overflow-visible border border-brand-border/50 group/track"
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
                      <div className="absolute inset-0 rounded opacity-0 group-hover/marker:opacity-30 bg-brand-text/20 transition-opacity" />
                      
                      {/* Tooltip */}
                      <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2.5 py-1.5 bg-brand-background text-brand-text text-xs rounded-lg opacity-0 group-hover/marker:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-20 shadow-xl shadow-brand-accent/30">
                        <div className="font-medium">{marker.label}</div>
                        <div className="text-brand-muted text-[10px] mt-0.5">{formatTime(marker.start)} - {formatTime(marker.end)}</div>
                        <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-brand-background" />
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
