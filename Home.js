// TMDb API Configuration
const API_KEY = '7ff12a58cfd6d0236d1c5e26cc4ab014';
const BASE_URL = 'https://api.themoviedb.org/3';
const IMAGE_BASE = 'https://image.tmdb.org/t/p/w500';

// Function to fetch movies from API
async function fetchMovies(endpoint) {
    try {
        const response = await fetch(`${BASE_URL}${endpoint}?api_key=${API_KEY}`);
        
        if (!response.ok) {
            console.error('API Error:', response.status, response.statusText);
            const errorData = await response.json();
            console.error('Error details:', errorData);
            return [];
        }
        
        const data = await response.json();
        console.log('Movies fetched successfully:', data.results.length, 'movies');
        return data.results;
    } catch (error) {
        console.error('Error fetching movies:', error);
        return [];
    }
}

// Function to search movies
async function searchMovies(query) {
    try {
        const response = await fetch(`${BASE_URL}/search/movie?api_key=${API_KEY}&query=${encodeURIComponent(query)}`);
        
        if (!response.ok) {
            console.error('API Error:', response.status, response.statusText);
            const errorData = await response.json();
            console.error('Error details:', errorData);
            return [];
        }
        
        const data = await response.json();
        console.log('Search results:', data.results.length, 'movies found');
        return data.results;
    } catch (error) {
        console.error('Error searching movies:', error);
        return [];
    }
}

// Function to create movie card HTML (FIXED - NOW CLICKABLE)
function createMovieCard(movie) {
    const posterPath = movie.poster_path 
        ? `${IMAGE_BASE}${movie.poster_path}` 
        : 'https://via.placeholder.com/300x400?text=No+Image';
    
    const rating = movie.vote_average ? movie.vote_average.toFixed(1) : 'N/A';
    const year = movie.release_date ? movie.release_date.split('-')[0] : 'TBA';

    return `
        <div class="movie-card" onclick="openMovieDetails(${movie.id})">
            <img src="${posterPath}" alt="${movie.title}">
            <div class="movie-info">
                <h3>${movie.title}</h3>
                <div class="movie-meta">
                    <span>${year}</span>
                    <span class="rating">★ ${rating}</span>
                </div>
            </div>
        </div>
    `;
}

// Function to create featured movie
function createFeaturedMovie(movie) {
    const backdropPath = movie.backdrop_path 
        ? `${IMAGE_BASE}${movie.backdrop_path}` 
        : 'https://via.placeholder.com/600x400?text=No+Image';
    
    const rating = movie.vote_average ? movie.vote_average.toFixed(1) : 'N/A';

    return `
        <div class="movie-card-featured" onclick="openMovieDetails(${movie.id})">
            <img src="${backdropPath}" alt="${movie.title}">
            <div class="movie-card-featured-info">
                <h3>${movie.title}</h3>
                <span class="rating">★ ${rating}</span>
            </div>
        </div>
    `;
}

// Function to display movies in a grid
function displayMovies(movies, gridId) {
    const grid = document.getElementById(gridId);
    if (movies.length === 0) {
        grid.innerHTML = '<div class="loading">No movies found</div>';
        return;
    }
    grid.innerHTML = movies.map(movie => createMovieCard(movie)).join('');
}

// Load featured movie
async function loadFeaturedMovie() {
    const movies = await fetchMovies('/movie/popular');
    if (movies.length > 0) {
        document.getElementById('featuredMovie').innerHTML = createFeaturedMovie(movies[0]);
    }
}

// Load trending movies
async function loadTrendingMovies() {
    const movies = await fetchMovies('/trending/movie/week');
    displayMovies(movies.slice(0, 10), 'trendingGrid');
}

// Load top rated movies
async function loadTopRatedMovies() {
    const movies = await fetchMovies('/movie/top_rated');
    displayMovies(movies.slice(0, 10), 'topratedGrid');
}

// Load upcoming movies
async function loadUpcomingMovies() {
    const movies = await fetchMovies('/movie/upcoming');
    displayMovies(movies.slice(0, 10), 'upcomingGrid');
}

