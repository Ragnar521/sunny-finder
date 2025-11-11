import { useState } from 'react';
import HomeWeather from './components/HomeWeather';
import SunFinder from './components/SunFinder';
import './App.css';

function App() {
  const [view, setView] = useState('home'); // 'home' nebo 'finder'
  const isHome = view === 'home';

  return (
    <div className="app">
      <header className="app-header">
        <h1>☀️ Sunny Finder</h1>
        <p>Find sunshine when Prague is grey</p>
      </header>

      <main className={`app-main ${isHome ? 'app-main-centered' : ''}`}>
        {isHome ? (
          <HomeWeather onFindSun={() => setView('finder')} />
        ) : (
          <SunFinder onBack={() => setView('home')} />
        )}
      </main>

      <footer className="app-footer">
        <p>Made with ☀️ by Ragnar521</p>
      </footer>
    </div>
  );
}

export default App;
