// --- SELECTORS FOR DOM ELEMENTS ---
const cityInput = document.querySelector('.city-input');
const searchBtn = document.querySelector('.search-btn');
const locationBtn = document.querySelector('#location-btn');
const suggestionsList = document.querySelector('.suggestions-list');

const weatherInfoSection = document.querySelector('.weather-info');
const notFoundSection = document.querySelector('.not-found');
const searchCitySection = document.querySelector('.search-city');
const loadingSpinner = document.querySelector('.loading-spinner');

// All weather display elements
const countryTxt = document.querySelector('.country-txt');
const tempTxt = document.querySelector('.temp-txt');
const conditionTxt = document.querySelector('.condition-txt');
const humidityValueTxt = document.querySelector('.humidity-value-txt');
const windValueTxt = document.querySelector('.wind-value-txt');
const weatherSummaryImg = document.querySelector('.weather-summary-img');
const currentDataTxt = document.querySelector('.current-date-txt');
const feelsLikeValueTxt = document.querySelector('.feels-like-value-txt');
const sunriseSunsetValueTxt = document.querySelector('.sunrise-sunset-value-txt');
const aqiValueTxt = document.querySelector('.aqi-value-txt');

// Forecast containers
const forecastItemsContainer = document.querySelector('.forecasts-column .forecast-items-container');
const hourlyForecastContainer = document.querySelector('.forecasts-column .hourly-forecast-container');

// Unit toggle elements
const unitToggle = document.querySelector('.unit-toggle');
const unitC = document.querySelector('.unit-c');
const unitF = document.querySelector('.unit-f');

// --- FAVORITES FEATURE SELECTORS ---
const addFavoriteBtn = document.querySelector('#add-favorite-btn');
const favoritesSection = document.querySelector('.favorites-section');
const favoritesList = document.querySelector('.favorites-list');

// --- SIDEBAR MENU SELECTORS ---
const menuBtn = document.querySelector('.menu-btn');
const sidebar = document.querySelector('.sidebar');
const closeSidebarBtn = document.querySelector('#close-sidebar-btn');
const sidebarLinks = document.querySelector('.sidebar-links');


// --- API AND GLOBAL STATE VARIABLES ---
const apiKey = '5a3711768577475f0244cc9d7b3344eb';
let debounceTimer;
let currentUnit = 'metric';
let lastLat, lastLon;
let currentLocation = {};
let favorites = [];

// === NEW: Variables for the map ===
let map;
let marker;


// --- EVENT LISTENERS ---
cityInput.addEventListener('input', () => {
    const query = cityInput.value.trim();
    suggestionsList.innerHTML = '';
    clearTimeout(debounceTimer);
    if (query.length === 0) return;
    debounceTimer = setTimeout(() => getCitySuggestions(query), 300);
});

suggestionsList.addEventListener('click', (event) => {
    if (event.target.classList.contains('suggestion-item')) {
        const selectedCity = event.target;
        updateWeatherInfo(selectedCity.dataset.lat, selectedCity.dataset.lon);
        cityInput.value = '';
        suggestionsList.innerHTML = '';
    }
});

searchBtn.addEventListener('click', handleManualSearch);

cityInput.addEventListener('keydown', (event) => {
    if (suggestionsList.innerHTML !== '') suggestionsList.innerHTML = '';
    if (event.key === 'Enter') handleManualSearch();
});

locationBtn.addEventListener('click', () => {
    showSpinner();
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(onSuccess, onError);
    } else {
        alert("Geolocation is not supported by your browser.");
        hideSpinner();
    }
});

unitToggle.addEventListener('click', (event) => {
    const clickedUnit = event.target;
    if (clickedUnit.classList.contains('active')) return;
    currentUnit = clickedUnit.classList.contains('unit-c') ? 'metric' : 'imperial';
    unitC.classList.toggle('active');
    unitF.classList.toggle('active');
    if (lastLat && lastLon) {
        updateWeatherInfo(lastLat, lastLon);
    }
});

addFavoriteBtn.addEventListener('click', toggleFavorite);

