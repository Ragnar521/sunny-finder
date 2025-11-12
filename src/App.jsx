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

  // Triple-click cooldown states
  const [tripleClickTriggered, setTripleClickTriggered] = useState(false);
  const [tripleClickCooldown, setTripleClickCooldown] = useState(false);

  // Angry Sun mode states
  const [angrySunMode, setAngrySunMode] = useState(false);
  const [sunScale, setSunScale] = useState(1);

  // Rage Mode states
  const [rageModeActive, setRageModeActive] = useState(false);
  const [rageModeClicks, setRageModeClicks] = useState([]);

  const isHome = view === 'home';

  // Advanced click detection with multiple modes
  const handleLogoClick = () => {
    const now = Date.now();

    // Add click to rage mode tracking (3-second window)
    setRageModeClicks(prev => {
      const recentClicks = [...prev, now].filter(time => now - time < 3000);

      // PRIORITY 1: Check for Rage Mode (12+ clicks in 3 seconds)
      if (recentClicks.length >= 12) {
        setRageModeActive(true);
        resetAllModes();
        return [];
      }

      return recentClicks;
    });

    // Add click to rapid-click tracking
    setClickCount(prev => prev + 1);

    if (clickTimer) clearTimeout(clickTimer);

    const timer = setTimeout(() => {
      const totalClicks = clickCount + 1;

      // PRIORITY 2: Check for Triple-Click (EXACTLY 3 clicks)
      if (totalClicks === 3 && !tripleClickCooldown && !tripleClickTriggered) {
        setExtremeSunMode(true);
        setTripleClickTriggered(true);
        setTripleClickCooldown(true);

        // Reset cooldown after 1 second
        setTimeout(() => {
          setTripleClickCooldown(false);
          setTripleClickTriggered(false);
        }, 1000);
      }
      // PRIORITY 3: Check for Angry Sun (7+ clicks)
      else if (totalClicks >= 7 && !tripleClickTriggered && !rageModeActive) {
        setAngrySunMode(true);
        setSunScale(1 + (totalClicks - 6) * 0.2);
      }

      // Reset after 1 second of no activity
      setTimeout(() => {
        resetNormalStates();
      }, 1000);

      setClickCount(0);
    }, 500); // 500ms window for rapid clicks

    setClickTimer(timer);
  };

  const resetNormalStates = () => {
    setAngrySunMode(false);
    setSunScale(1);
    setClickCount(0);
  };

  const resetAllModes = () => {
    resetNormalStates();
    setTripleClickTriggered(false);
    setRageModeClicks([]);
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
            style={{
              cursor: 'pointer',
              userSelect: 'none',
              display: 'inline-block',
              transform: `scale(${sunScale})`,
              transition: 'transform 0.2s ease'
            }}
            title="Triple click for surprise!"
          >
            {angrySunMode ? '😡' : '☀️'}
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

      {/* Rage Mode Overlay */}
      {rageModeActive && (
        <div className="rage-mode-overlay">
          <div className="rage-mode-content shake-animation">
            <h1 className="rage-title">CALM DOWN! I'M ALREADY HOT ENOUGH! 🔥</h1>

            <img
              src="https://plus.unsplash.com/premium_photo-1670210080045-a2e0da63dd99?q=80&w=400&h=400&auto=format&fit=crop&crop=center"
              alt="Angry Sun"
              className="rage-sun-gif"
            />

            <div className="rage-stats">
              <div className="rage-stat">
                <span className="rage-label">Surface Temperature:</span>
                <span className="rage-value">5,778°C</span>
              </div>
              <div className="rage-stat">
                <span className="rage-label">Core Temperature:</span>
                <span className="rage-value">15,000,000°C</span>
              </div>
              <div className="rage-stat">
                <span className="rage-label">Cloud Coverage:</span>
                <span className="rage-value">0% (You're in vacuum, genius!)</span>
              </div>
              <div className="rage-stat">
                <span className="rage-label">Humidity:</span>
                <span className="rage-value">Literally impossible</span>
              </div>
              <div className="rage-stat">
                <span className="rage-label">UV Index:</span>
                <span className="rage-value">∞ (Instant vaporization)</span>
              </div>
            </div>

            <button
              className="rage-close-btn"
              onClick={() => setRageModeActive(false)}
            >
              Sorry Sun!
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
