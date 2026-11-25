export const VIDEO_CATEGORIES = ["Movies", "TV Shows", "Live Streams"];

export const starterVideos = [
  // ================= RESTORED CLOUDINARY MOVIES (3 Videos) =================
  {
    id: "cld-1",
    title: "CONTRACT",
    category: "Movies",
    sourceType: "hls",
    platform: "Cloudinary HLS",
    publicId: "9210109-uhd_4096_2160_25fps",
    streamUrl: "https://res.cloudinary.com/vvzb7t5h/video/upload/sp_auto/9210109-uhd_4096_2160_25fps.m3u8",
    fallbackUrl: "https://res.cloudinary.com/vvzb7t5h/video/upload/9210109-uhd_4096_2160_25fps.mp4",
    thumbnail: "https://res.cloudinary.com/vvzb7t5h/video/upload/so_2,w_640,h_360,c_fill/9210109-uhd_4096_2160_25fps.jpg",
    qualities: ["Auto", "1080p", "720p", "480p", "360p"],
    description: "Cloudinary HLS original short film with adaptive multi-bitrate delivery."
  },
  {
    id: "cld-2",
    title: "Dark City",
    category: "Movies",
    sourceType: "hls",
    platform: "Cloudinary HLS",
    publicId: "14964426_3840_2160_30fps",
    streamUrl: "https://res.cloudinary.com/vvzb7t5h/video/upload/sp_auto/14964426_3840_2160_30fps.m3u8",
    fallbackUrl: "https://res.cloudinary.com/vvzb7t5h/video/upload/14964426_3840_2160_30fps.mp4",
    thumbnail: "https://res.cloudinary.com/vvzb7t5h/video/upload/so_2,w_640,h_360,c_fill/14964426_3840_2160_30fps.jpg",
    qualities: ["Auto", "1080p", "720p", "480p", "360p"],
    description: "Nocturnal city atmosphere streamed via Cloudinary adaptive HLS."
  },
  {
    id: "cld-3",
    title: "Cars or Life",
    category: "Movies",
    sourceType: "hls",
    platform: "Cloudinary HLS",
    publicId: "10380651-uhd_4096_2160_25fps",
    streamUrl: "https://res.cloudinary.com/vvzb7t5h/video/upload/sp_auto/10380651-uhd_4096_2160_25fps.m3u8",
    fallbackUrl: "https://res.cloudinary.com/vvzb7t5h/video/upload/10380651-uhd_4096_2160_25fps.mp4",
    thumbnail: "https://res.cloudinary.com/vvzb7t5h/video/upload/so_2,w_640,h_360,c_fill/10380651-uhd_4096_2160_25fps.jpg",
    qualities: ["Auto", "1080p", "720p", "480p", "360p"],
    description: "High-definition automotive visual showcase delivered via Cloudinary HLS."
  },

  // ================= REMAINING MOVIES =================
  {
    id: 1,
    title: "Big Buck Bunny",
    category: "Movies",
    sourceType: "youtube",
    platform: "YouTube",
    videoId: "aqz-KE-bpKQ",
    qualities: ["Auto", "1080p", "720p", "480p", "360p"],
    description: "Classic Blender Foundation open-movie animated film following a giant rabbit in the forest."
  },
  {
    id: 2,
    title: "Sintel",
    category: "Movies",
    sourceType: "youtube",
    platform: "YouTube",
    videoId: "eRsGyueVLvQ",
    qualities: ["Auto", "1080p", "720p", "480p", "360p"],
    description: "Fantasy animated open film about a young warrior searching for her dragon."
  },
  {
    id: 3,
    title: "Tears of Steel",
    category: "Movies",
    sourceType: "youtube",
    platform: "YouTube",
    videoId: "R6MlUcmOul8",
    qualities: ["Auto", "1080p", "720p", "480p", "360p"],
    description: "Science-fiction open film blending live action and visual effects."
  },
  {
    id: 4,
    title: "Elephants Dream",
    category: "Movies",
    sourceType: "youtube",
    platform: "YouTube",
    videoId: "TLkA0RELQ1g",
    qualities: ["Auto", "720p", "480p", "360p"],
    description: "Surreal animated open film exploring a mechanical world inside an endless machine."
  },
  {
    id: 5,
    title: "Cosmos Laundromat",
    category: "Movies",
    sourceType: "youtube",
    platform: "YouTube",
    videoId: "Y-rmzh0PI3c",
    qualities: ["Auto", "1080p", "720p", "480p", "360p"],
    description: "Animated open film about a solitary sheep offered a second chance at life."
  },
  {
    id: 6,
    title: "Spring",
    category: "Movies",
    sourceType: "youtube",
    platform: "YouTube",
    videoId: "WhWc3b3KhnY",
    qualities: ["Auto", "1080p", "720p", "480p", "360p"],
    description: "Animated open film following a shepherd girl and her dog in alpine valleys."
  },
  {
    id: 7,
    title: "Agent 327: Operation Barbershop",
    category: "Movies",
    sourceType: "youtube",
    platform: "YouTube",
    videoId: "mN0zPOpADL4",
    qualities: ["Auto", "1080p", "720p", "480p", "360p"],
    description: "Animated spy-comedy open film set in a quiet barbershop."
  },
  {
    id: 8,
    title: "Coffee Run",
    category: "Movies",
    sourceType: "youtube",
    platform: "YouTube",
    videoId: "PVGeM40dABA",
    qualities: ["Auto", "1080p", "720p", "480p", "360p"],
    description: "High-energy animated open film filled with visual humor and motion."
  },
  {
    id: 9,
    title: "Charge",
    category: "Movies",
    sourceType: "youtube",
    platform: "YouTube",
    videoId: "UXqq0ZvbOnk",
    qualities: ["Auto", "1080p", "720p", "480p", "360p"],
    description: "Animated sci-fi open film set inside a high-security energy facility."
  },
  {
    id: 10,
    title: "Wing It!",
    category: "Movies",
    sourceType: "youtube",
    platform: "YouTube",
    videoId: "u9lj-c29dxI",
    qualities: ["Auto", "1080p", "720p", "480p", "360p"],
    description: "Animated comedy open film about a dog and cat building a rocket."
  },
  {
    id: 11,
    title: "Caminandes 1: Llama Drama",
    category: "Movies",
    sourceType: "youtube",
    platform: "YouTube",
    videoId: "SkVqJ1SGeL0",
    qualities: ["Auto", "720p", "480p", "360p"],
    description: "Animated comedy film about a determined llama trying to cross a fence."
  },
  {
    id: 16,
    title: "Bachhala Malli (Telugu Full Movie)",
    category: "Movies",
    sourceType: "youtube",
    platform: "YouTube",
    videoId: "NELLZJgNUjQ",
    qualities: ["Auto", "1080p", "720p", "480p", "360p"],
    description: "Telugu action drama full movie starring Allari Naresh and Amritha Aiyer."
  },
  {
    id: 19,
    title: "Razor (Telugu Full Movie)",
    category: "Movies",
    sourceType: "youtube",
    platform: "YouTube",
    videoId: "d7cQRQF-Ld0",
    qualities: ["Auto", "1080p", "720p", "480p", "360p"],
    description: "Telugu thriller full movie written and directed by Ravi Babu."
  },
  {
    id: 35,
    title: "A Flying Jatt (Hindi Full Movie)",
    category: "Movies",
    sourceType: "youtube",
    platform: "YouTube",
    videoId: "YHK4M7ZyTKo",
    qualities: ["Auto", "1080p", "720p", "480p", "360p"],
    description: "Hindi superhero action full movie starring Tiger Shroff and Jacqueline Fernandez."
  },
  {
    id: 36,
    title: "Hindi Medium (Hindi Full Movie)",
    category: "Movies",
    sourceType: "youtube",
    platform: "YouTube",
    videoId: "dCdzVXwfjZc",
    qualities: ["Auto", "1080p", "720p", "480p", "360p"],
    description: "Hindi comedy-drama full movie starring Irrfan Khan and Saba Qamar."
  },
  {
    id: 37,
    title: "Guzaarish (Hindi Full Movie)",
    category: "Movies",
    sourceType: "youtube",
    platform: "YouTube",
    videoId: "--BdO_3Ynqo",
    qualities: ["Auto", "1080p", "720p", "480p", "360p"],
    description: "Hindi drama full movie starring Hrithik Roshan and Aishwarya Rai Bachchan."
  },
  {
    id: 38,
    title: "Enemmy (Hindi Full Movie)",
    category: "Movies",
    sourceType: "youtube",
    platform: "YouTube",
    videoId: "2JxyQYhk5E0",
    qualities: ["Auto", "1080p", "720p", "480p", "360p"],
    description: "Hindi action crime full movie starring Suniel Shetty and Mithun Chakraborty."
  },
  {
    id: 42,
    title: "Special 26 (2013) (Hindi Full Movie)",
    category: "Movies",
    sourceType: "youtube",
    platform: "YouTube",
    videoId: "ZKU1A2xc8JY",
    qualities: ["Auto", "1080p", "720p", "480p", "360p"],
    description: "Hindi heist thriller full movie starring Akshay Kumar and Manoj Bajpayee."
  },
  {
    id: 43,
    title: "Phantom (2015) (Hindi Full Movie)",
    category: "Movies",
    sourceType: "youtube",
    platform: "YouTube",
    videoId: "2TvVZrSRPcU",
    qualities: ["Auto", "1080p", "720p", "480p", "360p"],
    description: "Hindi action thriller full movie starring Saif Ali Khan and Katrina Kaif."
  },
  {
    id: 44,
    title: "Hera Pheri (Hindi Full Movie)",
    category: "Movies",
    sourceType: "youtube",
    platform: "YouTube",
    videoId: "TIQ5hrfermg",
    qualities: ["Auto", "1080p", "720p", "480p", "360p"],
    description: "Classic Hindi comedy full movie starring Akshay Kumar, Paresh Rawal, and Suniel Shetty."
  },
  {
    id: 46,
    title: "Welcome (Hindi Full Movie)",
    category: "Movies",
    sourceType: "youtube",
    platform: "YouTube",
    videoId: "AKiynoClCaA",
    qualities: ["Auto", "1080p", "720p", "480p", "360p"],
    description: "Hindi family comedy full movie starring Akshay Kumar, Anil Kapoor, and Nana Patekar."
  },
  {
    id: 47,
    title: "Bhool Bhulaiyaa (Hindi Full Movie)",
    category: "Movies",
    sourceType: "youtube",
    platform: "YouTube",
    videoId: "jzYxbnHHhY4",
    qualities: ["Auto", "1080p", "720p", "480p", "360p"],
    description: "Hindi psychological comedy thriller full movie directed by Priyadarshan."
  },
  {
    id: 55,
    title: "Charade (1963) (English Full Movie)",
    category: "Movies",
    sourceType: "youtube",
    platform: "YouTube",
    videoId: "SLQc9kSkRmo",
    qualities: ["Auto", "1080p", "720p", "480p", "360p"],
    description: "Classic romantic mystery thriller full movie starring Cary Grant and Audrey Hepburn."
  },
  {
    id: 56,
    title: "Sasha (1930) (English Full Movie)",
    category: "Movies",
    sourceType: "youtube",
    platform: "YouTube",
    videoId: "6dNCDgNjJ_M",
    qualities: ["Auto", "720p", "480p", "360p"],
    description: "Classic crime drama full-length feature film with English captions."
  },
  {
    id: 58,
    title: "American Schemers (English Full Movie)",
    category: "Movies",
    sourceType: "youtube",
    platform: "YouTube",
    videoId: "PTAdUyVbasA",
    qualities: ["Auto", "1080p", "720p", "480p", "360p"],
    description: "English comedy full-length movie officially uploaded on YouTube."
  },
  {
    id: 60,
    title: "Breach (English Full Movie)",
    category: "Movies",
    sourceType: "youtube",
    platform: "YouTube",
    videoId: "HCr1U5F-dD8",
    qualities: ["Auto", "1080p", "720p", "480p", "360p"],
    description: "English sci-fi thriller full-length movie."
  },
  {
    id: 61,
    title: "The Quiet Hour (English Full Movie)",
    category: "Movies",
    sourceType: "youtube",
    platform: "YouTube",
    videoId: "fFU8VPkeg2k",
    qualities: ["Auto", "1080p", "720p", "480p", "360p"],
    description: "English sci-fi drama thriller full-length movie."
  },
  {
    id: 63,
    title: "Night of the Living Dead (1968) (English Full Movie)",
    category: "Movies",
    sourceType: "youtube",
    platform: "YouTube",
    videoId: "H91BxkBXttE",
    qualities: ["Auto", "720p", "480p", "360p"],
    description: "Public-domain horror classic directed by George A. Romero."
  },
  {
    id: 71,
    title: "D.O.A. (1950) (English Full Movie)",
    category: "Movies",
    sourceType: "youtube",
    platform: "YouTube",
    videoId: "r4V7n1M9c3W",
    qualities: ["Auto", "720p", "480p", "360p"],
    description: "Classic film noir thriller full movie in the public domain."
  },
  {
    id: 75,
    title: "Detour (1945) (English Full Movie)",
    category: "Movies",
    sourceType: "youtube",
    platform: "YouTube",
    videoId: "z9L3k7W1p6M",
    qualities: ["Auto", "720p", "480p", "360p"],
    description: "Public-domain road-trip noir thriller full movie."
  },

  // ================= REMAINING TV SHOWS =================
  {
    id: 76,
    title: "Perfect Partner — Episode 1 (Telugu Web Series)",
    category: "TV Shows",
    sourceType: "youtube",
    platform: "YouTube",
    videoId: "4ecSlRxNGM8",
    qualities: ["Auto", "1080p", "720p", "480p", "360p"],
    description: "Series: Perfect Partner · Episode 1 romantic drama Telugu web series."
  },
  {
    id: 77,
    title: "Call Boy — Episode 1 (Telugu Web Series)",
    category: "TV Shows",
    sourceType: "youtube",
    platform: "YouTube",
    videoId: "mLZiZViuoHA",
    qualities: ["Auto", "1080p", "720p", "480p", "360p"],
    description: "Series: Call Boy · Episode 1 drama Telugu web series."
  },
  {
    id: 79,
    title: "Saas Bahu Achaar Pvt. Ltd. — Episode 2: Shani Rekha",
    category: "TV Shows",
    sourceType: "youtube",
    platform: "YouTube",
    videoId: "3BBiu82oZ1k",
    qualities: ["Auto", "1080p", "720p", "480p", "360p"],
    description: "Series: Saas Bahu Achaar Pvt. Ltd. (TVF) · Season 1 Episode 2."
  },
  {
    id: 80,
    title: "Saas Bahu Achaar Pvt. Ltd. — Episode 3: Safed Jhooth",
    category: "TV Shows",
    sourceType: "youtube",
    platform: "YouTube",
    videoId: "k2lHbMcTSb0",
    qualities: ["Auto", "1080p", "720p", "480p", "360p"],
    description: "Series: Saas Bahu Achaar Pvt. Ltd. (TVF) · Season 1 Episode 3."
  },
  {
    id: 81,
    title: "Pehli Nazar Mein — Episode 2 (Hindi Web Series)",
    category: "TV Shows",
    sourceType: "youtube",
    platform: "YouTube",
    videoId: "IdYyH5GwgoY",
    qualities: ["Auto", "1080p", "720p", "480p", "360p"],
    description: "Series: Pehli Nazar Mein · Episode 2 romantic drama web series."
  },
  {
    id: 91,
    title: "Inside the Mind — Episode: Habits & Focus",
    category: "TV Shows",
    sourceType: "youtube",
    platform: "YouTube",
    videoId: "arj7oStGLkU",
    qualities: ["Auto", "720p", "480p", "360p"],
    description: "Series episode examining habits, focus, and decision-making."
  },
  {
    id: 92,
    title: "Ideas That Inspire — Episode: Great Communication",
    category: "TV Shows",
    sourceType: "youtube",
    platform: "YouTube",
    videoId: "qp0HIF3SfI4",
    qualities: ["Auto", "720p", "480p", "360p"],
    description: "Program episode exploring leadership and clear ideas."
  },
  {
    id: 93,
    title: "The Learning Series — Episode: Creativity in Schools",
    category: "TV Shows",
    sourceType: "youtube",
    platform: "YouTube",
    videoId: "iG9CE55wbtY",
    qualities: ["Auto", "720p", "480p", "360p"],
    description: "Educational show episode about creativity and learning."
  },
  {
    id: 94,
    title: "Motivation Explained — Episode: Inner Drive",
    category: "TV Shows",
    sourceType: "youtube",
    platform: "YouTube",
    videoId: "rrkrvAUbU9Y",
    qualities: ["Auto", "720p", "480p", "360p"],
    description: "Series episode exploring what motivates people at work and study."
  },
  {
    id: 95,
    title: "A Different Perspective — Episode: Single Stories",
    category: "TV Shows",
    sourceType: "youtube",
    platform: "YouTube",
    videoId: "D9Ihs241zeg",
    qualities: ["Auto", "720p", "480p", "360p"],
    description: "Series episode about storytelling, empathy, and culture."
  },
  {
    id: 96,
    title: "What Makes a Good Life? — Series Special",
    category: "TV Shows",
    sourceType: "youtube",
    platform: "YouTube",
    videoId: "8KkKuTCFvzI",
    qualities: ["Auto", "720p", "480p", "360p"],
    description: "Program episode discussing long-term well-being and relationships."
  },
  {
    id: 97,
    title: "Learning Lab — Episode: Education & Minds",
    category: "TV Shows",
    sourceType: "youtube",
    platform: "YouTube",
    videoId: "zDZFcDGpL4U",
    qualities: ["Auto", "720p", "480p", "360p"],
    description: "Educational episode examining modern classrooms and learning."
  },
  {
    id: 98,
    title: "Our Planet Series — Episode: Coastal Seas",
    category: "TV Shows",
    sourceType: "youtube",
    platform: "YouTube",
    videoId: "r9PeYPHdpNo",
    qualities: ["Auto", "1080p", "720p", "480p", "360p"],
    description: "Nature series episode exploring coastal marine wildlife."
  },
  {
    id: 99,
    title: "Tech & Web Series — Episode: Embed & Player Guide",
    category: "TV Shows",
    sourceType: "youtube",
    platform: "YouTube",
    videoId: "M7lc1UVf-VE",
    qualities: ["Auto", "1080p", "720p", "480p", "360p"],
    description: "Technical series episode on web video playback and APIs."
  },

  // ================= REMAINING LIVE STREAMS =================
  {
    id: 103,
    title: "Synthwave Radio — 24/7 Chill Beats",
    category: "Live Streams",
    sourceType: "youtube",
    platform: "YouTube Live",
    videoId: "4xDzrJKXOOY",
    qualities: ["Auto", "1080p", "720p", "480p", "360p"],
    description: "Continuous 24/7 synthwave music stream."
  },
  {
    id: 104,
    title: "Space Launch Broadcast Stream",
    category: "Live Streams",
    sourceType: "youtube",
    platform: "YouTube Live",
    videoId: "v9gY7VkVT0w",
    qualities: ["Auto", "720p", "480p", "360p"],
    description: "Space launch and mission stream."
  },
  {
    id: 105,
    title: "Space Mission Live Feed",
    category: "Live Streams",
    sourceType: "youtube",
    platform: "YouTube Live",
    videoId: "jxLT_ckNbIs",
    qualities: ["Auto", "720p", "480p", "360p"],
    description: "Space mission live coverage."
  }
];

