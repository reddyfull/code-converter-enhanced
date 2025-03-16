import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';
import 'bootstrap/dist/css/bootstrap.min.css';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();

// Add CSP meta tag to prevent XSS attacks
const meta = document.createElement('meta');
meta.httpEquiv = "Content-Security-Policy";
meta.content = "default-src 'self'; connect-src 'self' http://localhost:5000; script-src 'self'; style-src 'self' 'unsafe-inline';";
document.head.appendChild(meta);