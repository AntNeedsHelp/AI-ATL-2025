const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export const uploadPresentation = async (video, document = null, title = '') => {
  const formData = new FormData();
  formData.append('video', video);
  if (document) {
    formData.append('supporting_file', document);
  }
  if (title) {
    formData.append('title', title);
  }

  const response = await fetch(`${API_BASE_URL}/api/upload`, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    throw new Error('Failed to upload presentation');
  }

  return response.json();
};

export const checkStatus = async (jobId) => {
  const response = await fetch(`${API_BASE_URL}/api/status/${jobId}`);
  
  if (!response.ok) {
    throw new Error('Failed to check status');
  }

  return response.json();
};

export const getResult = async (jobId) => {
  const response = await fetch(`${API_BASE_URL}/api/result/${jobId}`);
  
  if (!response.ok) {
    throw new Error('Failed to get result');
  }

  return response.json();
};