export const subscriptionPlans = [
  {
    id: "monthly",
    name: "Monthly Plan",
    duration: "1 Month",
    price: "₹199",
    perMonth: "₹199 / month",
    badge: "Flexible",
    features: [
      "Access to Movies, TV Shows & Live Streams",
      "Adaptive Streaming quality selector",
      "Personalized Recommendations & Watchlist",
      "Parental Lock PIN Protection"
    ]
  },
  {
    id: "six-months",
    name: "6-Month Plan",
    duration: "6 Months",
    price: "₹899",
    perMonth: "₹149 / month",
    badge: "Most Popular",
    popular: true,
    features: [
      "Save 25% compared to Monthly Plan",
      "Full access to catalog & creator uploads",
      "Adaptive Quality & Network Simulator",
      "Creator Studio video submission access"
    ]
  },
  {
    id: "twelve-months",
    name: "12-Month Annual Plan",
    duration: "12 Months",
    price: "₹1,499",
    perMonth: "₹125 / month",
    badge: "Best Value",
    features: [
      "Save 37% on annual membership",
      "Unlimited access to entire catalog",
      "Parental Lock & Profile Controls",
      "Student demo support"
    ]
  }
];

export function getVideoThumbnail(video) {
  if (video.thumbnail) return video.thumbnail;
  if (video.thumbnailUrl) return video.thumbnailUrl;
  if (video.videoId) return `https://img.youtube.com/vi/${video.videoId}/hqdefault.jpg`;
  return "https://placehold.co/640x360/0D111B/3157A5?text=KL+STREAM";
}

export function readData(key, fallback) {
  try {
    const value = localStorage.getItem(key);
    return value ? JSON.parse(value) : fallback;
  } catch {
    return fallback;
  }
}

export function saveData(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Ignore storage quota errors
  }
}