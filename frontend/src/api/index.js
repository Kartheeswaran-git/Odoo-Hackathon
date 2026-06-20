import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:5000/api', // Wait, we should probably use env var in a real app
});

export default api;
