import axios from 'axios';

const API_URL = 'http://localhost:3001/api';
const API_KEY = 'mock_pos_key_rest1'; // Default API key for admin panel

// Create axios instance with default headers
const apiClient = axios.create({
  baseURL: API_URL,
  headers: {
    'X-API-Key': API_KEY,
    'Content-Type': 'application/json',
  },
});

export default apiClient;
export { API_URL };

