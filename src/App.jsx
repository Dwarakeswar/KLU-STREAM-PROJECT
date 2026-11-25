import React, { useState, useEffect, useRef } from "react";
import {
  Routes,
  Route,
  Navigate,
  Link,
  NavLink,
  useNavigate,
  useParams,
  useLocation
} from "react-router-dom";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged
} from "firebase/auth";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  onSnapshot,
  query,
  where,
  serverTimestamp
} from "firebase/firestore";
import { auth, db } from "./firebase";
import { uploadVideoToCloudinary, validateVideoFile } from "./cloudinary";
import {
  recordVideoWatch,
  fetchUserWatchHistory,
  getPersonalizedRecommendations
} from "./recommendations";
import {
  VIDEO_CATEGORIES,
  starterVideos,
  subscriptionPlans,
  getVideoThumbnail,
  readData,
  saveData
} from "./data";
import { saveUserMoment, formatTimestampHMS } from "./momentsService";
import {
  MOODSKIP_ACTIONS,
  computeMoodTargetSec,
  formatShortClock
} from "./moodSkipConfig";
import MyMomentsPage from "./MyMomentsPage";
import BlindWatchPage from "./BlindWatchPage";

const DEMO_ADMIN_EMAIL = "admin@klstream.com";
const DEMO_ADMIN_PASSWORD = "admin123";
const DEMO_ADMIN_USER = {
  uid: "DEMO_ADMIN_KL_STREAM",
  id: "DEMO_ADMIN_KL_STREAM",
  name: "KL Stream Admin",
  email: DEMO_ADMIN_EMAIL,
  role: "admin",
  isDemoAdmin: true
};

const LOCAL_SUBMISSIONS_KEY = "kl_submissions_fallback_v1";
const LOCAL_USERS_KEY = "kl_users_fallback_v1";

function getLocalSubmissions() {
  return readData(LOCAL_SUBMISSIONS_KEY, []);
}
function saveLocalSubmissions(list) {
  saveData(LOCAL_SUBMISSIONS_KEY, list);
}
function getLocalUsers() {
  return readData(LOCAL_USERS_KEY, []);
}
function saveLocalUsers(list) {
  saveData(LOCAL_USERS_KEY, list);
}

function getDefaultCatalogVideos() {
  const existing = readData("videos", null);
  const hasBadLinks =
    Array.isArray(existing) &&
    existing.some(
      (v) =>
        v.streamUrl &&
        (v.streamUrl.includes("archive.org") || v.streamUrl.includes("googleapis.com"))
    );

  const hasRestoredCloudinary =
    Array.isArray(existing) &&
    ["cld-1", "cld-2", "cld-3"].every((cid) => existing.some((v) => v.id === cid));

  if (
    !existing ||
    !Array.isArray(existing) ||
    existing.length < starterVideos.length ||
    hasBadLinks ||
    !hasRestoredCloudinary
  ) {
    saveData("videos", starterVideos);
    return starterVideos;
  }
  return existing;
}

/* ---------------- HEADER & FOOTER ---------------- */
function Header({ user, onLogout }) {
  return (
    <header className="site-header">
      <Link className="brand brand-link" to={user?.role === "admin" ? "/admin" : "/home"}>
        <div className="brand-name">KL <span>STREAM</span></div>
        <div className="brand-subtitle">VIDEO STREAMING PLATFORM</div>
      </Link>
      {user && (
        <nav className="main-nav">
          {user.role === "admin" ? (
            <NavLink to="/admin">Admin Dashboard</NavLink>
          ) : (
            <>
              <NavLink to="/home">Home</NavLink>
              <NavLink to="/blind-watch">Blind Watch</NavLink>
              <NavLink to="/my-moments">My Moments</NavLink>
              <NavLink to="/watchlist">Watchlist</NavLink>
              <NavLink to="/subscribe" className="nav-subscribe">
                {user.subscription ? "Subscribed ★" : "Subscribe"}
              </NavLink>
              <NavLink to="/submit">Creator Studio</NavLink>
              <NavLink to="/profile">
                Profile {user.parentalLock?.enabled ? "🔒" : ""}
              </NavLink>
            </>
          )}
          <button className="nav-button" onClick={onLogout}>Logout</button>
        </nav>
      )}
    </header>
  );
}

function Footer() {
  return (
    <footer className="site-footer">
      KL STREAM · Movies, TV Shows &amp; Live Streams · Adaptive Streaming &amp; Parental Controls
    </footer>
  );
}

function Protected({ user, children, adminOnly = false }) {
  if (!user) return <Navigate to="/" replace />;
  if (adminOnly && user.role !== "admin") return <Navigate to="/home" replace />;
  if (!adminOnly && user.role === "admin") return <Navigate to="/admin" replace />;
  return children;
}

/* ---------------- VIDEO CARD ---------------- */
function VideoCard({ video, onWatch, onSave, saved, isLocked }) {
  const thumb = getVideoThumbnail(video);

  return (
    <article className="video-card">
      <div className="thumb-wrap">
        <img
          src={thumb}
          alt={video.title}
          onError={(e) => {
            e.currentTarget.src = "https://placehold.co/640x360/0D111B/F5F5F5?text=KL+STREAM";
          }}
        />
        <span className="platform-tag">{video.platform || "YouTube"}</span>
        {isLocked && <span className="lock-tag">🔒 PIN Locked</span>}
      </div>
      <div className="video-content">
        <span className="badge">{video.category}</span>
        <h3>{video.title}</h3>
        <p>{video.description}</p>
        {video.creatorName && (
          <p className="creator-credit small">Uploaded by {video.creatorName}</p>
        )}
        <div className="video-actions">
          <button className="btn primary" onClick={() => onWatch(video)}>
            {isLocked ? "🔒 Unlock & Watch" : "▶ Watch Now"}
          </button>
          <button className="btn secondary" onClick={() => onSave(video.id)}>
            {saved ? "✓ Saved" : "+ Watchlist"}
          </button>
        </div>
      </div>
    </article>
  );
}

