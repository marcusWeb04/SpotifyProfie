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
    const profile = await fetchProfile(accessToken);
    populateUI(profile);
    const artists = await fetchArtists(accessToken);
    artistsUI(artists);
    const playlists = await fetchPlaylist(accessToken);
    playlistUI(playlists);
  } else if (!code) {
    redirectToAuthCodeFlow(clientId);
  } else {
    populateUI(profile);
    const artists = await fetchArtists(localStorage.getItem("token"));
    artistsUI(artists);
  }
} else {
  if (!code) {
    redirectToAuthCodeFlow(clientId);
  } else {
    const accessToken = await getAccessToken(clientId, code);
    console.log(accessToken);
    localStorage.setItem("token", accessToken);
    const profile = await fetchProfile(accessToken);
    populateUI(profile);
    const artists = await fetchArtists(accessToken);
    artistsUI(artists);
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
  params.append("scope", "user-read-private user-read-email user-follow-read");
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
  try {
    const result = await fetch(
      "https://api.spotify.com/v1/playlists/{playlist_id}/followers",
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
  document.getElementById("displayName").innerHTML = profile.display_name;
  document.getElementById("id").innerText = `${profile.id}`;
  document.getElementById("email").innerText = profile.email;
  document.getElementById("uri").innerText = profile.uri;
  document
    .getElementById("uri")
    .setAttribute("href", profile.external_urls.spotify);
  document.getElementById("url").innerText = profile.href;
  document.getElementById("url").setAttribute("href", profile.href);
}

// Affichage des artistes
function artistsUI(artists) {
  const ojectArtists = artists.artists.items;

  const container = document.getElementById("container-artist");

  console.log(ojectArtists);

  const artistsTab = Object.keys(ojectArtists).map((key) => ojectArtists[key]);

  console.log(artistsTab);

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

// Affichage des playlistes
function playlistUI(playlists) {
  alert(playlists);
}