favoritesList.addEventListener('click', (event) => {
    const target = event.target;
    if (target.closest('.favorite-item')) {
        const item = target.closest('.favorite-item');
        if (target.classList.contains('remove-favorite-btn')) {
            removeFavorite(item.dataset.id);
        } else {
            updateWeatherInfo(item.dataset.lat, item.dataset.lon);
        }
    }
});

menuBtn.addEventListener('click', () => sidebar.classList.add('is-open'));
closeSidebarBtn.addEventListener('click', () => sidebar.classList.remove('is-open'));

sidebarLinks.addEventListener('click', (event) => {
    const clickedEl = event.target.closest('li');
    if (!clickedEl) return;
    const menuId = clickedEl.id;
    if (menuId === 'menu-favorites') {
        if (favorites.length > 0) {
            weatherInfoSection.style.display = 'none';
            searchCitySection.style.display = 'none';
            notFoundSection.style.display = 'none';
            favoritesSection.style.display = 'block';
        } else {
            alert('You have no favorite cities saved yet.');
        }
    } else if (menuId === 'menu-recents') {
        // This functionality can be expanded later
    } else if (menuId === 'menu-feedback') {
        window.location.href = 'mailto:feedback@example.com?subject=Weather App Feedback';
    }
    sidebar.classList.remove('is-open');
});


// --- FAVORITES LOGIC FUNCTIONS ---
function toggleFavorite() {
    const isFavorite = favorites.some(fav => fav.id === currentLocation.id);
    if (isFavorite) {
        removeFavorite(currentLocation.id);
    } else {
        addFavorite();
    }
}

function addFavorite() {
    if (currentLocation.id && !favorites.some(fav => fav.id === currentLocation.id)) {
        favorites.push(currentLocation);
        saveFavoritesToStorage();
        renderFavoritesList();
        updateFavoriteStar();
    }
}

function removeFavorite(locationId) {
    favorites = favorites.filter(fav => fav.id !== locationId);
    saveFavoritesToStorage();
    renderFavoritesList();
    updateFavoriteStar();
}

function saveFavoritesToStorage() {
    localStorage.setItem('weatherAppFavorites', JSON.stringify(favorites));
}

function getFavoritesFromStorage() {
    const storedFavorites = localStorage.getItem('weatherAppFavorites');
    if (storedFavorites) {
        favorites = JSON.parse(storedFavorites);
    }
}

function renderFavoritesList() {
    favoritesList.innerHTML = '';
    if (favorites.length > 0) {
        favoritesSection.style.display = 'block';
        favorites.forEach(fav => {
            const item = document.createElement('div');
            item.classList.add('favorite-item');
            item.dataset.id = fav.id;
            item.dataset.lat = fav.lat;
            item.dataset.lon = fav.lon;
            item.innerHTML = `<span>${fav.name}</span><span class="remove-favorite-btn">&times;</span>`;
            favoritesList.appendChild(item);
        });
    } else {
        favoritesSection.style.display = 'none';
    }
}

function updateFavoriteStar() {
    const isFavorite = favorites.some(fav => fav.id === currentLocation.id);
    addFavoriteBtn.classList.toggle('is-favorite', isFavorite);
}


// --- GEOLOCATION, SPINNER & DISPLAY CONTROL ---
function onSuccess(position) {
    updateWeatherInfo(position.coords.latitude, position.coords.longitude);
}

function onError(error) {
    let msg = "An error occurred. You can still search for a city manually.";
    if (error.code === error.PERMISSION_DENIED) {
        msg = "Location access denied. Please allow access or search for a city manually.";
    }
    alert(msg);
    hideSpinner();
    showDisplaySection(searchCitySection);
}

function showSpinner() {
    loadingSpinner.style.display = 'block';
    [weatherInfoSection, searchCitySection, notFoundSection, favoritesSection].forEach(s => s.style.display = 'none');
}

function hideSpinner() {
    loadingSpinner.style.display = 'none';
}

