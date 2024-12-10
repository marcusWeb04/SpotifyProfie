const clientId = "c0d1cfe8e19742d484a25447384bf581";
const params = new URLSearchParams(window.location.search);
const code = params.get("code");

// On vérifie le token
if (localStorage.getItem("token") !== null) {
  const profile = await fetchProfile(localStorage.getItem("token"));
  // Vérifie si le profil existe et contient une erreur
  if (profile?.error) {
    console.log(localStorage.getItem("token"));
    const accessToken = await getAccessToken(clientId, code);
    localStorage.setItem("token", accessToken);
    console.log(localStorage.getItem("token"));
    // profile
    const profile = await fetchProfile(accessToken);
    populateUI(profile);
    // artist
    const artists = await fetchArtists(accessToken);
    artistsUI(artists);
    // playlist
    const playlists = await fetchPlaylist(accessToken);
    playlistUI(playlists);
  } else if (!code) {
    redirectToAuthCodeFlow(clientId);
  } else {
    // artist
    const artists = await fetchArtists(localStorage.getItem("token"));
    artistsUI(artists);
    // playlist
    const playlists = await fetchPlaylist(localStorage.getItem("token"));
    playlistUI(playlists);
    // profile
    populateUI(profile);
  }
} else {
  if (!code) {
    redirectToAuthCodeFlow(clientId);
  } else {
    const accessToken = await getAccessToken(clientId, code);
    console.log(accessToken);
    localStorage.setItem("token", accessToken);
    // artist
    const artists = await fetchArtists(localStorage.getItem("token"));
    console.log(artists);
    artistsUI(artists);
    // playlist
    const playlists = await fetchPlaylist(localStorage.getItem("token"));
    playlistUI(playlists);
    // profile
    populateUI(profile);
  }
}

// Redirection de connexion
async function redirectToAuthCodeFlow(clientId) {
  const verifier = await generateCodeVerifier(128);
  const challenge = await generateCodeChallenge(verifier);

  localStorage.setItem("verifier", verifier);

  const params = new URLSearchParams();
  params.append("client_id", clientId);
  params.append("response_type", "code");
  params.append("redirect_uri", "http://localhost:5173/callback");
  params.append(
    "scope",
    "user-read-private user-read-email user-follow-read user-top-read"
  );
  params.append("code_challenge_method", "S256");
  params.append("code_challenge", challenge);

  document.location = `https://accounts.spotify.com/authorize?${params.toString()}`;
}

// Générer le token
async function getAccessToken(clientId, code) {
  try {
    const verifier = localStorage.getItem("verifier");

    if (!verifier) {
      throw new Error("vérifier est absent dans le localStorage.");
    }

    const params = new URLSearchParams();
    params.append("client_id", clientId);
    params.append("grant_type", "authorization_code");
    params.append("code", code);
    params.append("redirect_uri", "http://localhost:5173/callback");
    params.append("code_verifier", verifier);

    const response = await fetch("https://accounts.spotify.com/api/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: params,
    });

    if (!response.ok) {
      const errorDetails = await response.json();
      throw new Error(
        `Erreur de récupération du jeton: ${errorDetails.error} - ${errorDetails.error_description}`
      );
    }

    const { access_token } = await response.json();
    return access_token;
  } catch (error) {
    console.error("Impossible d'obtenir le jeton d'accès:", error.message);
    throw error;
  }
}