// Search functionality
let searchTimeout;
document.getElementById('searchInput').addEventListener('input', (e) => {
    clearTimeout(searchTimeout);
    const query = e.target.value.trim();
    
    if (query.length < 2) {
        document.getElementById('searchResults').classList.remove('active');
        return;
    }

    searchTimeout = setTimeout(async () => {
        const movies = await searchMovies(query);
        document.getElementById('searchResults').classList.add('active');
        displayMovies(movies.slice(0, 20), 'searchGrid');
        
        document.getElementById('searchResults').scrollIntoView({ behavior: 'smooth' });
    }, 500);
});

// Show specific section
function showSection(section) {
    document.getElementById('searchResults').classList.remove('active');
    document.getElementById('searchInput').value = '';
    
    const targetId = section === 'trending' ? 'trendingSection' : 
                   section === 'toprated' ? 'topratedSection' : 'upcomingSection';
    
    document.getElementById(targetId).scrollIntoView({ behavior: 'smooth' });
}

// Authentication Modal Functions
function openAuthModal(type) {
    document.getElementById('authModal').style.display = 'block';
    if (type === 'login') {
        document.getElementById('loginForm').style.display = 'block';
        document.getElementById('signupForm').style.display = 'none';
    } else {
        document.getElementById('loginForm').style.display = 'none';
        document.getElementById('signupForm').style.display = 'block';
    }
}

function closeAuthModal() {
    document.getElementById('authModal').style.display = 'none';
}

function switchToSignup() {
    document.getElementById('loginForm').style.display = 'none';
    document.getElementById('signupForm').style.display = 'block';
}

function switchToLogin() {
    document.getElementById('signupForm').style.display = 'none';
    document.getElementById('loginForm').style.display = 'block';
}

// Close modal when clicking outside
window.onclick = function(event) {
    const authModal = document.getElementById('authModal');
    const movieModal = document.getElementById('movieModal');
    const favoritesModal = document.getElementById('favoritesModal');
    const twoFAModal = document.getElementById('twoFAModal');
    
    if (event.target === authModal) {
        closeAuthModal();
    }
    if (event.target === movieModal) {
        closeMovieModal();
    }
    if (event.target === favoritesModal) {
        closeFavoritesModal();
    }
    if (event.target === twoFAModal) {
        close2FAModal();
    }
}

// Backend API URL
const API_URL = 'http://localhost:5000/api';

