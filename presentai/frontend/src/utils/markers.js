export const CATEGORIES = {
  gestures: {
    name: 'Gestures',
    color: '#2BB39A',
    bgColor: 'bg-gestures',
    textColor: 'text-gestures',
  },
  inflection: {
    name: 'Speech/Inflection',
    color: '#FF8A33',
    bgColor: 'bg-inflection',
    textColor: 'text-inflection',
  },
  clarity: {
    name: 'Clarity',
    color: '#7C5CFF',
    bgColor: 'bg-clarity',
    textColor: 'text-clarity',
  },
  content: {
    name: 'Content',
    color: '#3388FF',
    bgColor: 'bg-content',
    textColor: 'text-content',
  },
};

export const filterMarkers = (markers, activeFilter) => {
  if (!activeFilter || activeFilter === 'all') {
    return markers;
  }
  return markers.filter((marker) => marker.category === activeFilter);
};

export const calculateMarkerPosition = (startTime, duration) => {
  if (!duration || duration === 0) return 0;
  return (startTime / duration) * 100;
};

export const calculateMarkerWidth = (startTime, endTime, duration) => {
  if (!duration || duration === 0) return 0;
  return ((endTime - startTime) / duration) * 100;
};

export const getCurrentMarker = (markers, currentTime) => {
  return markers.find(
    (marker) => currentTime >= marker.start && currentTime <= marker.end
  );
};

export const sortMarkersBySeverity = (markers) => {
  return [...markers].sort((a, b) => (b.severity || 0) - (a.severity || 0));
};
