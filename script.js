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
    artistResults.replaceChildren();
    albumResults.replaceChildren();
    albumsSection.hidden = true;

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