function showDisplaySection(section) {
    [weatherInfoSection, searchCitySection, notFoundSection].forEach(sec => sec.style.display = 'none');
    
    if (section.classList.contains('weather-info') || section.classList.contains('section-message')) {
        section.style.display = 'flex';
    } else {
        section.style.display = 'block';
    }

    if (favorites.length > 0) {
        favoritesSection.style.display = 'block';
    }
    
    if (section === notFoundSection) {
        setTimeout(() => {
            notFoundSection.style.display = 'none';
            searchCitySection.style.display = 'flex';
        }, 1500);
    }
}


// --- DATA FETCHING AND PROCESSING ---
function handleManualSearch() {
    const query = cityInput.value.trim();
    if (query) {
        getCoordsForCity(query);
        cityInput.value = '';
        cityInput.blur();
    }
}

async function getCitySuggestions(query) {
    const url = `https://api.openweathermap.org/geo/1.0/direct?q=${query}&limit=5&appid=${apiKey}`;
    try {
        const response = await fetch(url);
        displaySuggestions(await response.json());
    } catch (error) {
        console.error("Error fetching city suggestions:", error);
    }
}

async function getCoordsForCity(city) {
    const url = `https://api.openweathermap.org/geo/1.0/direct?q=${city}&limit=1&appid=${apiKey}`;
    try {
        const response = await fetch(url);
        const data = await response.json();
        if (data.length > 0) {
            updateWeatherInfo(data[0].lat, data[0].lon);
        } else {
            showDisplaySection(notFoundSection);
        }
    } catch (error) {
        console.error("Error fetching coordinates:", error);
        showDisplaySection(notFoundSection);
    }
}

async function updateWeatherInfo(lat, lon) {
    showSpinner();
    lastLat = lat;
    lastLon = lon;
    
    const weatherUrl = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${apiKey}&units=${currentUnit}`;
    const forecastUrl = `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&appid=${apiKey}&units=${currentUnit}`;
    const aqiUrl = `https://api.openweathermap.org/data/2.5/air_pollution?lat=${lat}&lon=${lon}&appid=${apiKey}`;

    try {
        const responses = await Promise.all([fetch(weatherUrl), fetch(forecastUrl), fetch(aqiUrl)]);
        const [weatherData, forecastData, aqiData] = await Promise.all(responses.map(res => res.json()));

        if (weatherData.cod !== 200) {
            hideSpinner();
            showDisplaySection(notFoundSection);
            return;
        }

        updateCurrentWeatherUI(weatherData);
        updateHourlyForecastUI(forecastData);
        updateForecastUI(forecastData);
        updateAqiUI(aqiData);
        
        updateMap(lat, lon); // No longer passing city name
        
        hideSpinner();
        showDisplaySection(weatherInfoSection);

    } catch (error) {
        console.error("Error updating weather info:", error);
        hideSpinner();
        showDisplaySection(notFoundSection);
    }
}