// Générer un code challenge
async function generateCodeChallenge(codeVerifier) {
  const data = new TextEncoder().encode(codeVerifier);
  const digest = await window.crypto.subtle.digest("SHA-256", data);
  return btoa(String.fromCharCode(...new Uint8Array(digest)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

// Vérification du code généré
async function generateCodeVerifier(length) {
  let text = "";
  const possible =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

  for (let i = 0; i < length; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
}

// Trouver le profil de l'utilisateur
async function fetchProfile(token) {
  try {
    const result = await fetch("https://api.spotify.com/v1/me", {
      method: "GET",
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!result.ok) {
      return await result.json(); // Retourne l'erreur JSON si la requête échoue
    }

    return await result.json();
  } catch (error) {
    console.error("Impossible de récupérer le profil:", error);
    throw error;
  }
}

// Trouver 6 artistes
async function fetchArtists(token) {
  try {
    const result = await fetch(
      "https://api.spotify.com/v1/me/following?type=artist&limit=6",
      {
        method: "GET",
        headers: { Authorization: `Bearer ${token}` },
      }
    );

    if (!result.ok) {
      const errorDetails = await result.json();
      console.error(
        `Erreur API Spotify (Statut ${result.status}):`,
        errorDetails
      );
      throw new Error(
        `Erreur lors de la récupération des artistes : ${errorDetails.error.message}`
      );
    }

    return await result.json();
  } catch (error) {
    console.error("Impossible de récupérer les artistes:", error.message);
    throw error;
  }
}

async function fetchPlaylist(token) {
  console.log(token);
  try {
    const result = await fetch("https://api.spotify.com/v1/me/top/tracks ", {
      method: "GET",
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!result.ok) {
      const errorDetails = await result.json();
      console.error(
        `Erreur API Spotify (Statut ${result.status}):`,
        errorDetails
      );
      throw new Error(
        `Erreur lors de la récupération des artistes : ${errorDetails.error.message}`
      );
    }

    return await result.json();
  } catch (error) {
    console.error("Impossible de récupérer les artistes:", error.message);
    throw error;
  }
}

// recherche
async function searchArtists(token, value) {
  try {
    const result = await fetch(
      `https://api.spotify.com/v1/search?q=${value}&type=artist&limit=1&offset=1`,
      {
        method: "GET",
        headers: { Authorization: `Bearer ${token}` },
      }
    );

    if (!result.ok) {
      const errorDetails = await result.json();
      console.error(
        `Erreur API Spotify (Statut ${result.status}):`,
        errorDetails
      );
      throw new Error(
        `Erreur lors de la récupération des artistes : ${errorDetails.error.message}`
      );
    }

    return await result.json();
  } catch (error) {
    console.error("Impossible de récupérer les artistes:", error.message);
    throw error;
  }
}

async function searchPlaylist(token, value) {
  try {
    const result = await fetch(
      `https://api.spotify.com/v1/search?q=${value}&type=playlist`,
      {
        method: "GET",
        headers: { Authorization: `Bearer ${token}` },
      }
    );

    if (!result.ok) {
      const errorDetails = await result.json();
      console.error(
        `Erreur API Spotify (Statut ${result.status}):`,
        errorDetails
      );
      throw new Error(
        `Erreur lors de la récupération des artistes : ${errorDetails.error.message}`
      );
    }

    return await result.json();
  } catch (error) {
    console.error("Impossible de récupérer les artistes:", error.message);
    throw error;
  }
}

async function searchMusique(token, value) {
  try {
    const result = await fetch(
      `https://api.spotify.com/v1/search?q=${value}&type=music`,
      {
        method: "GET",
        headers: { Authorization: `Bearer ${token}` },
      }
    );

    if (!result.ok) {
      const errorDetails = await result.json();
      console.error(
        `Erreur API Spotify (Statut ${result.status}):`,
        errorDetails
      );
      throw new Error(
        `Erreur lors de la récupération des artistes : ${errorDetails.error.message}`
      );
    }

    return await result.json();
  } catch (error) {
    console.error("Impossible de récupérer les artistes:", error.message);
    throw error;
  }
}

// Affichage des éléments
function populateUI(profile) {
  if (profile?.images?.[0]) {
    const profileImage = new Image(200, 200);
    profileImage.src = profile.images[0].url;
    document.getElementById("avatar").appendChild(profileImage);
    document.getElementById("imgUrl").innerText = profile.images[0].url;
  }

  document.getElementById("id").innerText = `${profile.id}`;
  document.getElementById("email").innerText = profile.email;
  document.getElementById("uri").innerText = profile.uri;
  document
    .getElementById("uri")
    .setAttribute("href", profile.external_urls.spotify);
  document.getElementById("url").innerText = profile.href;
  document.getElementById("url").setAttribute("href", profile.href);
}

function artistsUI(artists) {
  const container = document.getElementById("container-artist");

  // container.innerHTML = "";

  artists.artists.items.forEach((artist) => {
    const artistDiv = document.createElement("div");
    artistDiv.classList.add("artist");

    const artistName = document.createElement("p");
    artistName.innerText = artist.name;
    artistDiv.appendChild(artistName);

    if (artist.images[0]) {
      const artistImage = new Image(100, 100);
      artistImage.src = artist.images[0].url;
      artistDiv.appendChild(artistImage);
    }

    container.appendChild(artistDiv);
  });
}

function playlistUI(playlists) {
  const container = document.getElementById("container-playlist");

  container.innerHTML = "";

  playlists.items.forEach((playlist) => {
    const playlistDiv = document.createElement("div");
    playlistDiv.classList.add("playlist");

    const playlistName = document.createElement("p");
    playlistName.innerText = playlist.name;
    playlistDiv.appendChild(playlistName);

    if (playlist.album.images[0]) {
      const playlistImage = new Image(100, 100);
      playlistImage.src = playlist.album.images[0].url;
      playlistDiv.appendChild(playlistImage);
    }

    container.appendChild(playlistDiv);
  });
}

async function activePlayer(value) {
  const container = document.getElementById("player");

  if (container) {
    container.innerHTML = "Nouveau contenu"; // Manipulation de l'élément
  } else {
    console.error("L'élément #player n'a pas été trouvé.");
  }

  try {
    // Appel à l'API Spotify pour rechercher un artiste
    const activePlayerInfo = await searchArtists(
      localStorage.getItem("token"),
      value
    );

    // Vérification que des artistes ont été trouvés
    if (!activePlayerInfo.artists || !activePlayerInfo.artists.items.length) {
      console.error("Aucun artiste trouvé pour :", value);
      container.innerHTML = "<p>Aucun artiste trouvé</p>";
      return;
    }

    // Récupération du premier artiste trouvé
    const artist = activePlayerInfo.artists.items[0];
    const artistId = artist.id;

    // Mise à jour de l'iframe
    const iframe = document.querySelector(".player");
    if (iframe) {
      iframe.src = `https://open.spotify.com/embed/artist/${artistId}?utm_source=generator`;
    } else {
      console.error("Iframe avec la classe 'player' introuvable");
    }
  } catch (error) {
    console.error("Erreur dans activePlayer :", error.message);
    container.innerHTML = `<p>Erreur lors de l'activation du lecteur : ${error.message}</p>`;
  }
}

// code pour le traitement de formulaire
document
  .getElementById("search-player")
  .addEventListener("button", function (event) {
    // event.preventDefault();

    const form = event.target;
    const formData = new FormData(form);

    // Récupération des données du formulaire
    const value = formData.get("search"); // donnée de la recherche
    console.log(value);

    activePlayer(value);
  });
