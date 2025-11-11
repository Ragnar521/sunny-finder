import { useState, useEffect } from 'react';
import { sunnyDestinations } from '../data/cities';

function SunFinder({ onBack }) {
  const [destination, setDestination] = useState(null);
  const [webcam, setWebcam] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [showAchievement, setShowAchievement] = useState(false);

  useEffect(() => {
    findSunnyPlace();
  }, []);

  // Helper function to check if location is currently in daytime
  const isDaytime = (sunrise, sunset) => {
    const now = Math.floor(Date.now() / 1000); // current unix timestamp
    return now >= sunrise && now <= sunset;
  };

  // Helper function to format time from unix timestamp
  const formatTime = (timestamp) => {
    return new Date(timestamp * 1000).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
  };

  const findSunnyPlace = async () => {
    setLoading(true);
    setError(null);
    setDestination(null);
    setWebcam(null);

    try {
      const WEATHER_API_KEY = import.meta.env.VITE_OPENWEATHER_API_KEY;
      const WINDY_API_KEY = import.meta.env.VITE_WINDY_API_KEY;
      const daytimePlaces = [];
      const nighttimePlaces = [];

      // Zkusíme náhodně vybrat max 30 míst a najít slunečné
      const shuffled = [...sunnyDestinations].sort(() => 0.5 - Math.random());
      const sampled = shuffled.slice(0, 30);

      for (const city of sampled) {
        const response = await fetch(
          `https://api.openweathermap.org/data/2.5/weather?lat=${city.lat}&lon=${city.lon}&units=metric&appid=${WEATHER_API_KEY}`
        );
        const data = await response.json();

        if (data.main && data.main.temp >= 24 && data.clouds.all < 30) {
          const placeData = {
            ...city,
            temp: Math.round(data.main.temp),
            clouds: data.clouds.all,
            description: data.weather[0].description,
            sunrise: data.sys.sunrise,
            sunset: data.sys.sunset,
            isDaytime: isDaytime(data.sys.sunrise, data.sys.sunset)
          };

          // Separate daytime and nighttime locations
          if (placeData.isDaytime) {
            daytimePlaces.push(placeData);
          } else {
            nighttimePlaces.push(placeData);
          }
        }

        // Pokud najdeme alespoň 5 slunečných míst ve dne, máme dost na výběr
        if (daytimePlaces.length >= 5) break;
      }

      // Smart filtering: prioritize daytime, fallback to nighttime
      let randomPlace = null;

      if (daytimePlaces.length > 0) {
        // Prefer daytime locations
        randomPlace = daytimePlaces[Math.floor(Math.random() * daytimePlaces.length)];
        console.log(`Found ${daytimePlaces.length} daytime sunny places, selected:`, randomPlace.name);
      } else if (nighttimePlaces.length > 0) {
        // Fallback to nighttime if no daytime places found
        randomPlace = nighttimePlaces[Math.floor(Math.random() * nighttimePlaces.length)];
        console.log(`No daytime places found, using nighttime location:`, randomPlace.name);
      }

      if (randomPlace) {
        setDestination(randomPlace);

        // Check for perfect weather achievement! 🏆
        const isPerfectWeather = randomPlace.temp === 25 && randomPlace.clouds === 0;
        if (isPerfectWeather) {
          console.log('🏆 PERFECT WEATHER ACHIEVEMENT UNLOCKED!');
          setTimeout(() => setShowAchievement(true), 500); // Small delay for smooth reveal
        }

        // Hledáme webkameru poblíž - SPRÁVNÝ FORMÁT PRO WINDY API V3
        try {
          console.log('Searching webcam for:', randomPlace.name, randomPlace.lat, randomPlace.lon);
          
          const webcamResponse = await fetch(
            `https://api.windy.com/webcams/api/v3/webcams?nearby=${randomPlace.lat},${randomPlace.lon},50&limit=1&include=images,location`,
            {
              headers: {
                'x-windy-api-key': WINDY_API_KEY  // API klíč v headeru!
              }
            }
          );
          
          const webcamData = await webcamResponse.json();
          console.log('Webcam API response:', webcamData);
          
          if (webcamData.webcams && webcamData.webcams.length > 0) {
            const cam = webcamData.webcams[0];
            console.log('Webcam found!', cam);
            
            // Parsuj Windy API V3 response
            setWebcam({
              id: cam.webcamId || cam.id,
              title: cam.title || `Live View - ${randomPlace.name}`,
              image: cam.images?.current?.preview || cam.images?.sizes?.preview?.url,
              imageLarge: cam.images?.current?.preview || cam.images?.sizes?.preview?.url,
              location: {
                city: cam.location?.city || randomPlace.name,
                country: cam.location?.country || randomPlace.country
              }
            });
          } else {
            console.log('No webcam in range, using fallback image');
            // Fallback to Lorem Picsum if no webcam found
            setWebcam({
              id: `fallback-${randomPlace.name}`,
              title: `${randomPlace.name} View`,
              image: `https://picsum.photos/seed/${encodeURIComponent(randomPlace.name)}/800/600`,
              imageLarge: `https://picsum.photos/seed/${encodeURIComponent(randomPlace.name)}/1200/800`,
              location: {
                city: randomPlace.name,
                country: randomPlace.country
              }
            });
          }
        } catch (webcamError) {
          console.error('Webcam API error:', webcamError);
          // Fallback to Lorem Picsum if API fails
          setWebcam({
            id: `error-${randomPlace.name}`,
            title: `${randomPlace.name} View`,
            image: `https://picsum.photos/seed/${encodeURIComponent(randomPlace.name)}/800/600`,
            imageLarge: `https://picsum.photos/seed/${encodeURIComponent(randomPlace.name)}/1200/800`,
            location: {
              city: randomPlace.name,
              country: randomPlace.country
            }
          });
        }
      } else {
        setError('No sunny places found right now. Try again later! 🌤️');
      }

      setLoading(false);
    } catch (err) {
      console.error('Error finding sunny place:', err);
      setError('Something went wrong. Please try again.');
      setLoading(false);
    }
  };

  const buildImageStyle = () => {
    if (!destination) return {};
    const fallback = `https://source.unsplash.com/800x600/?${encodeURIComponent(
      destination.name
    )},landscape,city,skyline`;
    const webcamImage = webcam?.image;

    return {
      backgroundImage: `linear-gradient(180deg, rgba(13, 16, 40, 0.15), rgba(13, 16, 40, 0.55)), url(${webcamImage || fallback})`,
    };
  };

  const handleImageClick = () => {
    if (webcam) {
      setShowModal(true);
    }
  };

  const closeModal = () => {
    setShowModal(false);
  };

  const formatDescription = (text) =>
    text
      ? text
          .split(' ')
          .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
          .join(' ')
      : '';

  return (
    <div className="finder-wrapper">
      <button className="btn btn-secondary btn-back" onClick={onBack}>
        ← Back to Prague
      </button>

      {loading && (
        <div className="weather-card">
          <div className="loading">
            <div className="spinner"></div>
            <p>Searching for sunshine... ☀️</p>
          </div>
        </div>
      )}

      {error && (
        <div className="weather-card">
          <h2>😕 {error}</h2>
          <div className="card-actions">
            <button 
              className="btn btn-primary" 
              onClick={findSunnyPlace}
            >
              Try Again
            </button>
          </div>
        </div>
      )}

      {destination && (
        <div className="destination-section">
          <div className="destination-card">
            <div
              className={`destination-image${webcam ? ' has-webcam' : ''}`}
              style={{
                ...buildImageStyle(),
                cursor: webcam ? 'pointer' : 'default'
              }}
              role="img"
              aria-label={
                webcam ? `Live webcam in ${destination.name}` : `${destination.name} skyline`
              }
              onClick={handleImageClick}
            />

            <div className="destination-info">
              <h2 className="destination-title">{destination.name}</h2>
              <p className="destination-country">{destination.country}</p>

              {webcam && webcam.id && !String(webcam.id).startsWith('fallback') && !String(webcam.id).startsWith('error') && (
                <p className="webcam-note">
                  📹 Live webcam: {webcam.title}
                </p>
              )}

              {/* Day/Night Status and Times */}
              {destination.sunrise && destination.sunset && (
                <div className="time-info">
                  {destination.isDaytime ? (
                    <p className="time-status daytime">
                      Sunset at {formatTime(destination.sunset)}
                    </p>
                  ) : (
                    <>
                      <p className="time-status nighttime">
                        Sunrise at {formatTime(destination.sunrise)}
                      </p>
                      <p className="nighttime-warning">
                        ⚠️ Currently nighttime at this location
                      </p>
                    </>
                  )}
                </div>
              )}

              <div className="destination-weather">
                <div className="weather-stat">
                  <div className="weather-stat-label">Temperature</div>
                  <div className="weather-stat-value">{destination.temp}°C</div>
                </div>

                <div className="weather-stat">
                  <div className="weather-stat-label">Clouds</div>
                  <div className="weather-stat-value">{destination.clouds}%</div>
                </div>
              </div>

              <div className="destination-description">
                <span>{formatDescription(destination.description)}</span>
              </div>
            </div>
          </div>

          <div className="destination-actions">
            <button className="btn btn-primary" onClick={findSunnyPlace}>
              🔄 Shuffle Again
            </button>
          </div>
        </div>
      )}

      {showModal && webcam && (
        <div className="webcam-modal" onClick={closeModal}>
          <div className="webcam-modal-content" onClick={(e) => e.stopPropagation()}>
            <button className="webcam-modal-close" onClick={closeModal} aria-label="Close">
              ×
            </button>
            <div className="webcam-modal-image-container">
              <img
                src={webcam.imageLarge || webcam.image}
                alt={webcam.title}
                className="webcam-modal-image"
              />
            </div>
            <div className="webcam-modal-info">
              <h3>{webcam.title}</h3>
              {destination && (
                <p>{destination.name}, {destination.country}</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Perfect Weather Achievement Easter Egg 🏆 */}
      {showAchievement && (
        <div className="achievement-overlay" onClick={() => setShowAchievement(false)}>
          <div className="achievement-modal" onClick={(e) => e.stopPropagation()}>
            <div className="confetti">
              <div className="confetti-piece"></div>
              <div className="confetti-piece"></div>
              <div className="confetti-piece"></div>
              <div className="confetti-piece"></div>
              <div className="confetti-piece"></div>
              <div className="confetti-piece"></div>
              <div className="confetti-piece"></div>
              <div className="confetti-piece"></div>
              <div className="confetti-piece"></div>
              <div className="confetti-piece"></div>
            </div>
            <div className="achievement-content">
              <div className="achievement-trophy">🏆</div>
              <h2 className="achievement-title">Perfect Weather Found!</h2>
              <p className="achievement-subtitle">
                25°C with 0% clouds
                <br />
                <span className="achievement-sparkle">✨ Absolute perfection! ✨</span>
              </p>
              <button
                className="btn btn-primary achievement-btn"
                onClick={() => setShowAchievement(false)}
              >
                Enjoy the Paradise! 🌴
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default SunFinder;