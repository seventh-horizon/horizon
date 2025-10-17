import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App'; // ✅ Correct: Imports the new refactored component
// import ErrorBoundary from './components/ErrorBoundary'; // Temporarily commented out for debugging
import './index.css';

const rootElement = document.getElementById('root');

if (!rootElement) {
  throw new Error("Failed to find the root element. Make sure your index.html has an element with id='root'.");
}

ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    {/* <ErrorBoundary> */}
      <App />
    {/* </ErrorBoundary> */}
  </React.StrictMode>
);