// Handle Login with Flask backend
async function handleLogin() {
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;
    const rememberMe = document.getElementById('rememberMe').checked;
    
    if (!email || !password) {
        alert('Please fill in all fields');
        return;
    }
    
    try {
        const response = await fetch(`${API_URL}/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ email, password })
        });
        
        const data = await response.json();
        
        if (data.success) {
            // Store token in localStorage
            localStorage.setItem('authToken', data.token);
            localStorage.setItem('user', JSON.stringify(data.user));
            
            alert(`Welcome back, ${data.user.name}!`);
            closeAuthModal();
            
            // Update UI to show logged in state
            updateUIForLoggedInUser(data.user);
        } else {
            alert(data.message || 'Login failed');
        }
    } catch (error) {
        console.error('Login error:', error);
        alert('Failed to connect to server. Make sure Flask backend is running.');
    }
}

// Handle Signup with Flask backend
async function handleSignup() {
    const name = document.getElementById('signupName').value;
    const email = document.getElementById('signupEmail').value;
    const password = document.getElementById('signupPassword').value;
    const confirmPassword = document.getElementById('signupConfirmPassword').value;
    const agreeTerms = document.getElementById('agreeTerms').checked;
    
    if (!name || !email || !password || !confirmPassword) {
        alert('Please fill in all fields');
        return;
    }
    
    if (password !== confirmPassword) {
        alert('Passwords do not match');
        return;
    }
    
    if (!agreeTerms) {
        alert('Please agree to the Terms of Service');
        return;
    }
    
    try {
        const response = await fetch(`${API_URL}/signup`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ name, email, password })
        });
        
        const data = await response.json();
        
        if (data.success) {
            localStorage.setItem('authToken', data.token);
            localStorage.setItem('user', JSON.stringify(data.user));
            
            alert(`Account created successfully! Welcome, ${data.user.name}!`);
            closeAuthModal();
            
            updateUIForLoggedInUser(data.user);
        } else {
            alert(data.message || 'Signup failed');
        }
    } catch (error) {
        console.error('Signup error:', error);
        alert('Failed to connect to server. Make sure Flask backend is running.');
    }
}

// Update UI for logged in user
function updateUIForLoggedInUser(user) {
    document.getElementById('authButton').style.display = 'none';
    
    const userMenu = document.getElementById('userMenu');
    userMenu.style.display = 'block';
    
    document.getElementById('userName').textContent = user.name;
    document.getElementById('userEmail').textContent = user.email;
    
    // Show email verification status
    const verifiedBadge = document.getElementById('emailVerifiedBadge');
    if (user.email_verified) {
        verifiedBadge.innerHTML = '<span style="color: #4ade80; font-size: 0.85rem;">✓ Email Verified</span>';
    } else {
        verifiedBadge.innerHTML = '<span style="color: #ffa500; font-size: 0.85rem;">⚠️ Email Not Verified</span>';
    }
    
    // Show Admin Dashboard link if user is admin
    if (user.is_admin) {
        document.getElementById('adminDashboardLink').style.display = 'flex';
        document.getElementById('adminDivider').style.display = 'block';
        console.log('👨‍💼 Admin user detected - showing admin dashboard link');
    } else {
        document.getElementById('adminDashboardLink').style.display = 'none';
        document.getElementById('adminDivider').style.display = 'none';
    }
    
    const initials = user.name.split(' ')
        .map(word => word[0])
        .join('')
        .toUpperCase()
        .substring(0, 2);
    document.getElementById('userInitials').textContent = initials;
    
    console.log('✅ User logged in:', user.name);
}

// Toggle user dropdown
function toggleUserDropdown() {
    const dropdown = document.getElementById('userDropdown');
    dropdown.classList.toggle('show');
}

// Close dropdown when clicking outside
document.addEventListener('click', function(event) {
    const userMenu = document.getElementById('userMenu');
    const dropdown = document.getElementById('userDropdown');
    
    if (userMenu && !userMenu.contains(event.target)) {
        dropdown.classList.remove('show');
    }
});

// Logout function
function logout() {
    if (confirm('Are you sure you want to logout?')) {
        localStorage.removeItem('authToken');
        localStorage.removeItem('user');
        
        // Show Sign In button
        document.getElementById('authButton').style.display = 'block';
        
        // Hide user menu
        document.getElementById('userMenu').style.display = 'none';
        
        // Close dropdown
        document.getElementById('userDropdown').classList.remove('show');
        
        alert('You have been logged out successfully!');
        console.log('👋 User logged out');
    }
}

// Check if user is logged in on page load
function checkAuthStatus() {
    const token = localStorage.getItem('authToken');
    const user = localStorage.getItem('user');
    
    if (token && user) {
        const userData = JSON.parse(user);
        updateUIForLoggedInUser(userData);
    }
}

// Initialize the page
async function init() {
    console.log('🎬 Initializing IMDB Redesign...');
    console.log('📡 API Key configured, fetching movies...');
    
    // Check authentication status
    checkAuthStatus();
    
    await Promise.all([
        loadFeaturedMovie(),
        loadTrendingMovies(),
        loadTopRatedMovies(),
        loadUpcomingMovies()
    ]);
    
    console.log('✅ All sections loaded successfully!');
}

// Load everything when page loads
window.addEventListener('DOMContentLoaded', init);

// ============================================
// MOVIE DETAILS MODAL
// ============================================

async function openMovieDetails(movieId) {
    document.getElementById('movieModal').style.display = 'block';
    document.getElementById('movieDetailsContent').innerHTML = '<div class="loading">Loading movie details...</div>';
    
    try {
        // Fetch movie details
        const [detailsRes, creditsRes] = await Promise.all([
            fetch(`${BASE_URL}/movie/${movieId}?api_key=${API_KEY}`),
            fetch(`${BASE_URL}/movie/${movieId}/credits?api_key=${API_KEY}`)
        ]);
        
        const details = await detailsRes.json();
        const credits = await creditsRes.json();
        
        // Check if favorited
        const token = localStorage.getItem('authToken');
        let isFavorited = false;
        if (token) {
            try {
                const favRes = await fetch(`${API_URL}/favorites/check/${movieId}`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                const favData = await favRes.json();
                isFavorited = favData.is_favorited;
            } catch (e) {
                console.log('Not logged in, favorite status unknown');
            }
        }
        
        displayMovieDetails(details, credits, isFavorited);
    } catch (error) {
        console.error('Error loading movie details:', error);
        document.getElementById('movieDetailsContent').innerHTML = '<div class="loading">Failed to load movie details</div>';
    }
}

function displayMovieDetails(movie, credits, isFavorited) {
    const posterPath = movie.poster_path 
        ? `${IMAGE_BASE}${movie.poster_path}` 
        : 'https://via.placeholder.com/300x400?text=No+Image';
    
    const backdropPath = movie.backdrop_path 
        ? `https://image.tmdb.org/t/p/original${movie.backdrop_path}` 
        : '';
    
    const rating = movie.vote_average ? movie.vote_average.toFixed(1) : 'N/A';
    const year = movie.release_date ? movie.release_date.split('-')[0] : 'TBA';
    const runtime = movie.runtime ? `${movie.runtime} min` : 'N/A';
    const genres = movie.genres ? movie.genres.map(g => g.name).join(', ') : 'N/A';
    
    const cast = credits.cast.slice(0, 6).map(actor => {
        const actorPhoto = actor.profile_path 
            ? `${IMAGE_BASE}${actor.profile_path}` 
            : 'https://via.placeholder.com/120x180?text=No+Photo';
        
        return `
            <div class="cast-member">
                <img src="${actorPhoto}" alt="${actor.name}">
                <div class="name">${actor.name}</div>
                <div class="character">${actor.character}</div>
            </div>
        `;
    }).join('');
    
    const favoriteBtn = localStorage.getItem('authToken') 
        ? `<button class="favorite-btn ${isFavorited ? 'favorited' : ''}" onclick="toggleFavorite(${movie.id}, '${movie.title.replace(/'/g, "\\'")}', '${movie.poster_path}', ${movie.vote_average}, '${year}')">
             ${isFavorited ? '❤️ Remove from Favorites' : '🤍 Add to Favorites'}
           </button>`
        : '';
    
    const html = `
        <div class="movie-details-header">
            <div class="movie-details-poster">
                <img src="${posterPath}" alt="${movie.title}">
            </div>
            <div class="movie-details-info">
                <h2>${movie.title}</h2>
                <div class="movie-details-meta">
                    <div class="meta-item">
                        <span>⭐</span>
                        <span>${rating}/10</span>
                    </div>
                    <div class="meta-item">
                        <span>📅</span>
                        <span>${year}</span>
                    </div>
                    <div class="meta-item">
                        <span>⏱️</span>
                        <span>${runtime}</span>
                    </div>
                </div>
                <div class="meta-item" style="margin-bottom: 1rem;">
                    <span>🎭</span>
                    <span>${genres}</span>
                </div>
                ${favoriteBtn}
            </div>
        </div>
        
        <div class="movie-overview">
            <h3>Overview</h3>
            <p>${movie.overview || 'No overview available.'}</p>
        </div>
        
        <div class="movie-cast">
            <h3>Cast</h3>
            <div class="cast-grid">
                ${cast}
            </div>
        </div>
    `;
    
    document.getElementById('movieDetailsContent').innerHTML = html;
}

function closeMovieModal() {
    document.getElementById('movieModal').style.display = 'none';
}

// ============================================
// FAVORITES SYSTEM
// ============================================

async function toggleFavorite(movieId, title, poster, rating, year) {
    const token = localStorage.getItem('authToken');
    
    if (!token) {
        alert('Please login to add favorites');
        return;
    }
    
    const btn = event.target;
    const isFavorited = btn.classList.contains('favorited');
    
    try {
        const endpoint = isFavorited ? '/favorites/remove' : '/favorites/add';
        const response = await fetch(`${API_URL}${endpoint}`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                movie_id: movieId,
                movie_title: title,
                movie_poster: poster,
                movie_rating: rating,
                movie_year: year
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            if (isFavorited) {
                btn.classList.remove('favorited');
                btn.innerHTML = '🤍 Add to Favorites';
                console.log('💔 Removed from favorites');
            } else {
                btn.classList.add('favorited');
                btn.innerHTML = '❤️ Remove from Favorites';
                console.log('❤️ Added to favorites');
            }
        } else {
            alert(data.message || 'Failed to update favorites');
        }
    } catch (error) {
        console.error('Favorites error:', error);
        alert('Failed to update favorites');
    }
}

async function openFavoritesModal(event) {
    if (event) {
        event.preventDefault();
    }
    
    const token = localStorage.getItem('authToken');
    
    if (!token) {
        alert('Please login to view favorites');
        return;
    }
    
    document.getElementById('favoritesModal').style.display = 'block';
    document.getElementById('favoritesContent').innerHTML = '<div class="loading">Loading favorites...</div>';
    
    try {
        const response = await fetch(`${API_URL}/favorites`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        const data = await response.json();
        
        console.log('Favorites response:', data); // Debug log
        
        if (data.success) {
            displayFavorites(data.favorites);
        } else {
            document.getElementById('favoritesContent').innerHTML = '<div class="loading">Failed to load favorites</div>';
        }
    } catch (error) {
        console.error('Error loading favorites:', error);
        document.getElementById('favoritesContent').innerHTML = '<div class="loading">Failed to connect to server</div>';
    }
}

function displayFavorites(favorites) {
    console.log('Displaying favorites:', favorites); // Debug log
    
    if (!favorites || favorites.length === 0) {
        document.getElementById('favoritesContent').innerHTML = `
            <div class="loading" style="padding: 2rem;">
                <p style="font-size: 1.2rem; margin-bottom: 1rem;">📭 No favorites yet</p>
                <p style="color: rgba(255,255,255,0.6);">Start adding movies to your favorites by clicking the heart button on movie details!</p>
            </div>
        `;
        return;
    }
    
    const html = favorites.map(fav => {
        const posterPath = fav.movie_poster 
            ? `${IMAGE_BASE}${fav.movie_poster}` 
            : 'https://via.placeholder.com/150x225?text=No+Image';
        
        return `
            <div class="favorite-card">
                <button class="remove-favorite" onclick="event.stopPropagation(); removeFavorite(${fav.movie_id})" title="Remove">×</button>
                <img src="${posterPath}" alt="${fav.movie_title}" onclick="closeFavoritesModal(); openMovieDetails(${fav.movie_id})">
                <div class="favorite-info">
                    <h4>${fav.movie_title}</h4>
                    <div class="favorite-meta">
                        <span>${fav.movie_year || 'N/A'}</span>
                        <span>★ ${fav.movie_rating ? parseFloat(fav.movie_rating).toFixed(1) : 'N/A'}</span>
                    </div>
                </div>
            </div>
        `;
    }).join('');
    
    document.getElementById('favoritesContent').innerHTML = html;
}

async function removeFavorite(movieId) {
    const token = localStorage.getItem('authToken');
    
    if (!confirm('Remove from favorites?')) {
        return;
    }
    
    try {
        const response = await fetch(`${API_URL}/favorites/remove`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ movie_id: movieId })
        });
        
        const data = await response.json();
        
        if (data.success) {
            console.log('✅ Removed from favorites');
            // Reload favorites to show updated list
            await openFavoritesModal();
        } else {
            alert(data.message || 'Failed to remove favorite');
        }
    } catch (error) {
        console.error('Error removing favorite:', error);
        alert('Failed to remove favorite');
    }
}

