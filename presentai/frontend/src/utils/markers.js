export const CATEGORIES = {
  gestures: {
    name: 'Gestures',
    color: '#FF9A5A',
    bgColor: 'bg-gestures',
    textColor: 'text-gestures',
    description: 'This category evaluates your body language, hand gestures, posture, eye contact, and overall physical presence during your presentation. Good gestures help engage your audience and emphasize key points.',
  },
  inflection: {
    name: 'Speech/Inflection',
    color: '#FF8AD6',
    bgColor: 'bg-inflection',
    textColor: 'text-inflection',
    description: 'This category assesses your vocal delivery including pitch variation, volume, tone, energy, and emphasis. Dynamic vocal inflection helps maintain audience interest and highlight important information.',
  },
  clarity: {
    name: 'Clarity',
    color: '#74D7FF',
    bgColor: 'bg-clarity',
    textColor: 'text-clarity',
    description: 'This category measures speech clarity including words per minute (WPM), filler words, awkward pauses, and speaking pace. Clear communication ensures your message is easily understood.',
  },
  content: {
    name: 'Content',
    color: '#56C979',
    bgColor: 'bg-content',
    textColor: 'text-content',
    description: 'This category evaluates the structure, organization, accuracy, and completeness of your presentation content. It includes logical flow, key point coverage, and accuracy verification against supporting documents.',
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
