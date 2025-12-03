/**
 * @fileoverview Service Worker for QuizForge PWA
 * @description Provides offline functionality and caching for the Quiz Application
 * @author Quiz Application Team
 * @version 2.0.0
 */

// Service worker version and cache names
const CACHE_VERSION = 'quizforge-v1.0.0';
const STATIC_CACHE = `${CACHE_VERSION}-static`;
const DYNAMIC_CACHE = `${CACHE_VERSION}-dynamic`;
const API_CACHE = `${CACHE_VERSION}-api`;

// Cache duration in milliseconds
const CACHE_DURATION = {
  STATIC: 7 * 24 * 60 * 60 * 1000,    // 7 days
  DYNAMIC: 24 * 60 * 60 * 1000,       // 1 day
  API: 5 * 60 * 1000                  // 5 minutes
};

/**
 * Static assets to cache immediately on install
 * @description Critical files needed for offline functionality
 */
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/favicon.ico',
  '/manifest.json',
  // Note: Vite build assets will be added dynamically
];

/**
 * API endpoints that should be cached
 * @description Supabase endpoints for offline quiz data
 */
const CACHEABLE_API_PATTERNS = [
  /\/rest\/v1\/quizzes/,
  /\/rest\/v1\/quiz_folders/,
  /\/rest\/v1\/profiles/
];

/**
 * Install Event Handler
 * @description Caches static assets when service worker is installed
 */
self.addEventListener('install', (event) => {
  console.log('🚀 QuizForge Service Worker installing...');
  
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then(cache => {
        console.log('📦 Caching static assets');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => {
        console.log('✅ Static assets cached successfully');
        return self.skipWaiting(); // Activate immediately
      })
      .catch(error => {
        console.error('❌ Failed to cache static assets:', error);
      })
  );
});

/**
 * Activate Event Handler
 * @description Cleans up old caches when service worker activates
 */
self.addEventListener('activate', (event) => {
  console.log('🔄 QuizForge Service Worker activating...');
  
  event.waitUntil(
    caches.keys()
      .then(cacheNames => {
        const deletePromises = cacheNames
          .filter(cacheName => {
            // Delete caches that don't match current version
            return cacheName.startsWith('quizforge-') && 
                   !cacheName.includes(CACHE_VERSION);
          })
          .map(cacheName => {
            console.log('🗑️ Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          });
        
        return Promise.all(deletePromises);
      })
      .then(() => {
        console.log('✅ QuizForge Service Worker activated');
        return self.clients.claim(); // Take control immediately
      })
      .catch(error => {
        console.error('❌ Service Worker activation failed:', error);
      })
  );
});

/**
 * Fetch Event Handler
 * @description Implements caching strategies for different resource types
 */
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Skip caching for certain requests
  if (shouldSkipCaching(request)) {
    return;
  }
  
  // Choose caching strategy based on request type
  if (isStaticAsset(url)) {
    event.respondWith(cacheFirstStrategy(request, STATIC_CACHE));
  } else if (isApiRequest(url)) {
    event.respondWith(networkFirstStrategy(request, API_CACHE));
  } else {
    event.respondWith(staleWhileRevalidateStrategy(request, DYNAMIC_CACHE));
  }
});

/**
 * Cache First Strategy
 * @description Serves from cache, falls back to network
 * @param {Request} request - The fetch request
 * @param {string} cacheName - Cache to use
 * @returns {Promise<Response>} Response from cache or network
 */
async function cacheFirstStrategy(request, cacheName) {
  try {
    // Try cache first
    const cachedResponse = await caches.match(request);
    if (cachedResponse && !isCacheExpired(cachedResponse)) {
      return cachedResponse;
    }
    
    // Fallback to network
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      const cache = await caches.open(cacheName);
      await cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    console.error('Cache first strategy failed:', error);
    
    // Return cached response even if expired as last resort
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // Return offline page if available
    return caches.match('/offline.html') || new Response('Offline', { status: 503 });
  }
}

/**
 * Network First Strategy
 * @description Tries network first, falls back to cache
 * @param {Request} request - The fetch request
 * @param {string} cacheName - Cache to use
 * @returns {Promise<Response>} Response from network or cache
 */
async function networkFirstStrategy(request, cacheName) {
  try {
    // Try network first
    const networkResponse = await Promise.race([
      fetch(request),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Network timeout')), 3000)
      )
    ]);
    
    if (networkResponse.ok) {
      const cache = await caches.open(cacheName);
      await cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    console.log('Network failed, trying cache:', error.message);
    
    // Fallback to cache
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    throw error;
  }
}

/**
 * Stale While Revalidate Strategy
 * @description Returns cache immediately, updates cache in background
 * @param {Request} request - The fetch request
 * @param {string} cacheName - Cache to use
 * @returns {Promise<Response>} Response from cache or network
 */
async function staleWhileRevalidateStrategy(request, cacheName) {
  const cachedResponse = await caches.match(request);
  
  const networkUpdate = fetch(request).then(async (response) => {
    if (response.ok) {
      const cache = await caches.open(cacheName);
      await cache.put(request, response.clone());
    }
    return response;
  }).catch(() => {
    // Silently fail network update
  });
  
  // Return cached response immediately if available
  return cachedResponse || networkUpdate;
}

/**
 * Helper Functions
 */

function shouldSkipCaching(request) {
  return (
    request.method !== 'GET' ||
    request.url.includes('/auth/') ||
    request.url.includes('chrome-extension://') ||
    request.url.includes('browser-sync')
  );
}

function isStaticAsset(url) {
  return (
    url.pathname.includes('/assets/') ||
    url.pathname.endsWith('.js') ||
    url.pathname.endsWith('.css') ||
    url.pathname.endsWith('.woff2') ||
    url.pathname.endsWith('.png') ||
    url.pathname.endsWith('.jpg') ||
    url.pathname.endsWith('.svg')
  );
}

function isApiRequest(url) {
  return CACHEABLE_API_PATTERNS.some(pattern => pattern.test(url.pathname));
}

function isCacheExpired(response) {
  const cachedTime = response.headers.get('sw-cache-time');
  if (!cachedTime) return false;
  
  const age = Date.now() - parseInt(cachedTime);
  return age > CACHE_DURATION.DYNAMIC;
}

/**
 * Message Handler
 * @description Handles messages from the main app
 */
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data && event.data.type === 'CACHE_QUIZ') {
    // Pre-cache specific quiz data
    const quizId = event.data.quizId;
    cacheQuizData(quizId);
  }
});

/**
 * Background Sync for offline actions
 * @description Handles actions performed while offline
 */
self.addEventListener('sync', (event) => {
  if (event.tag === 'quiz-submission') {
    event.waitUntil(syncQuizSubmissions());
  }
});

async function syncQuizSubmissions() {
  // Implementation for syncing offline quiz submissions
  console.log('🔄 Syncing offline quiz submissions...');
}

async function cacheQuizData(quizId) {
  try {
    const cache = await caches.open(API_CACHE);
    const quizUrl = `/rest/v1/quizzes?id=eq.${quizId}`;
    const response = await fetch(quizUrl);
    
    if (response.ok) {
      await cache.put(quizUrl, response.clone());
      console.log(`📦 Cached quiz data for ${quizId}`);
    }
  } catch (error) {
    console.error('Failed to cache quiz data:', error);
  }
}