const searchForm = document.getElementById("artist-search-form");
const searchInput = document.getElementById("artist-search-input");
const searchStatus = document.getElementById("search-status");
const artistList = document.getElementById("artist-list");
const albumSetion = document.getElementById("album-section");
const albumHeading = document.getElementById("album-heading");
const albumlist = document.getElementById("album-list");
const favoritesList = document.getElementById("favorites-list");

// API URLs 
const MUSICBRAINZ_API_URL = "https://musicbrainz.org/ws/2";
const COVERARTARCHIVE_API_URL = "https://coverartarchive.org/release-group";

// Store favorites in localStorage
let favorites = JSON.parse(localStorage.getItem("fmFavorites")) || [];

// Keep MusicBrains at least 1 second between requests to avoid rate limiting (Suggestion to add by AI when asking about API implementation)
let lastRequestTime = 0;
let requestQueue = Promise.resolve();

function musicBrainzFetch(url) {
    const request = requestQueue.then(async () => {
        const timeSinceLastRequest = Date.now() - lastRequestTime;
        const waitTime = Math.max(0, 1000 - timeSinceLastRequest);

        await new Promise(resolve => setTimeout(resolve, waitTime));

        const response = await fetch(url);
        lastRequestTime = Date.now();
        
        if (!response.ok) {
            throw new Error(`Music search failed: ${response.status}`);
        }

        return response.json();
    });

    requestQueue = request.catch(() => {});
    return request;
}

// search for artists using MusicBrainz API (assistance ai with search functionality)

searchForm.addEventListener("submit", async function(event) {
    event.preventDefault();

    const artistName = searchInput.value.trim();

    if (!artistName) {
        searchStatus.textContent = "Please enter an artist name.";
        return;
    }

    searchStatus.textContent = "Searching for artists...";
    artistList.replaceChildren();
    albumList.replaceChildren();
    albumSection.hidden = true;

    try {
        const url = `${MUSICBRAINZ_URL}/artist/?query=${encodeURIComponent(artistName)}&fmt=json&limit=8`;

        const data = await musicBrainzFetch(url);

        artistResults.replaceChildren();

        if (!data.artists || data.artists.length === 0) {
            searchStatus.textContent = "No artists found. Try another search.";
            return;
        }

        searchStatus.textContent = "Select an artist to explore their albums.";

        data.artists.forEach(artist => {
            const artistCard = document.createElement("button");
            artistCard.type = "button";
            artistCard.className = "artist-card";

            const name = document.createElement("h3");
            name.textContent = artist.name;

            const details = document.createElement("p");
            details.textContent = artist.country || "Country not listed";

            artistCard.append(name, details);

            artistCard.addEventListener("click", () => {
                getAlbums(artist.id, artist.name);
            });

            artistResults.appendChild(artistCard);
        });

    } catch (error) {
        console.error(error);
        searchStatus.textContent =
            "Something went wrong while searching. Please try again.";
    }
});

// get albums for selected artist using MusicBrainz API
async function getAlbums(artistId, artistName) {
    searchStatus.textContent = `Finding albums by ${artistName}...`;
    albumSection.hidden = false;
    albumHeading.textContent = `Albums by ${artistName}`;
    albumList.replaceChildren();

    try {
        const url = `${MUSICBRAINZ_URL}/release/?artist=${artistId}&type=album&fmt=json&limit=12`;

        const data = await musicBrainzFetch(url);

        if (!data.releases || data.releases.length === 0) {
            searchStatus.textContent = "No albums found for this artist.";
            return;
        }

        searchStatus.textContent = `Found ${data.releases.length} albums.`;

        data.releases.forEach(album => {
            createAlbumCard(album);
        });

    } catch (error) {
        console.error(error);
        searchStatus.textContent =
            "Unable to load albums. Please try again.";
    }
}

// Create album card and fetch cover art from Cover Art Archive
function createAlbumCard(album) {
    const card = document.createElement("article");
    card.className = "album-card";

    const cover = document.createElement("img");
    cover.className = "album-cover";
    cover.src = `${COVER_ART_URL}/${album.id}/front-250`;
    cover.alt = `Cover artwork for ${album.title}`;
    cover.loading = "lazy";

    cover.addEventListener("error", () => {
        cover.src = "images/placeholder.png"; // Fallback image if cover art is not available (add image to images folder)
    }, { once: true });

    const title = document.createElement("h3");
    title.textContent = album.title;

    const date = document.createElement("p");
    date.textContent = album.date 
    ? `Released: ${album.date}` 
    : "Release date not listed";

    const favoriteButton = document.createElement("button");
    favoriteButton.type = "button";
    favoriteButton.className = "favorite-button";

    function updateFavoriteButton() {
        const isFavorite = favorites.some(item => item.id === album.id);
        favoriteButton.textContent = isFavorite
            ? "♥ Saved"
            : "♡ Add to Collection";
    }

    updateFavoriteButton();

    favoriteButton.addEventListener("click", () => {
        const isFavorite = favorites.some(item => item.id === album.id);

        if (isFavorite) {
            favorites = favorites.filter(item => item.id !== album.id);
        } else {
            favorites.push({ 
                id: album.id, 
                title: album.title, 
                artist: album["artist-credit"]?.[0]?.name || "",
            });
        }
        localStorage.setItem("fmFavorites", JSON.stringify(favorites));

        updateFavoriteButton();
        displayFavorites();
    });

    card.append(cover, title, date, favoriteButton);
    albumResults.appendChild(card);
}

function displayFavorites() {
    favoritesList.replaceChildren();

    if (favorites.length === 0) {
        const emptyMessage = document.createElement("p");
        emptyMessage.className = "empty-message";
        emptyMessage.textContent =
            "Your collection is empty. Save an album to get started!";

        favoritesList.appendChild(emptyMessage);
        return;
    }

    favorites.forEach(album => {
        const card = document.createElement("article");
        card.className = "album-card";

        const cover = document.createElement("img");
        cover.className = "album-cover";
        cover.src = `${COVER_ART_URL}/${album.id}/front-250`;
        cover.alt = `Cover artwork for ${album.title}`;
        cover.loading = "lazy";

        cover.addEventListener("error", () => {
            cover.src = "images/album-placeholder.png";
        }, { once: true });

        const title = document.createElement("h3");
        title.textContent = album.title;

        const artist = document.createElement("p");
        artist.textContent = album.artist || "Artist unavailable";

        const removeButton = document.createElement("button");
        removeButton.type = "button";
        removeButton.className = "favorite-button";
        removeButton.textContent = "Remove from Collection";

        removeButton.addEventListener("click", () => {
            favorites = favorites.filter(item => item.id !== album.id);
            localStorage.setItem("fmFavorites", JSON.stringify(favorites));
            displayFavorites();
        });

        card.append(cover, title, artist, removeButton);
        favoritesList.appendChild(card);
    });
}

// Show saved favorites when the page opens
displayFavorites();