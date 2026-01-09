import { useState, useEffect } from 'react';

function HomeWeather({ onFindSun, extremeMode }) {
  const [weather, setWeather] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPragueWeather();
  }, []);

  const fetchPragueWeather = async () => {
    try {
      const API_KEY = import.meta.env.VITE_OPENWEATHER_API_KEY;
      const response = await fetch(
        `https://api.openweathermap.org/data/2.5/weather?q=Prague&units=metric&appid=${API_KEY}`
      );
      const data = await response.json();
      setWeather(data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching weather:', error);
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="weather-card">
        <div className="loading">
          <div className="spinner"></div>
          <p>Loading Prague weather...</p>
        </div>
      </div>
    );
  }

  if (!weather || weather.cod !== 200) {
    return (
      <div className="weather-card">
        <h2>❌ Error loading weather</h2>
        <p>Could not fetch Prague weather data.</p>
      </div>
    );
  }

  const temp = Math.round(weather.main.temp);
  const feelsLike = Math.round(weather.main.feels_like);
  const clouds = weather.clouds.all;

  return (
    <div className="home-section">
      <div className="weather-card home-card">
        <div className="home-card-header">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" style={{display: 'inline-block', verticalAlign: 'middle'}}>
            <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" fill="currentColor" stroke="currentColor" strokeWidth="2"/>
            <circle cx="12" cy="9" r="2.5" fill="var(--paper-light)"/>
          </svg>
          <p>Prague Weather</p>
        </div>

        <div className="home-temp-card" aria-label="Current temperature">
          <span className="home-temp-value">{temp}°C</span>
        </div>

        <div className="home-stat-grid">
          <div className="home-stat-card">
            <span className="home-stat-label">Feels Like</span>
            <span className="home-stat-value">{feelsLike}°C</span>
          </div>
          <div className="home-stat-card">
            <span className="home-stat-label">Cloud Cover</span>
            <span className="home-stat-value">{clouds}%</span>
          </div>
        </div>
      </div>

      <div className="card-actions">
        <button className="btn btn-primary" onClick={onFindSun}>
          {extremeMode ? 'Find Extreme Heat' : 'Find Sun'}
        </button>
      </div>
    </div>
  );
}

export default HomeWeather;