function closeFavoritesModal() {
    document.getElementById('favoritesModal').style.display = 'none';
}

// ============================================
// ADMIN DASHBOARD
// ============================================

function openAdminDashboard(event) {
    if (event) {
        event.preventDefault();
    }
    window.open('admin.html', '_blank');
}

// ============================================
// 2FA FUNCTIONALITY
// ============================================

function close2FAModal() {
    document.getElementById('twoFAModal').style.display = 'none';
}

async function open2FASettings() {
    const token = localStorage.getItem('authToken');
    const user = JSON.parse(localStorage.getItem('user'));
    
    if (!token) {
        alert('Please login first');
        return;
    }
    
    document.getElementById('twoFAModal').style.display = 'block';
    
    // Check if 2FA is already enabled
    if (user.two_fa_enabled) {
        document.getElementById('twoFASubtitle').textContent = '2FA is currently enabled';
        document.getElementById('twoFAStatusText').innerHTML = '✅ Two-factor authentication is <strong>ACTIVE</strong>';
        document.getElementById('setup2FASection').style.display = 'none';
        document.getElementById('disable2FASection').style.display = 'block';
    } else {
        document.getElementById('twoFASubtitle').textContent = 'Setup two-factor authentication';
        document.getElementById('twoFAStatusText').innerHTML = '⚠️ Two-factor authentication is <strong>NOT ENABLED</strong>';
        document.getElementById('setup2FASection').style.display = 'block';
        document.getElementById('disable2FASection').style.display = 'none';
        
        // Setup 2FA
        await setup2FA();
    }
}

