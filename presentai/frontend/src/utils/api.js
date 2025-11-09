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

export const generateFollowUpQuestions = async (jobId) => {
  const url = `${API_BASE_URL}/api/generate-questions/${jobId}`;
  console.log('Starting follow-up questions generation:', url);
  
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
  });
  
  console.log('Response status:', response.status, response.statusText);
  
  if (!response.ok) {
    let errorMessage = 'Failed to start question generation';
    try {
      const error = await response.json();
      errorMessage = error.detail || error.message || errorMessage;
      console.error('Error response:', error);
    } catch (e) {
      // If response is not JSON, try to get text
      try {
        const text = await response.text();
        console.error('Error response text:', text);
        if (text) errorMessage = text;
      } catch (e2) {
        // Use default error message
        console.error('Could not parse error response');
      }
    }
    
    // Provide more specific error messages
    if (response.status === 404) {
      errorMessage = 'Endpoint not found. Please make sure the backend server is running and has been restarted with the latest code.';
    } else if (response.status === 400) {
      errorMessage = errorMessage || 'Bad request. Please check that the presentation has a transcript.';
    } else if (response.status === 500) {
      errorMessage = errorMessage || 'Server error. Please try again later.';
    }
    
    throw new Error(errorMessage);
  }

  const result = await response.json();
  console.log('Received result:', result);
  
  // If questions are already available, return them
  if (result.status === 'completed' && result.questions) {
    return { questions: result.questions };
  }
  
  // Otherwise, return the status for polling
  return result;
};

export const checkQuestionsStatus = async (jobId) => {
  const url = `${API_BASE_URL}/api/questions-status/${jobId}`;
  
  const response = await fetch(url);
  
  if (!response.ok) {
    throw new Error('Failed to check question generation status');
  }
  
  return response.json();
};