// --- UI UPDATE FUNCTIONS ---
function updateCurrentWeatherUI(data) {
    const { name, sys: { country }, main: { temp, humidity, feels_like }, weather: [{ id, main }], wind: { speed } } = data;
    
    currentLocation = { id: `${lastLat},${lastLon}`, name, lat: lastLat, lon: lastLon };
    const tempUnit = currentUnit === 'metric' ? '°C' : '°F';
    const speedUnit = currentUnit === 'metric' ? 'M/s' : 'Mph';
    countryTxt.textContent = `${name}, ${country}`;
    tempTxt.textContent = `${Math.round(temp)}${tempUnit}`;
    conditionTxt.textContent = main;
    humidityValueTxt.textContent = `${humidity}%`;
    windValueTxt.textContent = `${speed} ${speedUnit}`;
    feelsLikeValueTxt.textContent = `${Math.round(feels_like)}${tempUnit}`;
    
    const sunriseTime = new Date(data.sys.sunrise * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const sunsetTime = new Date(data.sys.sunset * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    sunriseSunsetValueTxt.textContent = `${sunriseTime} / ${sunsetTime}`;
    
    weatherSummaryImg.src = `assets/weather/${getWeatherIcon(id)}`;
    currentDataTxt.textContent = getCurrentDate();
    updateFavoriteStar();
}

function updateHourlyForecastUI({ list }) {
    hourlyForecastContainer.innerHTML = '';
    const tempUnit = currentUnit === 'metric' ? '°C' : '°F';
    list.slice(0, 8).forEach(item => {
        const time = new Date(item.dt_txt).toLocaleTimeString('en-US', { hour: 'numeric', hour12: true });
        const hourlyItem = `<div class="hourly-item"><h5 class="regular-txt">${time}</h5><img src="assets/weather/${getWeatherIcon(item.weather[0].id)}" class="hourly-item-img" alt="Hourly weather icon"><h5>${Math.round(item.main.temp)}${tempUnit}</h5></div>`;
        hourlyForecastContainer.insertAdjacentHTML('beforeend', hourlyItem);
    });
}

function updateForecastUI({ list }) {
    forecastItemsContainer.innerHTML = '';
    const tempUnit = currentUnit === 'metric' ? '°C' : '°F';
    list.filter(item => item.dt_txt.includes('12:00:00')).forEach(forecast => {
        const formattedDate = new Date(forecast.dt_txt).toLocaleDateString('en-US', { day: '2-digit', month: 'short' });
        const forecastItem = `<div class="forecast-item"><h5 class="forecast-item-date regular-txt">${formattedDate}</h5><img src="assets/weather/${getWeatherIcon(forecast.weather[0].id)}" class="forecast-item-img" alt="Forecast icon"><h5 class="forecast-item-temp">${Math.round(forecast.main.temp)}${tempUnit}</h5></div>`;
        forecastItemsContainer.insertAdjacentHTML('beforeend', forecastItem);
    });
}

function updateAqiUI({ list }) {
    aqiValueTxt.textContent = getAqiText(list[0].main.aqi);
}

function displaySuggestions(cities) {
    suggestionsList.innerHTML = '';
    cities.forEach(city => {
        const item = document.createElement('div');
        item.classList.add('suggestion-item');
        item.textContent = `${city.name}, ${city.country}${city.state ? `, ${city.state}` : ''}`;
        item.dataset.lat = city.lat;
        item.dataset.lon = city.lon;
        suggestionsList.appendChild(item);
    });
}


// --- MAP LOGIC FUNCTIONS ---
function initializeMap() {
    map = L.map('map', { zoomControl: false }).setView([20.5937, 78.9629], 5);
    L.control.zoom({ position: 'topleft' }).addTo(map);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);

    // === NEW: Add click event listener to the map ===
    map.on('click', function(e) {
        const { lat, lng } = e.latlng;
        updateWeatherInfo(lat, lng);
    });
}

function updateMap(lat, lon) {
    if (!map) return;

    // This setTimeout is the critical fix. It gives the browser a moment
    // to make the map container visible before we tell the map to resize.
    setTimeout(function() {
        map.invalidateSize(); // This line tells the map to re-check its size
        map.setView([lat, lon], 12, { animate: true });

        if (marker) {
            marker.setLatLng([lat, lon]);
        } else {
            marker = L.marker([lat, lon]).addTo(map);
        }
    }, 100);
}


// --- HELPER FUNCTIONS ---
function getWeatherIcon(id) {
    if (id <= 232) return 'thunderstorm.svg';
    if (id <= 321) return 'drizzle.svg';
    if (id <= 531) return 'rain.svg';
    if (id <= 622) return 'snow.svg';
    if (id <= 781) return 'atmosphere.svg';
    if (id === 800) return 'clear.svg';
    return 'clouds.svg';
}

function getAqiText(aqi) {
    return ['Good', 'Fair', 'Moderate', 'Poor', 'Very Poor'][aqi - 1] || 'Unknown';
}

function getCurrentDate() {
    return new Date().toLocaleDateString('en-GB', { weekday: 'short', day: '2-digit', month: 'short' });
}


// --- INITIALIZATION ---
function initializeApp() {
    getFavoritesFromStorage();
    renderFavoritesList();
    
    initializeMap();
    
    if (navigator.geolocation) {
        showSpinner();
        navigator.geolocation.getCurrentPosition(onSuccess, onError);
    } else {
        alert("Geolocation is not supported by your browser. Please search for a city manually.");
    }
}


initializeApp(); // Run when the script loads
