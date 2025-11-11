import { sunnyDestinations } from '../src/data/cities.js';

const API_KEY = process.env.WINDY_API_KEY || process.env.VITE_WINDY_API_KEY;
const radiusKm = Number(process.env.WEBCAM_RADIUS_KM ?? 50);
const limit = Number(process.env.WEBCAM_LIMIT ?? 1);

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const checkCity = async (city) => {
  const url = new URL('https://api.windy.com/webcams/api/v3/webcams');
  url.searchParams.set('nearby', `${city.lat},${city.lon},${radiusKm}`);
  url.searchParams.set('limit', limit.toString());
  url.searchParams.set('include', 'images,location');

  const response = await fetch(url, {
    headers: { 'x-windy-api-key': API_KEY }
  });

  if (!response.ok) {
    throw new Error(`API ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  const webcams = data?.webcams ?? [];
  return webcams.length > 0;
};

const run = async () => {
  if (!API_KEY) {
    console.error('Missing WINDY_API_KEY (or VITE_WINDY_API_KEY).');
    process.exit(1);
  }

  console.log(`Checking ${sunnyDestinations.length} destinations (radius ${radiusKm} km)...`);
  const withoutCam = [];

  for (const city of sunnyDestinations) {
    try {
      const hasCam = await checkCity(city);
      const status = hasCam ? 'OK ' : 'MISS';
      console.log(`${status}  ${city.name}, ${city.country}`);
      if (!hasCam) {
        withoutCam.push(city);
      }
    } catch (err) {
      console.error(`ERR  ${city.name}, ${city.country}: ${err.message}`);
      withoutCam.push(city);
    }

    // Gentle delay to avoid hammering the API
    await wait(250);
  }

  if (withoutCam.length === 0) {
    console.log('\n✅ Every destination has at least one webcam in range.');
  } else {
    console.log('\n⚠️ Destinations without webcams:');
    withoutCam.forEach((city) => console.log(` - ${city.name}, ${city.country}`));
  }
};

run().catch((err) => {
  console.error('Unexpected error:', err);
  process.exit(1);
});