/* ---------------- AUTH PAGE (DEMO ADMIN + FIREBASE AUTH) ---------------- */
function AuthPage({ onLogin }) {
  const [mode, setMode] = useState("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  async function ensureUserProfileDoc(firebaseUser, displayName) {
    const profileDefaults = {
      uid: firebaseUser.uid,
      name: displayName || firebaseUser.displayName || firebaseUser.email.split("@")[0],
      email: firebaseUser.email.toLowerCase(),
      role: "user",
      watchlist: [],
      subscription: null,
      parentalLock: { enabled: false, pin: "" }
    };

    try {
      const userRef = doc(db, "users", firebaseUser.uid);
      const snap = await getDoc(userRef);
      if (snap.exists()) {
        const data = snap.data();
        return {
          ...profileDefaults,
          ...data,
          role: data.role === "admin" ? "admin" : "user",
          uid: firebaseUser.uid
        };
      }
      await setDoc(userRef, {
        uid: firebaseUser.uid,
        name: profileDefaults.name,
        email: profileDefaults.email,
        role: "user",
        watchlist: [],
        subscription: null,
        parentalLock: { enabled: false, pin: "" },
        createdAt: serverTimestamp()
      });
      return profileDefaults;
    } catch {
      const localList = getLocalUsers();
      const found = localList.find(
        (u) => u.uid === firebaseUser.uid || u.email === profileDefaults.email
      );
      if (found) return { ...profileDefaults, ...found };
      saveLocalUsers([...localList, profileDefaults]);
      return profileDefaults;
    }
  }

  async function submit(event) {
    event.preventDefault();
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !password || (mode === "signup" && !name.trim())) {
      setMessage("Please fill in all required fields.");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      setMessage("Please enter a valid email address.");
      return;
    }
    if (password.length < 6) {
      setMessage("Password must contain at least 6 characters.");
      return;
    }

    if (cleanEmail === DEMO_ADMIN_EMAIL) {
      if (mode === "login" && password === DEMO_ADMIN_PASSWORD) {
        saveData("currentUser", DEMO_ADMIN_USER);
        onLogin(DEMO_ADMIN_USER);
        navigate("/admin");
        return;
      }
      setMessage("Invalid demo admin credentials. Use admin@klstream.com / admin123.");
      return;
    }

    setLoading(true);
    setMessage("");

    try {
      if (mode === "signup") {
        const cred = await createUserWithEmailAndPassword(auth, cleanEmail, password);
        const profile = await ensureUserProfileDoc(cred.user, name.trim());
        onLogin(profile);
        navigate(profile.role === "admin" ? "/admin" : "/home");
      } else {
        const cred = await signInWithEmailAndPassword(auth, cleanEmail, password);
        const profile = await ensureUserProfileDoc(cred.user, "");
        onLogin(profile);
        navigate(profile.role === "admin" ? "/admin" : "/home");
      }
    } catch (err) {
      const code = err?.code || "";
      if (code === "auth/email-already-in-use") {
        setMessage("This email is already registered. Please sign in.");
      } else if (
        code === "auth/invalid-credential" ||
        code === "auth/wrong-password" ||
        code === "auth/user-not-found"
      ) {
        setMessage("Incorrect email or password.");
      } else {
        setMessage(err?.message || "Authentication failed.");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-body">
      <Header user={null} />
      <main className="auth-main">
        <form className="auth-box" onSubmit={submit}>
          <div className="auth-logo">KL<span>STREAM</span></div>
          <p className="eyebrow">{mode === "login" ? "WELCOME BACK" : "GET STARTED"}</p>
          <h1>{mode === "login" ? "Sign in to continue" : "Create your account"}</h1>
          <p className="muted">Watch Movies, TV Shows &amp; Live Streams on KL Stream.</p>
          {mode === "signup" && (
            <>
              <label>Full name</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your full name"
              />
            </>
          )}
          <label>Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
          />
          <label>Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="At least 6 characters"
          />
          <button className="btn primary full auth-submit" disabled={loading}>
            {loading ? "Please wait..." : mode === "login" ? "Login" : "Create Account"}
          </button>
          <p className="message">{message}</p>
          <p className="auth-switch">
            {mode === "login" ? "New to KL Stream?" : "Already have an account?"}
            <button
              type="button"
              className="inline-link"
              onClick={() => {
                setMode(mode === "login" ? "signup" : "login");
                setMessage("");
              }}
            >
              {mode === "login" ? " Create an account" : " Login"}
            </button>
          </p>
          <p className="small muted">Demo Admin: admin@klstream.com / admin123</p>
        </form>
      </main>
      <Footer />
    </div>
  );
}

/* ---------------- CATALOG HELPER (DEFAULT YOUTUBE + APPROVED SUBMISSIONS) ---------------- */
async function loadCatalogVideos() {
  const baseVideos = getDefaultCatalogVideos().map((v) => ({
    ...v,
    category: VIDEO_CATEGORIES.includes(v.category) ? v.category : "Movies",
    status: "approved"
  }));

  let submissions = getLocalSubmissions().filter((item) => item.status === "approved");
  try {
    const q = query(collection(db, "videoSubmissions"), where("status", "==", "approved"));
    const snap = await getDocs(q);
    const firestoreApproved = [];
    snap.forEach((d) => {
      firestoreApproved.push({ id: d.id, ...d.data() });
    });
    submissions = firestoreApproved;
  } catch {
    // Fallback to local approved submissions if offline
  }

  const uniqueMap = new Map();
  submissions
    .filter((item) => item.status === "approved")
    .forEach((item) => {
      uniqueMap.set(String(item.id), {
        id: item.id,
        title: item.title,
        category: VIDEO_CATEGORIES.includes(item.category) ? item.category : "Movies",
        sourceType: item.isHls ? "hls" : "mp4",
        platform: "Creator Upload (Cloudinary)",
        streamUrl: item.hlsUrl || item.videoUrl,
        fallbackUrl: item.videoUrl,
        videoUrl: item.videoUrl,
        publicId: item.publicId,
        thumbnail: item.thumbnailUrl || "",
        creatorName: item.creatorName || "Creator",
        creatorId: item.creatorId,
        status: "approved",
        qualities: ["Auto", "1080p", "720p", "480p", "360p"],
        description: item.description || "Uploaded by a KL Stream creator."
      });
    });

  return [...Array.from(uniqueMap.values()), ...baseVideos];
}

/* ---------------- HOME PAGE ---------------- */
function Home({ user, updateUser }) {
  const [videos, setVideos] = useState(() => getDefaultCatalogVideos());
  const [watchHistory, setWatchHistory] = useState([]);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");
  const navigate = useNavigate();

  const filterOptions = ["All", ...VIDEO_CATEGORIES];
  const isLocked = Boolean(user.parentalLock?.enabled);

  useEffect(() => {
    let active = true;
    loadCatalogVideos().then((list) => {
      if (active) setVideos(list);
    });
    fetchUserWatchHistory(user.uid).then((hist) => {
      if (active) setWatchHistory(hist);
    });
    return () => {
      active = false;
    };
  }, [user.uid]);

  const recommendations = getPersonalizedRecommendations(videos, watchHistory, 6);

  const filtered = videos.filter((v) => {
    const matchesCategory = category === "All" || v.category === category;
    const q = search.trim().toLowerCase();
    const matchesSearch =
      !q ||
      (v.title || "").toLowerCase().includes(q) ||
      (v.description || "").toLowerCase().includes(q) ||
      (v.creatorName || "").toLowerCase().includes(q);
    return matchesCategory && matchesSearch;
  });

  function toggleSave(videoId) {
    const list = user.watchlist || [];
    const next = list.includes(videoId) ? list.filter((x) => x !== videoId) : [...list, videoId];
    updateUser({ ...user, watchlist: next });
  }

  function handleWatch(video) {
    navigate(`/watch/${encodeURIComponent(String(video.id))}`, { state: { video } });
  }

  return (
    <main className="page">
      <section className="hero-banner">
        <div>
          <p className="eyebrow light">KL STREAM CATALOG</p>
          <h1>Movies, TV Shows &amp; Live Streams.</h1>
          <p>
            Browse curated YouTube movies, shows, and live broadcasts with adaptive quality controls, PIN parental lock, watchlists, and category recommendations.
          </p>
          <div className="hero-actions">
            <a className="btn light-btn" href="#catalog">Browse Catalog</a>
            <Link className="btn outline-light" to="/blind-watch">Blind Watch</Link>
            <Link className="btn outline-light" to="/my-moments">My Moments</Link>
            <Link className="btn outline-light" to="/subscribe">
              {user.subscription ? `Plan: ${user.subscription.planName}` : "Subscription Plans"}
            </Link>
            <Link className="btn outline-light" to="/submit">Upload Video</Link>
          </div>
        </div>
        <div className="hero-stat">
          <strong>{videos.length}</strong>
          <span>Available Videos</span>
        </div>
      </section>

      {isLocked && (
        <div className="lock-banner">
          <span>🔒 <strong>Parental Lock is ON.</strong> Your PIN is required before watching any video.</span>
          <Link to="/profile" className="btn secondary">Manage PIN</Link>
        </div>
      )}

      <section className="recommend-section">
        <div className="section-head compact">
          <div>
            <p className="eyebrow">PERSONALIZED FOR YOU</p>
            <h2>Recommended for You</h2>
            <p className="muted small">
              {recommendations.isNewUser
                ? "Popular and featured titles to get you started."
                : `Tailored from your watch history in ${recommendations.topCategories.slice(0, 2).join(" & ")}.`}
            </p>
          </div>
        </div>
        <div className="video-grid">
          {recommendations.items.map((v) => (
            <VideoCard
              key={`rec-${v.id}`}
              video={v}
              saved={(user.watchlist || []).includes(v.id)}
              isLocked={isLocked}
              onWatch={handleWatch}
              onSave={toggleSave}
            />
          ))}
        </div>
      </section>

      <div className="section-head">
        <div>
          <p className="eyebrow">EXPLORE</p>
          <h2 id="catalog">
            {category === "All" ? "All Videos" : category} ({filtered.length})
          </h2>
        </div>
        <div className="top-bar">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by title, description, or creator..."
          />
          <select value={category} onChange={(e) => setCategory(e.target.value)}>
            {filterOptions.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="category-pills">
        {filterOptions.map((c) => (
          <button
            key={c}
            type="button"
            className={`pill ${category === c ? "active" : ""}`}
            onClick={() => setCategory(c)}
          >
            {c}
          </button>
        ))}
      </div>

      {filtered.length > 0 ? (
        <div className="video-grid">
          {filtered.map((v) => (
            <VideoCard
              key={v.id}
              video={v}
              saved={(user.watchlist || []).includes(v.id)}
              isLocked={isLocked}
              onWatch={handleWatch}
              onSave={toggleSave}
            />
          ))}
        </div>
      ) : (
        <div className="empty-state">
          {search.trim()
            ? "No videos match your search."
            : "No videos available in this category yet."}
        </div>
      )}
    </main>
  );
}

/* ---------------- WATCH PAGE + SAVE MOMENT + MOODSKIP ---------------- */
function Watch({ user, updateUser }) {
  const { id } = useParams();
  const location = useLocation();
  const decodedId = decodeURIComponent(id || "");
  const initialSeekSec = Math.max(0, Math.floor(Number(location.state?.startAtSec) || 0));

  const [catalog, setCatalog] = useState(() => getDefaultCatalogVideos());
  const [playerError, setPlayerError] = useState(false);

  useEffect(() => {
    let active = true;
    loadCatalogVideos().then((list) => {
      if (active) setCatalog(list);
    });
    return () => {
      active = false;
    };
  }, []);

  const video = catalog.find((v) => String(v.id) === decodedId);

  const isParentalLocked = Boolean(user.parentalLock?.enabled);
  const [pinVerified, setPinVerified] = useState(!isParentalLocked);
  const [pinInput, setPinInput] = useState("");
  const [pinError, setPinError] = useState("");

  const availableQualities = video?.qualities || ["Auto", "1080p", "720p", "480p", "360p"];
  const [selectedQuality, setSelectedQuality] = useState("Auto");
  const [networkCondition, setNetworkCondition] = useState("Fast (5G / Fiber)");
  const [activeBitrateInfo, setActiveBitrateInfo] = useState("Auto → 1080p Full HD · 5.2 Mbps");
  const [hlsLevels, setHlsLevels] = useState([]);

  const [momentModalOpen, setMomentModalOpen] = useState(false);
  const [capturedSec, setCapturedSec] = useState(0);
  const [momentTitleInput, setMomentTitleInput] = useState("");
  const [savingMoment, setSavingMoment] = useState(false);
  const [momentFeedback, setMomentFeedback] = useState("");
  const [momentError, setMomentError] = useState("");

  const [activeMoodId, setActiveMoodId] = useState("");
  const [moodStatusText, setMoodStatusText] = useState("Your mood controls your viewing.");

  const videoRef = useRef(null);
  const hlsInstanceRef = useRef(null);
  const ytPlayerRef = useRef(null);
  const ytContainerIdRef = useRef(`yt-player-${Math.random().toString(36).slice(2, 9)}`);
  const recordedKeyRef = useRef("");
  const appliedSeekRef = useRef(false);

  useEffect(() => {
    setPinVerified(!Boolean(user.parentalLock?.enabled));
    setPinInput("");
    setPinError("");
    setSelectedQuality("Auto");
    setPlayerError(false);
    setMomentModalOpen(false);
    setMomentFeedback("");
    setMomentError("");
    setActiveMoodId("");
    setMoodStatusText("Your mood controls your viewing.");
    appliedSeekRef.current = false;
  }, [decodedId, user.parentalLock?.enabled, initialSeekSec]);

  useEffect(() => {
    if (!video || !pinVerified || !user?.uid) return;
    const visitKey = `${user.uid}:${video.id}:${pinVerified}`;
    if (recordedKeyRef.current === visitKey) return;
    recordedKeyRef.current = visitKey;
    recordVideoWatch(user.uid, video);
  }, [video, pinVerified, user?.uid]);

  useEffect(() => {
    if (selectedQuality !== "Auto") {
      const bitrateMap = {
        "1080p": "1080p Full HD · 5.2 Mbps (Manual)",
        "720p": "720p HD · 2.8 Mbps (Manual)",
        "480p": "480p SD · 1.2 Mbps (Manual)",
        "360p": "360p Data Saver · 650 Kbps (Manual)"
      };
      setActiveBitrateInfo(bitrateMap[selectedQuality] || `${selectedQuality} (Manual)`);
      return;
    }

    if (networkCondition.startsWith("Fast")) {
      setActiveBitrateInfo("Auto → 1080p Full HD · 5.2 Mbps");
    } else if (networkCondition.startsWith("Moderate")) {
      setActiveBitrateInfo("Auto → 720p HD · 2.5 Mbps");
    } else {
      setActiveBitrateInfo("Auto → 360p Data Saver · 600 Kbps");
    }
  }, [selectedQuality, networkCondition]);

  useEffect(() => {
    if (!video || !pinVerified || video.sourceType !== "youtube" || !video.videoId) {
      return;
    }

    let cancelled = false;

    function createYtPlayer() {
      if (cancelled || !window.YT || !window.YT.Player) return;
      const containerEl = document.getElementById(ytContainerIdRef.current);
      if (!containerEl) return;

      if (ytPlayerRef.current && typeof ytPlayerRef.current.destroy === "function") {
        ytPlayerRef.current.destroy();
        ytPlayerRef.current = null;
      }

      ytPlayerRef.current = new window.YT.Player(ytContainerIdRef.current, {
        videoId: video.videoId,
        playerVars: {
          rel: 0,
          start: initialSeekSec > 0 ? initialSeekSec : undefined,
          autoplay: initialSeekSec > 0 ? 1 : 0
        },
        events: {
          onReady: (event) => {
            if (cancelled) return;
            if (initialSeekSec > 0 && !appliedSeekRef.current) {
              appliedSeekRef.current = true;
              event.target.seekTo(initialSeekSec, true);
              event.target.playVideo();
            }
          },
          onError: () => {
            if (!cancelled) setPlayerError(true);
          }
        }
      });
    }

    if (window.YT && window.YT.Player) {
      createYtPlayer();
    } else {
      const existingScript = document.querySelector(
        'script[src="https://www.youtube.com/iframe_api"]'
      );
      if (!existingScript) {
        const tag = document.createElement("script");
        tag.src = "https://www.youtube.com/iframe_api";
        document.body.appendChild(tag);
      }

      const prevReady = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = () => {
        if (typeof prevReady === "function") prevReady();
        createYtPlayer();
      };
    }

    return () => {
      cancelled = true;
      if (ytPlayerRef.current && typeof ytPlayerRef.current.destroy === "function") {
        ytPlayerRef.current.destroy();
        ytPlayerRef.current = null;
      }
    };
  }, [video, pinVerified, initialSeekSec]);

  useEffect(() => {
    if (!video || !pinVerified || video.sourceType === "youtube") return;
    const videoEl = videoRef.current;
    if (!videoEl) return;

    function seekHtmlVideoIfNeeded() {
      if (initialSeekSec > 0 && !appliedSeekRef.current) {
        try {
          videoEl.currentTime = initialSeekSec;
          appliedSeekRef.current = true;
          const playPromise = videoEl.play();
          if (playPromise && typeof playPromise.catch === "function") {
            playPromise.catch(() => {});
          }
        } catch {
          // Wait for metadata if not ready yet
        }
      }
    }

    if (hlsInstanceRef.current) {
      hlsInstanceRef.current.destroy();
      hlsInstanceRef.current = null;
    }

    const srcUrl = video.streamUrl || video.videoUrl;
    const mp4Fallback =
      video.fallbackUrl || (srcUrl && srcUrl !== video.videoUrl ? video.videoUrl : "");

    if (video.sourceType === "hls" && window.Hls && window.Hls.isSupported() && srcUrl) {
      const hls = new window.Hls();
      hlsInstanceRef.current = hls;
      hls.loadSource(srcUrl);
      hls.attachMedia(videoEl);
      hls.on(window.Hls.Events.MANIFEST_PARSED, (_, data) => {
        if (data?.levels?.length) setHlsLevels(data.levels);
        seekHtmlVideoIfNeeded();
      });
      hls.on(window.Hls.Events.ERROR, (_, data) => {
        if (data?.fatal) {
          hls.destroy();
          hlsInstanceRef.current = null;
          if (mp4Fallback) {
            videoEl.src = mp4Fallback;
          } else {
            setPlayerError(true);
          }
        }
      });
    } else if (srcUrl || mp4Fallback) {
      videoEl.src = srcUrl || mp4Fallback;
    }

    videoEl.addEventListener("loadedmetadata", seekHtmlVideoIfNeeded);
    return () => {
      videoEl.removeEventListener("loadedmetadata", seekHtmlVideoIfNeeded);
      if (hlsInstanceRef.current) {
        hlsInstanceRef.current.destroy();
        hlsInstanceRef.current = null;
      }
    };
  }, [video, pinVerified, initialSeekSec]);

  useEffect(() => {
    const hls = hlsInstanceRef.current;
    if (!hls || hlsLevels.length === 0) return;

    if (selectedQuality === "Auto") {
      if (networkCondition.startsWith("Slow")) {
        hls.currentLevel = 0;
      } else if (networkCondition.startsWith("Moderate")) {
        hls.currentLevel = Math.floor(hlsLevels.length / 2);
      } else {
        hls.currentLevel = -1;
      }
    } else {
      const targetHeight = parseInt(selectedQuality, 10);
      let bestIdx = 0;
      let minDiff = Infinity;
      hlsLevels.forEach((lvl, idx) => {
        const diff = Math.abs((lvl.height || 0) - targetHeight);
        if (diff < minDiff) {
          minDiff = diff;
          bestIdx = idx;
        }
      });
      hls.currentLevel = bestIdx;
    }
  }, [selectedQuality, networkCondition, hlsLevels]);

  function getCurrentPlaybackSeconds() {
    if (video?.sourceType === "youtube") {
      if (ytPlayerRef.current && typeof ytPlayerRef.current.getCurrentTime === "function") {
        return Math.max(0, Math.floor(Number(ytPlayerRef.current.getCurrentTime()) || 0));
      }
      return initialSeekSec;
    }

    if (videoRef.current && typeof videoRef.current.currentTime === "number") {
      return Math.max(0, Math.floor(videoRef.current.currentTime || 0));
    }
    return initialSeekSec;
  }

  function getPlaybackDurationSeconds() {
    if (video?.sourceType === "youtube") {
      if (ytPlayerRef.current && typeof ytPlayerRef.current.getDuration === "function") {
        return Math.max(0, Number(ytPlayerRef.current.getDuration()) || 0);
      }
      return 0;
    }

    if (videoRef.current && typeof videoRef.current.duration === "number") {
      return Number.isFinite(videoRef.current.duration) ? videoRef.current.duration : 0;
    }
    return 0;
  }

  function seekToPlaybackSeconds(targetSec) {
    const safeTarget = Math.max(0, Math.floor(Number(targetSec) || 0));

    if (video?.sourceType === "youtube") {
      if (ytPlayerRef.current && typeof ytPlayerRef.current.seekTo === "function") {
        ytPlayerRef.current.seekTo(safeTarget, true);
        if (typeof ytPlayerRef.current.playVideo === "function") {
          ytPlayerRef.current.playVideo();
        }
      }
      return;
    }

    if (videoRef.current) {
      videoRef.current.currentTime = safeTarget;
      const playPromise = videoRef.current.play?.();
      if (playPromise && typeof playPromise.catch === "function") {
        playPromise.catch(() => {});
      }
    }
  }

  function handleMoodSkip(moodAction) {
    const currentSec = getCurrentPlaybackSeconds();
    const durationSec = getPlaybackDurationSeconds();
    const targetSec = computeMoodTargetSec(currentSec, moodAction.deltaSec, durationSec);

    seekToPlaybackSeconds(targetSec);
    setActiveMoodId(moodAction.id);
    setMoodStatusText(
      `${moodAction.emoji} ${moodAction.label} → Jumped from ${formatShortClock(currentSec)} to ${formatShortClock(targetSec)}`
    );
  }

  function handleOpenSaveMoment() {
    setMomentFeedback("");
    setMomentError("");
    const currentSec = getCurrentPlaybackSeconds();
    setCapturedSec(currentSec);
    setMomentTitleInput("");
    setMomentModalOpen(true);
  }

  async function handleSaveMomentSubmit(e) {
    e.preventDefault();
    if (savingMoment) return;

    const cleanTitle = momentTitleInput.trim();
    if (!cleanTitle) {
      setMomentError("Please enter a title for this moment.");
      return;
    }

    setSavingMoment(true);
    setMomentError("");

    try {
      await saveUserMoment({
        userId: user.uid,
        video,
        videoThumbnail: getVideoThumbnail(video),
        momentTitle: cleanTitle,
        timestampSec: capturedSec
      });

      setMomentModalOpen(false);
      setMomentTitleInput("");
      setMomentFeedback(
        `Saved "${cleanTitle}" at ${formatTimestampHMS(capturedSec)} to My Moments.`
      );
    } catch (err) {
      setMomentError(err?.message || "Failed to save moment.");
    } finally {
      setSavingMoment(false);
    }
  }

  if (!video) {
    return (
      <main className="page">
        <div className="empty-state">
          Video not found. <Link to="/home" className="inline-link">Return home</Link>
        </div>
      </main>
    );
  }

  function verifyPin(e) {
    e.preventDefault();
    if (pinInput.trim() === user.parentalLock?.pin) {
      setPinVerified(true);
      setPinError("");
    } else {
      setPinError("Incorrect PIN. Please try again.");
    }
  }

  const saved = (user.watchlist || []).includes(video.id);
  const directSrc = video.streamUrl || video.videoUrl || video.fallbackUrl || "";
  const hasValidEmbed =
    video.sourceType === "youtube"
      ? Boolean(video.videoId)
      : Boolean(directSrc || video.fallbackUrl);

  return (
    <main className="page">
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "12px",
          marginBottom: "14px"
        }}
      >
        <Link className="back-button inline-back" to="/home">← Back to home</Link>
        {pinVerified && (
          <button
            type="button"
            className="btn primary"
            onClick={handleOpenSaveMoment}
            disabled={savingMoment}
          >
            ★ Save Moment
          </button>
        )}
      </div>

      {momentFeedback && (
        <div className="success-banner" style={{ marginBottom: "16px" }}>
          <div>
            <strong>✓ {momentFeedback}</strong>
          </div>
          <Link to="/my-moments" className="btn secondary">
            Open My Moments
          </Link>
        </div>
      )}

      {momentModalOpen && (
        <div
          className="form-card"
          style={{
            marginBottom: "18px",
            border: "1px solid rgba(34, 197, 94, 0.45)"
          }}
        >
          <div className="section-head compact">
            <div>
              <p className="eyebrow">SAVE FAVOURITE MOMENT</p>
              <h2>Captured Timestamp: {formatTimestampHMS(capturedSec)}</h2>
            </div>
            <button
              type="button"
              className="btn secondary"
              onClick={() => setMomentModalOpen(false)}
              disabled={savingMoment}
            >
              ✕
            </button>
          </div>

          <form onSubmit={handleSaveMomentSubmit}>
            <label>Moment Title</label>
            <input
              value={momentTitleInput}
              onChange={(e) => setMomentTitleInput(e.target.value)}
              placeholder='e.g. "The unexpected twist" or "My favourite scene"'
              autoFocus
              disabled={savingMoment}
            />

            {momentError && <p className="message">{momentError}</p>}

            <div className="video-actions" style={{ marginTop: "14px", maxWidth: "360px" }}>
              <button
                type="submit"
                className="btn primary"
                disabled={savingMoment || !momentTitleInput.trim()}
              >
                {savingMoment ? "Saving..." : "Save"}
              </button>
              <button
                type="button"
                className="btn secondary"
                onClick={() => setMomentModalOpen(false)}
                disabled={savingMoment}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {!pinVerified ? (
        <div className="pin-gate-card">
          <div className="pin-icon">🔒</div>
          <span className="badge">PARENTAL LOCK ACTIVE</span>
          <h2>Enter PIN to Watch "{video.title}"</h2>
          <p className="muted">Enter your Parental Lock PIN to unlock video playback.</p>
          <form className="pin-form" onSubmit={verifyPin}>
            <input
              type="password"
              maxLength={6}
              value={pinInput}
              onChange={(e) => setPinInput(e.target.value)}
              placeholder="Enter PIN"
              autoFocus
            />
            <button className="btn primary" type="submit">Unlock</button>
          </form>
          {pinError && <p className="message">{pinError}</p>}
          <p className="small muted">
            Manage lock settings in <Link to="/profile" className="inline-link">Profile</Link>.
          </p>
        </div>
      ) : (
        <div className="watch-layout">
          <div>
            <div className="player-box">
              {!hasValidEmbed || playerError ? (
                <div className="player-fallback">
                  <h3>Unable to play this video right now</h3>
                  <p className="muted">
                    This stream or embed may be restricted or unavailable in your browser.
                  </p>
                  {video.videoId && (
                    <a
                      href={`https://www.youtube.com/watch?v=${video.videoId}`}
                      target="_blank"
                      rel="noreferrer"
                      className="btn primary"
                    >
                      Watch on YouTube
                    </a>
                  )}
                </div>
              ) : video.sourceType === "youtube" ? (
                <div id={ytContainerIdRef.current} style={{ width: "100%", height: "100%" }} />
              ) : video.sourceType === "hls" ? (
                <video
                  ref={videoRef}
                  controls
                  autoPlay
                  playsInline
                  poster={getVideoThumbnail(video)}
                  onError={() => {
                    const fallback =
                      video.fallbackUrl ||
                      (video.streamUrl !== video.videoUrl ? video.videoUrl : "");
                    if (fallback && videoRef.current && videoRef.current.src !== fallback) {
                      videoRef.current.src = fallback;
                    } else {
                      setPlayerError(true);
                    }
                  }}
                />
              ) : (
                <video
                  ref={videoRef}
                  src={directSrc}
                  controls
                  autoPlay
                  playsInline
                  poster={getVideoThumbnail(video)}
                  onError={() => setPlayerError(true)}
                />
              )}
            </div>

            {/* MOODSKIP BAR */}
            <div className="adaptive-bar">
              <div className="adaptive-header">
                <div>
                  <span className="eyebrow">MOODSKIP · CHOOSE HOW YOU FEEL</span>
                  <h3>Your mood controls your viewing.</h3>
                </div>
                <span className="stream-pill">● {moodStatusText}</span>
              </div>

              <div className="quality-buttons" style={{ marginTop: "12px", flexWrap: "wrap" }}>
                {MOODSKIP_ACTIONS.map((item) => {
                  const isSelectedMood = activeMoodId === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      className={`q-btn ${isSelectedMood ? "active" : ""}`}
                      onClick={() => handleMoodSkip(item)}
                      title={item.label}
                    >
                      {item.emoji} {item.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="adaptive-bar">
              <div className="adaptive-header">
                <div>
                  <span className="eyebrow">ADAPTIVE STREAMING</span>
                  <h3>Quality &amp; Network Condition</h3>
                </div>
                <span className="stream-pill">● {activeBitrateInfo}</span>
              </div>

              <div className="adaptive-controls">
                <div>
                  <label>Resolution</label>
                  <div className="quality-buttons">
                    {availableQualities.map((q) => (
                      <button
                        key={q}
                        type="button"
                        className={`q-btn ${selectedQuality === q ? "active" : ""}`}
                        onClick={() => setSelectedQuality(q)}
                      >
                        {q}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label>Network Condition</label>
                  <select
                    value={networkCondition}
                    onChange={(e) => {
                      setNetworkCondition(e.target.value);
                      setSelectedQuality("Auto");
                    }}
                  >
                    <option value="Fast (5G / Fiber)">Fast (5G / Fiber)</option>
                    <option value="Moderate (4G / Wi-Fi)">Moderate (4G / Wi-Fi)</option>
                    <option value="Slow (3G / Low Bandwidth)">Slow (3G / Low Bandwidth)</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          <aside className="watch-info">
            <div className="meta-row">
              <span className="badge">{video.category}</span>
              <span className="source-chip">{video.platform || "YouTube"}</span>
            </div>
            <h1>{video.title}</h1>
            <p className="muted">{video.description}</p>
            {video.creatorName && (
              <p className="small muted">Creator: <strong>{video.creatorName}</strong></p>
            )}
            <div className="stream-details-box">
              <div><strong>Category:</strong> {video.category}</div>
              <div><strong>Source:</strong> {video.platform || "YouTube"}</div>
              <div><strong>Quality Mode:</strong> {selectedQuality}</div>
            </div>
            <div className="watch-actions">
              <button
                type="button"
                className="btn primary"
                onClick={handleOpenSaveMoment}
                disabled={savingMoment}
              >
                ★ Save Moment
              </button>
              <button
                className="btn secondary"
                onClick={() =>
                  updateUser({
                    ...user,
                    watchlist: saved
                      ? user.watchlist.filter((x) => x !== video.id)
                      : [...(user.watchlist || []), video.id]
                  })
                }
              >
                {saved ? "✓ Remove from Watchlist" : "+ Add to Watchlist"}
              </button>
              <Link className="btn secondary" to="/my-moments">My Moments</Link>
            </div>
          </aside>
        </div>
      )}
    </main>
  );
}

/* ---------------- SUBSCRIPTION PAGE ---------------- */
function Subscribe({ user, updateUser }) {
  const [confirmMsg, setConfirmMsg] = useState("");
  const currentPlanId = user.subscription?.planId || null;

  function handleSubscribe(plan) {
    const startDate = new Date();
    const months = plan.id === "monthly" ? 1 : plan.id === "six-months" ? 6 : 12;
    const validUntil = new Date(startDate);
    validUntil.setMonth(validUntil.getMonth() + months);

    const subDetails = {
      planId: plan.id,
      planName: plan.name,
      duration: plan.duration,
      price: plan.price,
      status: "Active",
      subscribedOn: startDate.toLocaleDateString(),
      validUntil: validUntil.toLocaleDateString()
    };

    updateUser({ ...user, subscription: subDetails });
    setConfirmMsg(`Subscribed! ${plan.name} (${plan.price}) is now active.`);
  }

  return (
    <main className="page">
      <div className="page-title">
        <p className="eyebrow">SUBSCRIPTION</p>
        <h1>Choose a Subscription Plan</h1>
        <p className="muted">Select a plan below. Your subscription details appear in your Profile.</p>
      </div>

      {confirmMsg && (
        <div className="success-banner">
          <div>
            <strong>✓ {confirmMsg}</strong>
            <p className="small muted">View your plan details in Profile.</p>
          </div>
          <Link to="/profile" className="btn primary">Go to Profile</Link>
        </div>
      )}

      <div className="plans-grid">
        {subscriptionPlans.map((plan) => {
          const isCurrent = currentPlanId === plan.id;
          return (
            <div
              key={plan.id}
              className={`plan-card ${plan.popular ? "popular" : ""} ${isCurrent ? "current" : ""}`}
            >
              <div className="plan-top">
                <span className="badge">{isCurrent ? "Subscribed" : plan.badge}</span>
                <h2>{plan.name}</h2>
                <div className="plan-price">
                  <strong>{plan.price}</strong>
                  <span>/ {plan.duration}</span>
                </div>
                <p className="muted small">{plan.perMonth}</p>
              </div>
              <ul className="plan-features">
                {plan.features.map((f, i) => (
                  <li key={i}>• {f}</li>
                ))}
              </ul>
              <button
                className={`btn full ${isCurrent ? "secondary" : "primary"}`}
                onClick={() => handleSubscribe(plan)}
              >
                {isCurrent ? "Subscribed" : "Subscribe"}
              </button>
            </div>
          );
        })}
      </div>
    </main>
  );
}

/* ---------------- WATCHLIST PAGE ---------------- */
function Watchlist({ user, updateUser }) {
  const [catalog, setCatalog] = useState(() => getDefaultCatalogVideos());
  const navigate = useNavigate();
  const isLocked = Boolean(user.parentalLock?.enabled);

  useEffect(() => {
    let active = true;
    loadCatalogVideos().then((list) => {
      if (active) setCatalog(list);
    });
    return () => {
      active = false;
    };
  }, []);

  const videos = catalog.filter((v) => (user.watchlist || []).includes(v.id));

  function remove(id) {
    updateUser({ ...user, watchlist: user.watchlist.filter((x) => x !== id) });
  }

  return (
    <main className="page">
      <div className="page-title">
        <p className="eyebrow">YOUR LIBRARY</p>
        <h1>My Watchlist</h1>
        <p className="muted">Titles saved for later.</p>
      </div>
      {videos.length ? (
        <div className="video-grid">
          {videos.map((v) => (
            <VideoCard
              key={v.id}
              video={v}
              saved
              isLocked={isLocked}
              onWatch={(vid) => navigate(`/watch/${encodeURIComponent(String(vid.id))}`)}
              onSave={remove}
            />
          ))}
        </div>
      ) : (
        <div className="empty-state">
          Your watchlist is empty. <Link to="/home" className="inline-link">Explore videos</Link>.
        </div>
      )}
    </main>
  );
}

/* ---------------- PROFILE PAGE ---------------- */
function Profile({ user, updateUser }) {
  const [name, setName] = useState(user.name || "");
  const [message, setMessage] = useState("");
  const [historyCount, setHistoryCount] = useState(0);

  const lockEnabled = Boolean(user.parentalLock?.enabled);
  const [pinInput, setPinInput] = useState("");
  const [lockMessage, setLockMessage] = useState("");

  useEffect(() => {
    let active = true;
    fetchUserWatchHistory(user.uid).then((items) => {
      if (active) setHistoryCount(items.length);
    });
    return () => {
      active = false;
    };
  }, [user.uid]);

  function saveProfile(e) {
    e.preventDefault();
    updateUser({ ...user, name: name.trim() || user.name });
    setMessage("Profile updated.");
  }

  function handleParentalLock(e) {
    e.preventDefault();
    const cleanPin = pinInput.trim();
    if (!/^\d{4,6}$/.test(cleanPin)) {
      setLockMessage("Enter a 4 to 6 digit numeric PIN.");
      return;
    }

    if (!lockEnabled) {
      updateUser({ ...user, parentalLock: { enabled: true, pin: cleanPin } });
      setPinInput("");
      setLockMessage("Parental Lock is now ON. PIN is required to watch any video.");
    } else {
      if (cleanPin !== user.parentalLock?.pin) {
        setLockMessage("Incorrect PIN. Parental Lock remains ON.");
        return;
      }
      updateUser({ ...user, parentalLock: { enabled: false, pin: "" } });
      setPinInput("");
      setLockMessage("Parental Lock is now OFF.");
    }
  }

  return (
    <main className="page narrow">
      <div className="page-title">
        <p className="eyebrow">ACCOUNT</p>
        <h1>My Profile</h1>
        <p className="muted">Manage profile details, subscription status, and Parental Lock.</p>
      </div>

      <form className="form-card" onSubmit={saveProfile}>
        <h2>Account Details</h2>
        <label>Full name</label>
        <input value={name} onChange={(e) => setName(e.target.value)} />
        <label>Email</label>
        <input value={user.email} disabled />
        <label>Role</label>
        <input value={user.role} disabled />
        <button className="btn primary" style={{ marginTop: "14px" }}>Save Changes</button>
        <p className="message">{message}</p>
      </form>

      <div className="form-card">
        <div className="section-head compact">
          <div>
            <p className="eyebrow">MEMBERSHIP</p>
            <h2>Subscription Details</h2>
          </div>
          <span className={`badge ${user.subscription ? "badge-active" : ""}`}>
            {user.subscription ? "Subscribed" : "No Plan"}
          </span>
        </div>
        {user.subscription ? (
          <div className="sub-details-grid">
            <div><span className="muted small">Plan</span><strong>{user.subscription.planName}</strong></div>
            <div><span className="muted small">Price &amp; Duration</span><strong>{user.subscription.price} ({user.subscription.duration})</strong></div>
            <div><span className="muted small">Subscribed On</span><strong>{user.subscription.subscribedOn}</strong></div>
            <div><span className="muted small">Valid Until</span><strong>{user.subscription.validUntil}</strong></div>
          </div>
        ) : (
          <p className="muted">No active subscription yet.</p>
        )}
        <div style={{ marginTop: "14px" }}>
          <Link className="btn secondary" to="/subscribe">
            {user.subscription ? "Change Plan" : "Subscribe Now"}
          </Link>
        </div>
      </div>

      <form className="form-card" onSubmit={handleParentalLock}>
        <div className="section-head compact">
          <div>
            <p className="eyebrow">PARENTAL CONTROLS</p>
            <h2>Parental Lock</h2>
          </div>
          <span className={`badge ${lockEnabled ? "badge-locked" : ""}`}>
            {lockEnabled ? "🔒 Enabled" : "🔓 Disabled"}
          </span>
        </div>
        <p className="muted small">
          {lockEnabled
            ? "Enter your PIN below to turn off Parental Lock."
            : "Enter a PIN below to turn on Parental Lock before watching videos."}
        </p>
        <label>{lockEnabled ? "Enter PIN to Disable Lock" : "Enter PIN to Enable Lock"}</label>
        <input
          type="password"
          maxLength={6}
          value={pinInput}
          onChange={(e) => setPinInput(e.target.value)}
          placeholder="4–6 digit PIN"
        />
        <button
          type="submit"
          className={`btn ${lockEnabled ? "secondary danger" : "primary"}`}
          style={{ marginTop: "14px" }}
        >
          {lockEnabled ? "Turn Off Parental Lock" : "Turn On Parental Lock"}
        </button>
        <p className="message">{lockMessage}</p>
      </form>

      <div className="promo-grid">
        <div className="promo-card">
          <h2>Watchlist</h2>
          <p className="muted">{(user.watchlist || []).length} saved titles</p>
          <Link className="btn secondary" to="/watchlist">View watchlist</Link>
        </div>
        <div className="promo-card">
          <h2>Watch History</h2>
          <p className="muted">{historyCount} titles tracked</p>
        </div>
      </div>
    </main>
  );
}

/* ---------------- CREATOR STUDIO (CLOUDINARY VIDEO UPLOAD + FIRESTORE) ---------------- */
function SubmitVideo({ user }) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("Movies");
  const [thumbnailUrl, setThumbnailUrl] = useState("");
  const [videoFile, setVideoFile] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState("");
  const [mySubmissions, setMySubmissions] = useState([]);
  const fileInputRef = useRef(null);

  async function loadMySubmissions() {
    try {
      const q = query(collection(db, "videoSubmissions"), where("creatorId", "==", user.uid));
      const snap = await getDocs(q);
      const list = [];
      snap.forEach((d) => list.push({ id: d.id, ...d.data() }));
      list.sort((a, b) => (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0));
      setMySubmissions(list);
      return;
    } catch {
      const localList = getLocalSubmissions().filter((s) => s.creatorId === user.uid);
      setMySubmissions(localList);
    }
  }

  useEffect(() => {
    loadMySubmissions();
  }, [user.uid]);

  function handleFileChange(e) {
    const file = e.target.files?.[0] || null;
    setMessage("");
    if (!file) {
      setVideoFile(null);
      return;
    }
    const err = validateVideoFile(file);
    if (err) {
      setMessage(err);
      setVideoFile(null);
      return;
    }
    setVideoFile(file);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!title.trim()) {
      setMessage("Please enter a video title.");
      return;
    }
    if (!VIDEO_CATEGORIES.includes(category)) {
      setMessage("Please choose Movies, TV Shows, or Live Streams.");
      return;
    }
    const fileError = validateVideoFile(videoFile);
    if (fileError) {
      setMessage(fileError);
      return;
    }

    setUploading(true);
    setUploadProgress(5);
    setMessage("Uploading video to Cloudinary...");

    try {
      const uploaded = await uploadVideoToCloudinary(videoFile, (pct) => {
        setUploadProgress(pct);
      });

      const submissionDoc = {
        title: title.trim(),
        description: description.trim(),
        category,
        videoUrl: uploaded.secureUrl,
        hlsUrl: uploaded.hlsUrl,
        isHls: Boolean(uploaded.publicId),
        publicId: uploaded.publicId,
        thumbnailUrl: thumbnailUrl.trim() || uploaded.thumbnailUrl || "",
        creatorId: user.uid,
        creatorName: user.name || user.email,
        status: "pending",
        createdAt: serverTimestamp()
      };

      let savedId = String(Date.now());
      try {
        const docRef = doc(collection(db, "videoSubmissions"));
        await setDoc(docRef, submissionDoc);
        savedId = docRef.id;
      } catch {
        const localAll = getLocalSubmissions();
        saveLocalSubmissions([{ id: savedId, ...submissionDoc }, ...localAll]);
      }

      setTitle("");
      setDescription("");
      setCategory("Movies");
      setThumbnailUrl("");
      setVideoFile(null);
      setUploadProgress(100);
      if (fileInputRef.current) fileInputRef.current.value = "";
      setMessage("Video uploaded to Cloudinary and submitted for admin approval (status: pending).");
      await loadMySubmissions();
    } catch (err) {
      setMessage(err?.message || "Upload failed.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <main className="page narrow">
      <div className="page-title">
        <p className="eyebrow">CREATOR STUDIO</p>
        <h1>Upload a Video</h1>
        <p className="muted">
          Choose a video file from your computer. It uploads directly to Cloudinary and awaits admin approval.
        </p>
      </div>

      <form className="form-card" onSubmit={handleSubmit}>
        <label>Video File (MP4, WebM, MOV — max 100 MB)</label>
        <input
          ref={fileInputRef}
          type="file"
          accept="video/*"
          onChange={handleFileChange}
          disabled={uploading}
        />
        {videoFile && (
          <p className="small muted" style={{ marginTop: "6px" }}>
            Selected file: <strong>{videoFile.name}</strong> ({(videoFile.size / (1024 * 1024)).toFixed(2)} MB)
          </p>
        )}

        <label>Video Title</label>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Enter video title"
          disabled={uploading}
        />

        <label>Category</label>
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          disabled={uploading}
        >
          {VIDEO_CATEGORIES.map((cat) => (
            <option key={cat} value={cat}>{cat}</option>
          ))}
        </select>

        <label>Description</label>
        <textarea
          rows="3"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Describe your video"
          disabled={uploading}
        />

        <label>Thumbnail URL (Optional)</label>
        <input
          value={thumbnailUrl}
          onChange={(e) => setThumbnailUrl(e.target.value)}
          placeholder="Leave blank to auto-generate from Cloudinary"
          disabled={uploading}
        />

        {uploading && (
          <div className="progress-box">
            <div className="small">Uploading video to Cloudinary... {uploadProgress}%</div>
            <div className="progress-track">
              <div className="progress-fill" style={{ width: `${uploadProgress}%` }} />
            </div>
          </div>
        )}

        <button className="btn primary" type="submit" disabled={uploading} style={{ marginTop: "16px" }}>
          {uploading ? `Uploading (${uploadProgress}%)...` : "Upload & Submit for Approval"}
        </button>
        <p className="message">{message}</p>
      </form>

      <section className="admin-panel">
        <div className="section-head compact">
          <h2>My Submissions ({mySubmissions.length})</h2>
          <button type="button" className="btn secondary" onClick={loadMySubmissions}>Refresh</button>
        </div>
        {mySubmissions.length === 0 ? (
          <p className="muted">You have not submitted any videos yet.</p>
        ) : (
          mySubmissions.map((item) => (
            <div className="admin-item" key={item.id}>
              <div>
                <h3>{item.title}</h3>
                <p>Category: <strong>{item.category}</strong> · {item.description || "No description"}</p>
                <span className={`badge status-${item.status || "pending"}`}>
                  Status: {(item.status || "pending").toUpperCase()}
                </span>
              </div>
            </div>
          ))
        )}
      </section>
    </main>
  );
}

/* ---------------- ADMIN DASHBOARD ---------------- */
function Admin() {
  const [pendingSubmissions, setPendingSubmissions] = useState([]);
  const [totalSubmissionsCount, setTotalSubmissionsCount] = useState(0);
  const [videos, setVideos] = useState(() => getDefaultCatalogVideos());
  const [usersCount, setUsersCount] = useState(0);
  const [previewItem, setPreviewItem] = useState(null);
  const [statusMsg, setStatusMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [processingId, setProcessingId] = useState(null);

  useEffect(() => {
    const pendingQuery = query(
      collection(db, "videoSubmissions"),
      where("status", "==", "pending")
    );

    const unsubscribe = onSnapshot(
      pendingQuery,
      (snap) => {
        const firestorePending = [];
        snap.forEach((d) => firestorePending.push({ id: d.id, ...d.data() }));
        firestorePending.sort(
          (a, b) => (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0)
        );
        const localPending = getLocalSubmissions().filter(
          (s) => (s.status || "pending") === "pending"
        );
        const merged = new Map();
        [...firestorePending, ...localPending].forEach((item) => {
          merged.set(String(item.id), item);
        });
        setPendingSubmissions(Array.from(merged.values()));
      },
      () => {
        const localPending = getLocalSubmissions().filter(
          (s) => (s.status || "pending") === "pending"
        );
        setPendingSubmissions(localPending);
      }
    );

    getDocs(collection(db, "videoSubmissions"))
      .then((snap) => setTotalSubmissionsCount(snap.size))
      .catch(() => setTotalSubmissionsCount(getLocalSubmissions().length));

    getDocs(collection(db, "users"))
      .then((snap) => setUsersCount(snap.size))
      .catch(() => setUsersCount(getLocalUsers().length));

    return () => unsubscribe();
  }, []);

  async function refreshPendingManually() {
    setErrorMsg("");
    try {
      const pendingQuery = query(
        collection(db, "videoSubmissions"),
        where("status", "==", "pending")
      );
      const snap = await getDocs(pendingQuery);
      const list = [];
      snap.forEach((d) => list.push({ id: d.id, ...d.data() }));
      setPendingSubmissions(list);
    } catch (err) {
      setErrorMsg(err?.message || "Could not refresh pending submissions.");
    }
  }

  async function moderateSubmission(item, nextStatus) {
    setStatusMsg("");
    setErrorMsg("");
    setProcessingId(item.id);

    try {
      const ref = doc(db, "videoSubmissions", String(item.id));
      await updateDoc(ref, {
        status: nextStatus,
        reviewedAt: serverTimestamp()
      });

      const updatedLocal = getLocalSubmissions().map((s) =>
        String(s.id) === String(item.id) ? { ...s, status: nextStatus } : s
      );
      saveLocalSubmissions(updatedLocal);

      setPendingSubmissions((prev) =>
        prev.filter((s) => String(s.id) !== String(item.id))
      );
      if (previewItem && String(previewItem.id) === String(item.id)) {
        setPreviewItem(null);
      }
      setStatusMsg(
        `Submission "${item.title}" has been ${nextStatus} and removed from Pending Submissions.`
      );
    } catch (err) {
      setErrorMsg(
        `Failed to ${nextStatus === "approved" ? "approve" : "reject"} "${item.title}": ${
          err?.message || "Permission or network error."
        }`
      );
    } finally {
      setProcessingId(null);
    }
  }

  function deleteDefaultVideo(id) {
    const next = videos.filter((v) => v.id !== id);
    saveData("videos", next);
    setVideos(next);
  }

  function restoreDefaults() {
    saveData("videos", starterVideos);
    setVideos(starterVideos);
  }

  return (
    <main className="page">
      <section className="admin-hero">
        <div>
          <p className="eyebrow light">ADMINISTRATION</p>
          <h1>Admin Dashboard</h1>
          <p>Review creator video submissions, manage catalog videos, and monitor platform activity.</p>
        </div>
        <div className="admin-badge">ADMIN</div>
      </section>

      <div className="stats-grid">
        <div className="stat-card"><span>Pending Submissions</span><strong>{pendingSubmissions.length}</strong></div>
        <div className="stat-card"><span>Total Submissions</span><strong>{totalSubmissionsCount}</strong></div>
        <div className="stat-card"><span>Default Catalog</span><strong>{videos.length}</strong></div>
        <div className="stat-card"><span>Users</span><strong>{usersCount}</strong></div>
      </div>

      {statusMsg && <div className="success-banner"><strong>{statusMsg}</strong></div>}
      {errorMsg && <div className="lock-banner"><strong>{errorMsg}</strong></div>}

      {previewItem && (
        <section className="admin-panel">
          <div className="section-head compact">
            <div>
              <p className="eyebrow">SUBMISSION PREVIEW</p>
              <h2>{previewItem.title}</h2>
            </div>
            <button
              type="button"
              className="btn secondary"
              onClick={() => setPreviewItem(null)}
            >
              Close Preview
            </button>
          </div>
          <p className="muted small">
            Category: <strong>{previewItem.category}</strong> · Creator:{" "}
            <strong>{previewItem.creatorName || previewItem.creatorId}</strong> · Status:{" "}
            <strong>{previewItem.status || "pending"}</strong>
          </p>
          <p className="muted">{previewItem.description || "No description provided."}</p>
          <div className="player-box" style={{ marginTop: "12px" }}>
            {previewItem.videoUrl || previewItem.hlsUrl ? (
              <video
                key={previewItem.id}
                src={previewItem.videoUrl || previewItem.hlsUrl}
                poster={previewItem.thumbnailUrl || ""}
                controls
                playsInline
                onError={(e) => {
                  if (previewItem.hlsUrl && e.currentTarget.src !== previewItem.hlsUrl) {
                    e.currentTarget.src = previewItem.hlsUrl;
                  }
                }}
              />
            ) : (
              <p className="muted">No playable video URL found on this submission.</p>
            )}
          </div>
        </section>
      )}

      <section className="admin-panel">
        <div className="section-head compact">
          <h2>Pending Submissions ({pendingSubmissions.length})</h2>
          <button className="btn secondary" onClick={refreshPendingManually}>Refresh</button>
        </div>

        {pendingSubmissions.length === 0 ? (
          <p className="muted">No pending creator video submissions.</p>
        ) : (
          pendingSubmissions.map((s) => (
            <div className="admin-item" key={s.id}>
              <div>
                <h3>{s.title}</h3>
                <p>
                  Category: <strong>{s.category}</strong> · Creator: <strong>{s.creatorName || s.creatorId}</strong>
                </p>
                <p>{s.description || "No description"}</p>
                <span className="badge status-pending">PENDING</span>
              </div>
              <div className="admin-actions">
                <button className="btn secondary" onClick={() => setPreviewItem(s)}>
                  Preview Video
                </button>
                <button
                  className="btn primary"
                  onClick={() => moderateSubmission(s, "approved")}
                  disabled={processingId === s.id}
                >
                  {processingId === s.id ? "Updating..." : "Approve"}
                </button>
                <button
                  className="btn secondary danger"
                  onClick={() => moderateSubmission(s, "rejected")}
                  disabled={processingId === s.id}
                >
                  Reject
                </button>
              </div>
            </div>
          ))
        )}
      </section>

      <section className="admin-panel">
        <div className="section-head compact">
          <h2>Default Catalog ({videos.length})</h2>
          <button className="btn secondary" onClick={restoreDefaults}>Restore Default Videos</button>
        </div>
        {videos.map((v) => (
          <div className="admin-item" key={v.id}>
            <div>
              <h3>{v.title}</h3>
              <p>{v.category} · {v.platform}</p>
            </div>
            <button className="btn secondary danger" onClick={() => deleteDefaultVideo(v.id)}>
              Delete
            </button>
          </div>
        ))}
      </section>
    </main>
  );
}

/* ---------------- MAIN APP ---------------- */
export default function App() {
  const [user, setUser] = useState(() => readData("currentUser", null));
  const [authReady, setAuthReady] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      const cached = readData("currentUser", null);
      if (!firebaseUser) {
        if (cached?.isDemoAdmin && cached?.role === "admin") {
          setUser(cached);
          setAuthReady(true);
          return;
        }
        saveData("currentUser", null);
        setUser(null);
        setAuthReady(true);
        return;
      }

      const fallbackUser = {
        uid: firebaseUser.uid,
        name: firebaseUser.displayName || firebaseUser.email.split("@")[0],
        email: firebaseUser.email.toLowerCase(),
        role: "user",
        watchlist: [],
        subscription: null,
        parentalLock: { enabled: false, pin: "" }
      };

      try {
        const snap = await getDoc(doc(db, "users", firebaseUser.uid));
        if (snap.exists()) {
          const data = snap.data();
          const merged = {
            ...fallbackUser,
            ...data,
            role: data.role === "admin" ? "admin" : "user",
            uid: firebaseUser.uid
          };
          setUser(merged);
          saveData("currentUser", merged);
        } else {
          setUser(fallbackUser);
          saveData("currentUser", fallbackUser);
        }
      } catch {
        if (cached && cached.uid === firebaseUser.uid) {
          setUser(cached);
        } else {
          setUser(fallbackUser);
          saveData("currentUser", fallbackUser);
        }
      } finally {
        setAuthReady(true);
      }
    });

    return () => unsubscribe();
  }, []);

  async function updateUser(updated) {
    setUser(updated);
    saveData("currentUser", updated);
    if (!updated?.uid || updated?.isDemoAdmin) return;
    try {
      await setDoc(
        doc(db, "users", updated.uid),
        {
          name: updated.name,
          watchlist: updated.watchlist || [],
          subscription: updated.subscription || null,
          parentalLock: updated.parentalLock || { enabled: false, pin: "" }
        },
        { merge: true }
      );
    } catch {
      const list = getLocalUsers();
      const idx = list.findIndex((u) => u.uid === updated.uid);
      if (idx >= 0) list[idx] = updated;
      else list.push(updated);
      saveLocalUsers(list);
    }
  }

  async function logout() {
    try {
      await signOut(auth);
    } catch {
      // Ignore signOut errors if offline or using demo admin
    }
    saveData("currentUser", null);
    setUser(null);
    navigate("/");
  }

  if (!authReady) {
    return (
      <div className="auth-body">
        <main className="auth-main">
          <div className="empty-state">Loading KL STREAM...</div>
        </main>
      </div>
    );
  }

  return (
    <div className="app-shell">
      {user && <Header user={user} onLogout={logout} />}
      <Routes>
        <Route
          path="/"
          element={
            user ? (
              <Navigate to={user.role === "admin" ? "/admin" : "/home"} replace />
            ) : (
              <AuthPage onLogin={(u) => { setUser(u); saveData("currentUser", u); }} />
            )
          }
        />
        <Route path="/home" element={<Protected user={user}><Home user={user} updateUser={updateUser} /></Protected>} />
        <Route path="/blind-watch" element={<Protected user={user}><BlindWatchPage user={user} /></Protected>} />
        <Route path="/my-moments" element={<Protected user={user}><MyMomentsPage user={user} /></Protected>} />
        <Route path="/watch/:id" element={<Protected user={user}><Watch user={user} updateUser={updateUser} /></Protected>} />
        <Route path="/watchlist" element={<Protected user={user}><Watchlist user={user} updateUser={updateUser} /></Protected>} />
        <Route path="/subscribe" element={<Protected user={user}><Subscribe user={user} updateUser={updateUser} /></Protected>} />
        <Route path="/profile" element={<Protected user={user}><Profile user={user} updateUser={updateUser} /></Protected>} />
        <Route path="/submit" element={<Protected user={user}><SubmitVideo user={user} /></Protected>} />
        <Route path="/admin" element={<Protected user={user} adminOnly><Admin /></Protected>} />
        <Route
          path="*"
          element={
            <main className="page">
              <div className="empty-state">
                <h2>404 — Page not found</h2>
                <Link to={user ? "/home" : "/"} className="inline-link">Go back</Link>
              </div>
            </main>
          }
        />
      </Routes>
      {user && <Footer />}
    </div>
  );
}