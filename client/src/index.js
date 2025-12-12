import React from 'react';
import ReactDOM from 'react-dom/client';
import axios from 'axios';
import './index.css';
import App from './App';

const API_BASE = (process.env.REACT_APP_API_BASE || '').replace(/\/$/, '');
if (API_BASE) {
  axios.defaults.baseURL = API_BASE;
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);