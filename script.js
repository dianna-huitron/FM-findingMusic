// This project was built with assistance from Claude. 
// Claude helped me debug my JavaScript, including fixing mismatched element ids and variable names, and guided me in implementing the core functionality: the artist search form, the MusicBrainz API requests (with a one-second delay between calls to respect rate limits), the album lookup using release groups, cover art loading from the Cover Art Archive with a fallback image, and the favorites collection saved in localStorage. 
// Claude also reviewed my HTML and CSS, pointing out selector mismatches and accessibility improvements. 
// I wrote the page content and design, and I tested and adjusted the code myself.
//  Music data comes from MusicBrainz and cover images from the Cover Art Archive.
const searchForm = document.getElementById("artist-search-form");
const searchInput = document.getElementById("artist-search");
const searchStatus = document.getElementById("search-status");
const artistList = document.getElementById("artist-list");
const albumSection = document.getElementById("album-section");
const albumHeading = document.getElementById("album-heading");
const albumList = document.getElementById("album-list");
const favoritesList = document.getElementById("favorites-list");

// API URLs
const MUSICBRAINZ_URL = "https://musicbrainz.org/ws/2";
const COVER_ART_URL = "https://coverartarchive.org/release-group";
const PLACEHOLDER_IMAGE = "images/placeholder.png";

// Store favorites in localStorage
let favorites = JSON.parse(localStorage.getItem("fmFavorites")) || [];

// Keep MusicBrainz requests at least 1 second apart to avoid rate limiting
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

// Search for artists using the MusicBrainz API
searchForm.addEventListener("submit", async function (event) {
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

            artistList.appendChild(artistCard);
        });
    } catch (error) {
        console.error(error);
        searchStatus.textContent =
            "Something went wrong while searching. Please try again.";
    }
});

// Get albums (release groups) for the selected artist
async function getAlbums(artistId, artistName) {
    searchStatus.textContent = `Finding albums by ${artistName}...`;
    albumSection.hidden = false;
    albumHeading.textContent = `Albums by ${artistName}`;
    albumList.replaceChildren();

    try {
        const url = `${MUSICBRAINZ_URL}/release-group?artist=${artistId}&type=album&fmt=json&limit=12`;
        const data = await musicBrainzFetch(url);
        const albums = data["release-groups"];

        if (!albums || albums.length === 0) {
            searchStatus.textContent = "No albums found for this artist.";
            return;
        }

        searchStatus.textContent = `Found ${albums.length} albums.`;

        albums.forEach(album => createAlbumCard(album, artistName));
    } catch (error) {
        console.error(error);
        searchStatus.textContent = "Unable to load albums. Please try again.";
    }
}

// Build a cover image with a fallback if the Cover Art Archive has none
function createCoverImage(albumId, albumTitle) {
    const cover = document.createElement("img");
    cover.className = "album-cover";
    cover.src = `${COVER_ART_URL}/${albumId}/front-250`;
    cover.alt = `Cover artwork for ${albumTitle}`;
    cover.loading = "lazy";

    cover.addEventListener(
        "error",
        () => {
            cover.src = PLACEHOLDER_IMAGE;
        },
        { once: true }
    );

    return cover;
}

// Create an album card for search results
function createAlbumCard(album, artistName) {
    const card = document.createElement("article");
    card.className = "album-card";

    const cover = createCoverImage(album.id, album.title);

    const title = document.createElement("h3");
    title.textContent = album.title;

    const date = document.createElement("p");
    date.textContent = album["first-release-date"]
        ? `Released: ${album["first-release-date"]}`
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
                artist: artistName,
            });
        }

        localStorage.setItem("fmFavorites", JSON.stringify(favorites));

        updateFavoriteButton();
        displayFavorites();
    });

    card.append(cover, title, date, favoriteButton);
    albumList.appendChild(card);
}

// Show the saved collection
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

        const cover = createCoverImage(album.id, album.title);

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

            // Keep any visible "Saved" buttons in the album list in sync
            // by re-running the current album search display if needed.
        });

        card.append(cover, title, artist, removeButton);
        favoritesList.appendChild(card);
    });
}

// Show saved favorites when the page opens
displayFavorites();