async function setup2FA() {
    const token = localStorage.getItem('authToken');
    const user = JSON.parse(localStorage.getItem('user'));
    
    try {
        const response = await fetch(`${API_URL}/setup-2fa`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            }
        });
        
        const data = await response.json();
        
        if (data.success) {
            // Display QR code
            document.getElementById('qrCode').src = `${API_URL}/2fa-qr/${data.secret}?email=${user.email}`;
            document.getElementById('manualKey').textContent = data.secret;
            
            console.log('🔐 2FA setup initiated');
        } else {
            alert(data.message || 'Failed to setup 2FA');
        }
    } catch (error) {
        console.error('2FA setup error:', error);
        alert('Failed to connect to server');
    }
}

async function verify2FA() {
    const code = document.getElementById('verify2FACode').value;
    const token = localStorage.getItem('authToken');
    
    if (!code || code.length !== 6) {
        alert('Please enter a valid 6-digit code');
        return;
    }
    
    try {
        const response = await fetch(`${API_URL}/verify-2fa`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ code })
        });
        
        const data = await response.json();
        
        if (data.success) {
            alert('✅ Two-factor authentication has been enabled!');
            
            // Update user in localStorage
            const user = JSON.parse(localStorage.getItem('user'));
            user.two_fa_enabled = true;
            localStorage.setItem('user', JSON.stringify(user));
            
            close2FAModal();
            console.log('✅ 2FA enabled successfully');
        } else {
            alert(data.message || 'Invalid code. Please try again.');
        }
    } catch (error) {
        console.error('2FA verification error:', error);
        alert('Failed to verify code');
    }
}

async function disable2FA() {
    const code = document.getElementById('disable2FACode').value;
    const token = localStorage.getItem('authToken');
    
    if (!code || code.length !== 6) {
        alert('Please enter a valid 6-digit code');
        return;
    }
    
    if (!confirm('Are you sure you want to disable 2FA? This will make your account less secure.')) {
        return;
    }
    
    try {
        const response = await fetch(`${API_URL}/disable-2fa`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ code })
        });
        
        const data = await response.json();
        
        if (data.success) {
            alert('⚠️ Two-factor authentication has been disabled');
            
            // Update user in localStorage
            const user = JSON.parse(localStorage.getItem('user'));
            user.two_fa_enabled = false;
            localStorage.setItem('user', JSON.stringify(user));
            
            close2FAModal();
            console.log('⚠️ 2FA disabled');
        } else {
            alert(data.message || 'Invalid code. Please try again.');
        }
    } catch (error) {
        console.error('2FA disable error:', error);
        alert('Failed to disable 2FA');
    }
}