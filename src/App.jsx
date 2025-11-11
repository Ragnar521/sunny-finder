import { useState, useEffect } from 'react';
import HomeWeather from './components/HomeWeather';
import SunFinder from './components/SunFinder';
import './App.css';

function App() {
  const [view, setView] = useState('home'); // 'home' nebo 'finder'
  const [clickCount, setClickCount] = useState(0);
  const [clickTimer, setClickTimer] = useState(null);
  const [extremeSunMode, setExtremeSunMode] = useState(false);
  const [showExtremeModeActivation, setShowExtremeModeActivation] = useState(false);
  const isHome = view === 'home';

  // Triple click detection
  const handleLogoClick = () => {
    setClickCount(prev => prev + 1);

    if (clickTimer) clearTimeout(clickTimer);

    const timer = setTimeout(() => {
      if (clickCount + 1 >= 3) {
        // Triple click detected!
        setExtremeSunMode(prev => !prev);
        setClickCount(0);
      } else {
        setClickCount(0);
      }
    }, 500); // 500ms window for triple click

    setClickTimer(timer);
  };

  // Show activation animation when extreme mode toggles
  useEffect(() => {
    if (extremeSunMode) {
      setShowExtremeModeActivation(true);
      setTimeout(() => {
        setShowExtremeModeActivation(false);
        setView('finder'); // Automatically go to finder
      }, 2000);
    }
  }, [extremeSunMode]);

  return (
    <div className="app">
      <header className="app-header">
        <h1>
          <span
            onClick={handleLogoClick}
            style={{ cursor: 'pointer', userSelect: 'none', display: 'inline-block', transition: 'transform 0.1s ease' }}
            title="Triple click for surprise!"
            onMouseDown={(e) => e.currentTarget.style.transform = 'scale(0.9)'}
            onMouseUp={(e) => e.currentTarget.style.transform = 'scale(1)'}
          >
            ☀️
          </span>
          {' '}Sunny Finder
        </h1>
        <p>
          {extremeSunMode
            ? "Find EXTREME heat when Prague is cold 🔥"
            : "Find sunshine when Prague is grey"
          }
        </p>
      </header>

      {showExtremeModeActivation && extremeSunMode && (
        <div className="extreme-mode-activation">
          <div className="extreme-mode-animation">
            🔥 EXTREME SUN MODE ACTIVATED 🔥
            <p>Searching for places above 30°C!</p>
          </div>
        </div>
      )}

      <main className={`app-main ${isHome ? 'app-main-centered' : ''}`}>
        {isHome ? (
          <HomeWeather onFindSun={() => setView('finder')} extremeMode={extremeSunMode} />
        ) : (
          <SunFinder
            onBack={() => setView('home')}
            extremeMode={extremeSunMode}
            onExitExtremeMode={() => setExtremeSunMode(false)}
          />
        )}
      </main>

      <footer className="app-footer">
        <p>Made with ☀️ by Ragnar521</p>
      </footer>
    </div>
  );
}

export default App;
