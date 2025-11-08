export const CATEGORIES = {
  gestures: {
    name: 'Gestures',
    color: '#FF9A5A',
    bgColor: 'bg-gestures',
    textColor: 'text-gestures',
  },
  inflection: {
    name: 'Speech/Inflection',
    color: '#FF8AD6',
    bgColor: 'bg-inflection',
    textColor: 'text-inflection',
  },
  clarity: {
    name: 'Clarity',
    color: '#74D7FF',
    bgColor: 'bg-clarity',
    textColor: 'text-clarity',
  },
  content: {
    name: 'Content',
    color: '#56C979',
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
