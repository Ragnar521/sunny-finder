import { useState, useEffect } from 'react';
import { sunnyDestinations } from '../data/cities';

const MIN_SUNNY_TEMP_C = 20;
const EXTREME_SUNNY_TEMP_C = 30; // For extreme sun mode
const MAX_CLOUD_COVER = 70;

function SunFinder({ onBack, extremeMode, onExitExtremeMode }) {
  const [destination, setDestination] = useState(null);
  const [webcams, setWebcams] = useState([]); // Array of webcams for carousel
  const [currentWebcamIndex, setCurrentWebcamIndex] = useState(0); // Current viewing index
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [showAchievement, setShowAchievement] = useState(false);
  const [touchStart, setTouchStart] = useState(0);
  const [touchEnd, setTouchEnd] = useState(0);

  useEffect(() => {
    findSunnyPlace();
  }, [extremeMode]); // Re-search when extreme mode changes

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (webcams.length > 1) {
        if (e.key === 'ArrowLeft') {
          goToPrevWebcam();
        } else if (e.key === 'ArrowRight') {
          goToNextWebcam();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [webcams.length, currentWebcamIndex]);

  // Helper function to check if location is currently in daytime
  const isDaytime = (sunrise, sunset) => {
    const now = Math.floor(Date.now() / 1000); // current unix timestamp
    return now >= sunrise && now <= sunset;
  };

  // Helper function to format time from unix timestamp
  const formatTime = (timestamp, timezoneOffset = 0) => {
    const date = new Date((timestamp + timezoneOffset) * 1000);
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
      timeZone: 'UTC'
    });
  };

  // Carousel navigation
  const goToPrevWebcam = () => {
    setCurrentWebcamIndex((prev) =>
      prev === 0 ? webcams.length - 1 : prev - 1
    );
  };

  const goToNextWebcam = () => {
    setCurrentWebcamIndex((prev) =>
      prev === webcams.length - 1 ? 0 : prev + 1
    );
  };

  // Touch gesture handlers
  const handleTouchStart = (e) => {
    setTouchStart(e.targetTouches[0].clientX);
  };

  const handleTouchMove = (e) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const handleTouchEnd = () => {
    if (touchStart - touchEnd > 50) {
      // Swipe left - next webcam
      goToNextWebcam();
    }
    if (touchStart - touchEnd < -50) {
      // Swipe right - previous webcam
      goToPrevWebcam();
    }
  };

  const findSunnyPlace = async () => {
    setLoading(true);
    setError(null);
    setDestination(null);
    setWebcams([]);
    setCurrentWebcamIndex(0);

    try {
      const WEATHER_API_KEY = import.meta.env.VITE_OPENWEATHER_API_KEY;
      const WINDY_API_KEY = import.meta.env.VITE_WINDY_API_KEY;
      const daytimePlaces = [];
      const nighttimePlaces = [];

      // Set temperature threshold based on extreme mode
      const tempThreshold = extremeMode ? EXTREME_SUNNY_TEMP_C : MIN_SUNNY_TEMP_C;

      // Zkusíme náhodně vybrat max 30 míst a najít slunečné
      const shuffled = [...sunnyDestinations].sort(() => 0.5 - Math.random());
      const sampled = shuffled.slice(0, 30);

      for (const city of sampled) {
        const response = await fetch(
          `https://api.openweathermap.org/data/2.5/weather?lat=${city.lat}&lon=${city.lon}&units=metric&appid=${WEATHER_API_KEY}`
        );
        const data = await response.json();

        if (data.main && data.main.temp >= tempThreshold && data.clouds.all < MAX_CLOUD_COVER) {
          const placeData = {
            ...city,
            temp: Math.round(data.main.temp),
            clouds: data.clouds.all,
            description: data.weather[0].description,
            sunrise: data.sys.sunrise,
            sunset: data.sys.sunset,
            isDaytime: isDaytime(data.sys.sunrise, data.sys.sunset),
            timezoneOffset: data.timezone ?? 0
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

        // Fetch multiple webcams (up to 5) - CAROUSEL FEATURE
        try {
          console.log('Searching webcams for:', randomPlace.name, randomPlace.lat, randomPlace.lon);

          const webcamResponse = await fetch(
            `https://api.windy.com/webcams/api/v3/webcams?nearby=${randomPlace.lat},${randomPlace.lon},50&limit=5&include=images,location`,
            {
              headers: {
                'x-windy-api-key': WINDY_API_KEY
              }
            }
          );

          const webcamData = await webcamResponse.json();
          console.log('Webcam API response:', webcamData);

          if (webcamData.webcams && webcamData.webcams.length > 0) {
            // Parse all webcams
            const parsedWebcams = webcamData.webcams.map(cam => ({
              id: cam.webcamId || cam.id,
              title: cam.title || `Live View - ${randomPlace.name}`,
              image: cam.images?.current?.preview || cam.images?.sizes?.preview?.url,
              imageLarge: cam.images?.current?.preview || cam.images?.sizes?.preview?.url,
              location: {
                city: cam.location?.city || randomPlace.name,
                country: cam.location?.country || randomPlace.country
              }
            }));

            console.log(`Found ${parsedWebcams.length} webcam(s)!`);
            setWebcams(parsedWebcams);
            setCurrentWebcamIndex(0);
          } else {
            console.log('No webcam in range, using fallback image');
            // Fallback to Lorem Picsum if no webcam found
            setWebcams([{
              id: `fallback-${randomPlace.name}`,
              title: `${randomPlace.name} View`,
              image: `https://picsum.photos/seed/${encodeURIComponent(randomPlace.name)}/800/600`,
              imageLarge: `https://picsum.photos/seed/${encodeURIComponent(randomPlace.name)}/1200/800`,
              location: {
                city: randomPlace.name,
                country: randomPlace.country
              }
            }]);
          }
        } catch (webcamError) {
          console.error('Webcam API error:', webcamError);
          // Fallback to Lorem Picsum if API fails
          setWebcams([{
            id: `error-${randomPlace.name}`,
            title: `${randomPlace.name} View`,
            image: `https://picsum.photos/seed/${encodeURIComponent(randomPlace.name)}/800/600`,
            imageLarge: `https://picsum.photos/seed/${encodeURIComponent(randomPlace.name)}/1200/800`,
            location: {
              city: randomPlace.name,
              country: randomPlace.country
            }
          }]);
        }
      }

      if (!randomPlace) {
        if (extremeMode) {
          setError('No extreme heat locations found right now! Try again later or disable Extreme Sun Mode. 🔥');
        } else {
          setError('No sunny places found right now. Try again later! 🌤️');
        }
      }

      setLoading(false);
    } catch (err) {
      console.error('Error finding sunny place:', err);
      setError('Something went wrong. Please try again.');
      setLoading(false);
    }
  };

  const buildImageStyle = () => {
    if (!destination || webcams.length === 0) return {};
    const fallback = `https://source.unsplash.com/800x600/?${encodeURIComponent(
      destination.name
    )},landscape,city,skyline`;
    const webcamImage = webcams[currentWebcamIndex]?.image;

    return {
      backgroundImage: `linear-gradient(180deg, rgba(13, 16, 40, 0.15), rgba(13, 16, 40, 0.55)), url(${webcamImage || fallback})`,
    };
  };

  const handleImageClick = () => {
    if (webcams.length > 0) {
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

  const currentWebcam = webcams[currentWebcamIndex];
  const hasMultipleWebcams = webcams.length > 1;

  const handleBackClick = () => {
    if (extremeMode && onExitExtremeMode) {
      onExitExtremeMode(); // Exit extreme mode when going back
    }
    onBack();
  };

  return (
    <div className="finder-wrapper">
      <button className="btn btn-secondary btn-back" onClick={handleBackClick}>
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
            {/* Webcam Carousel */}
            <div className="webcam-carousel">
              {/* Previous button - only show if multiple webcams */}
              {hasMultipleWebcams && (
                <button
                  className="carousel-btn carousel-btn-prev"
                  onClick={(e) => {
                    e.stopPropagation();
                    goToPrevWebcam();
                  }}
                  aria-label="Previous webcam"
                >
                  ←
                </button>
              )}

              {/* Webcam image */}
              <div
                className={`destination-image${currentWebcam ? ' has-webcam' : ''}`}
                style={{
                  ...buildImageStyle(),
                  cursor: currentWebcam ? 'pointer' : 'default'
                }}
                role="img"
                aria-label={
                  currentWebcam ? `Live webcam in ${destination.name}` : `${destination.name} skyline`
                }
                onClick={handleImageClick}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
              />

              {/* Next button - only show if multiple webcams */}
              {hasMultipleWebcams && (
                <button
                  className="carousel-btn carousel-btn-next"
                  onClick={(e) => {
                    e.stopPropagation();
                    goToNextWebcam();
                  }}
                  aria-label="Next webcam"
                >
                  →
                </button>
              )}

              {/* Dots indicator - only show if multiple webcams */}
              {hasMultipleWebcams && (
                <div className="carousel-dots">
                  {webcams.map((_, index) => (
                    <span
                      key={index}
                      className={`carousel-dot ${index === currentWebcamIndex ? 'active' : ''}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        setCurrentWebcamIndex(index);
                      }}
                      aria-label={`Go to webcam ${index + 1}`}
                    />
                  ))}
                </div>
              )}

              {/* Webcam counter - only show if multiple webcams */}
              {hasMultipleWebcams && (
                <div className="carousel-counter">
                  {currentWebcamIndex + 1} / {webcams.length}
                </div>
              )}
            </div>

            <div className="destination-info">
              <h2 className="destination-title">{destination.name}</h2>
              <p className="destination-country">{destination.country}</p>

              {currentWebcam && currentWebcam.id && !String(currentWebcam.id).startsWith('fallback') && !String(currentWebcam.id).startsWith('error') && (
                <p className="webcam-note">
                  📹 {currentWebcam.title}
                </p>
              )}

              {/* Day/Night Status and Times */}
              {destination.sunrise && destination.sunset && (
                <div className="time-info">
                  {destination.isDaytime ? (
                    <p className="time-status daytime">
                      Sunset at {formatTime(destination.sunset, destination.timezoneOffset)}
                    </p>
                  ) : (
                    <>
                      <p className="time-status nighttime">
                        Sunrise at {formatTime(destination.sunrise, destination.timezoneOffset)}
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

          {!extremeMode && (
            <div className="destination-actions">
              <button className="btn btn-primary" onClick={findSunnyPlace}>
                🔄 Shuffle Again
              </button>
            </div>
          )}
        </div>
      )}

      {/* Webcam Modal with Carousel Support */}
      {showModal && currentWebcam && (
        <div className="webcam-modal" onClick={closeModal}>
          <div className="webcam-modal-content" onClick={(e) => e.stopPropagation()}>
            <button className="webcam-modal-close" onClick={closeModal} aria-label="Close">
              ×
            </button>

            {/* Modal navigation - only show if multiple webcams */}
            {hasMultipleWebcams && (
              <>
                <button
                  className="modal-nav-btn modal-nav-prev"
                  onClick={(e) => {
                    e.stopPropagation();
                    goToPrevWebcam();
                  }}
                  aria-label="Previous webcam"
                >
                  ←
                </button>
                <button
                  className="modal-nav-btn modal-nav-next"
                  onClick={(e) => {
                    e.stopPropagation();
                    goToNextWebcam();
                  }}
                  aria-label="Next webcam"
                >
                  →
                </button>
              </>
            )}

            <div className="webcam-modal-image-container">
              <img
                src={currentWebcam.imageLarge || currentWebcam.image}
                alt={currentWebcam.title}
                className="webcam-modal-image"
              />
            </div>

            <div className="webcam-modal-info">
              <h3>{currentWebcam.title}</h3>
              {destination && (
                <p>{destination.name}, {destination.country}</p>
              )}
              {hasMultipleWebcams && (
                <p className="modal-counter">{currentWebcamIndex + 1} / {webcams.length}</p>
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
