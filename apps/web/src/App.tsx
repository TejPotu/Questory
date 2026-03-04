import { useEffect, useState } from 'react';
import { HealthResponse, API_BASE_URL } from '@questory/shared';

function App() {
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`${API_BASE_URL}/health`)
      .then((res) => res.json())
      .then((data: HealthResponse) => setHealth(data))
      .catch((err) => setError(err.message));
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-xl shadow-lg overflow-hidden md:max-w-2xl">
        <div className="md:flex">
          <div className="p-8">
            <div className="uppercase tracking-wide text-sm text-indigo-500 font-semibold text-center mb-6">
              Interactive Learning Storyworld
            </div>
            <h1 className="block mt-1 text-3xl leading-tight font-extrabold text-slate-900 text-center">
              Welcome to Questory
            </h1>
            <p className="mt-4 text-slate-500 text-center">
              Where kids learn via branching stories, interactive image hotspots, and quizzes.
            </p>

            <div className="mt-8 pt-6 border-t border-slate-100 flex flex-col items-center">
              <h2 className="text-sm font-medium text-slate-400 uppercase tracking-wider mb-2">
                System Status
              </h2>
              {error ? (
                <div className="inline-flex items-center px-4 py-2 rounded-full text-sm font-medium bg-red-100 text-red-800">
                  <span className="w-2 h-2 mr-2 bg-red-600 rounded-full animate-pulse"></span>
                  API Offline: {error}
                </div>
              ) : health ? (
                <div className="inline-flex items-center px-4 py-2 rounded-full text-sm font-medium bg-emerald-100 text-emerald-800">
                  <span className="w-2 h-2 mr-2 bg-emerald-600 rounded-full"></span>
                  API Online (Status: {health.status}, v{health.version})
                </div>
              ) : (
                <div className="inline-flex items-center px-4 py-2 rounded-full text-sm font-medium bg-slate-100 text-slate-800">
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-slate-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Checking connection...
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
