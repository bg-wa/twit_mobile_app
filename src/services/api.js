import axios from 'axios';
import { API_CREDENTIALS } from '../config/credentials';
import cacheManager from '../utils/cacheManager';

// Create axios instance with base configuration
const api = axios.create({
  baseURL: 'https://twit.tv/api/v1.0',
  headers: {
    'Accept': 'application/json',
  }
});

// Get API credentials from config
const { APP_ID, APP_KEY } = API_CREDENTIALS;

// Add authentication headers to every request
api.interceptors.request.use(config => {
  config.headers['app-id'] = APP_ID;
  config.headers['app-key'] = APP_KEY;
  return config;
});

// Handle API errors
api.interceptors.response.use(
  response => response,
  error => {
    if (error.response && error.response.status === 500) {
      const errorData = error.response.data;
      if (errorData && errorData._errors && errorData._errors[0].message === "usage limits are exceeded") {
        console.error("API usage limits exceeded");
      }
    }
    return Promise.reject(error);
  }
);

// ---- Generic cached request helpers ----
const HTTP_CACHE_PREFIX = 'twit_cache_http_';
const TEN_MIN_MS = 10 * 60 * 1000;

// Deterministic stringify with sorted keys
const stableStringify = (obj) => {
  if (obj === undefined) return 'undefined';
  if (obj === null || typeof obj !== 'object') return JSON.stringify(obj);
  if (Array.isArray(obj)) return '[' + obj.map(stableStringify).join(',') + ']';
  const keys = Object.keys(obj).sort();
  return '{' + keys.map(k => JSON.stringify(k) + ':' + stableStringify(obj[k])).join(',') + '}';
};

// Simple djb2 hash to keep keys compact
const hashString = (str) => {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash) + str.charCodeAt(i);
    hash = hash & 0xffffffff;
  }
  // convert to unsigned and hex
  return (hash >>> 0).toString(16);
};

const buildCacheKey = (config) => {
  const { method = 'GET', url, baseURL = api.defaults.baseURL, params, data, headers } = config;
  const normalized = [
    method.toUpperCase(),
    (baseURL || '').replace(/\/$/, ''),
    url,
    stableStringify(params || {}),
    stableStringify(data || {}),
    // Include only headers that affect representation
    stableStringify({ Accept: headers?.Accept || headers?.accept })
  ].join('|');
  return HTTP_CACHE_PREFIX + hashString(normalized);
};

const requestWithCache = async (reqConfig, { ttlMs = TEN_MIN_MS, forceRefresh = false } = {}) => {
  const method = (reqConfig.method || 'GET').toUpperCase();
  const isGetLike = method === 'GET' || method === 'HEAD';
  const cacheKey = isGetLike ? buildCacheKey(reqConfig) : null;

  // Try cache first for GET/HEAD
  if (isGetLike && !forceRefresh && cacheKey) {
    const cached = await cacheManager.getFromCache(cacheKey, false, ttlMs);
    if (cached != null) {
      return { data: cached, status: 200, statusText: 'OK', headers: { 'x-cache': 'HIT' }, config: reqConfig };
    }
  }

  // If offline and no cache for GET, surface a clear error
  const online = await cacheManager.isOnline();
  if (!online && isGetLike) {
    // second chance: ignore expiry in case we have stale but useful cache
    if (cacheKey) {
      const stale = await cacheManager.getFromCache(cacheKey, true);
      if (stale != null) {
        return { data: stale, status: 200, statusText: 'OK (stale)', headers: { 'x-cache': 'STALE' }, config: reqConfig };
      }
    }
    throw new Error('No internet connection and no cached data available');
  }

  // Perform network request
  const response = await api.request(reqConfig);

  // Cache GET/HEAD responses
  if (isGetLike && cacheKey) {
    await cacheManager.saveToCache(cacheKey, response.data);
  } else if (!isGetLike) {
    // For mutating requests, best-effort: clear HTTP cache namespace
    await cacheManager.clearCacheByPrefix(HTTP_CACHE_PREFIX);
  }

  return response;
};

const cachedGet = (url, options = {}, cacheOptions = {}) => {
  return requestWithCache({ url, method: 'GET', ...options }, cacheOptions);
};

// API service functions
const apiService = {
  // Shows
  getShows: async (params = {}) => {
    try {
      const response = await cachedGet('/shows', { params });
      const shows = response.data.shows || [];
      return shows;
    } catch (error) {
      console.error('Error fetching shows:', error);
      throw error;
    }
  },
  
  getShowById: async (id) => {
    try {
      const response = await cachedGet(`/shows/${id}`);
      const showData = response.data.shows || {};
      return showData;
    } catch (error) {
      console.error(`Error fetching show ${id}:`, error);
      throw error;
    }
  },
  
  // Episodes
  getEpisodes: async (params = {}) => {
    try {
      const response = await cachedGet('/episodes', { params });
      const episodes = response.data.episodes || [];
      return episodes;
    } catch (error) {
      console.error('Error fetching episodes:', error);
      throw error;
    }
  },
  
  getEpisodesByPersonId: async (personId, params = {}) => {
    try {
      // Set the credits_people parameter to the person's ID
      const queryParams = {
        ...params,
        credits_people: personId,
        range: params.range || 10,
      };
      const response = await cachedGet('/episodes', { params: queryParams });
      console.log(`Fetched ${response.data.episodes?.length || 0} episodes for person ${personId}`);
      return response.data.episodes || [];
    } catch (error) {
      console.error(`Error fetching episodes for person ${personId}:`, error);
      throw error;
    }
  },
  
  getEpisodeById: async (id) => {
    try {
      // Request multiple embedded entities using comma separated list
      const response = await cachedGet(`/episodes/${id}?embed=people,hosts,guests,shows`);
      const episodeData = response.data.episodes || {};
      
      // If the episode is part of a show but doesn't have people directly, get show hosts/guests
      if ((!episodeData._embedded || !episodeData._embedded.people) && episodeData._embedded && episodeData._embedded.shows) {
        try {
          // Get the first show ID
          const showId = episodeData._embedded.shows[0]?.id;
          if (showId) {
            const showResponse = await cachedGet(`/shows/${showId}?embed=hosts,people`);
            const showData = showResponse.data.shows || {};
            
            // Add show hosts/people to episode data if available
            if (showData._embedded && (showData._embedded.hosts || showData._embedded.people)) {
              if (!episodeData._embedded) episodeData._embedded = {};
              episodeData._embedded.people = [
                ...(showData._embedded.hosts || []),
                ...(showData._embedded.people || [])
              ];
              console.log(`Added ${episodeData._embedded.people.length} people from show data`);
            }
          }
        } catch (showError) {
          console.warn('Error getting show hosts:', showError);
        }
      }
      
      return episodeData;
    } catch (error) {
      console.error(`Error fetching episode ${id}:`, error);
      throw error;
    }
  },
  
  // Streams
  getStreams: async (params = {}) => {
    try {
      const response = await cachedGet('/streams', { params });
      const streams = response.data.streams || [];
      return streams;
    } catch (error) {
      console.error('Error fetching streams:', error);
      throw error;
    }
  },
  
  getStreamById: async (id) => {
    try {
      const response = await cachedGet(`/streams/${id}`);
      return response.data;
    } catch (error) {
      console.error(`Error fetching stream ${id}:`, error);
      throw error;
    }
  },
  
  // People
  getPeople: async (params = {}) => {
    try {
      const response = await cachedGet('/people', { params });
      // Debug the response structure
      console.log('People API response structure:', Object.keys(response.data));
      
      // The API returns an object with a 'people' property that contains the array
      if (response.data && Array.isArray(response.data.people)) {
        return response.data.people;
      }
      return [];
    } catch (error) {
      console.error('Error fetching people:', error);
      throw error;
    }
  },
  
  getPersonById: async (id) => {
    try {
      const response = await cachedGet(`/people/${id}`);
      return response.data;
    } catch (error) {
      console.error(`Error fetching person ${id}:`, error);
      throw error;
    }
  },
  
  // Posts (blog posts, transcripts)
  getPosts: async (params = {}) => {
    try {
      const response = await cachedGet('/posts', { params });
      return response.data.posts || [];
    } catch (error) {
      console.error('Error fetching posts:', error);
      throw error;
    }
  },
  
  // Categories
  getCategories: async (params = {}) => {
    try {
      const response = await cachedGet('/categories', { params });
      return response.data.categories || [];
    } catch (error) {
      console.error('Error fetching categories:', error);
      throw error;
    }
  },
  
  // Topics
  getTopics: async (params = {}) => {
    try {
      const response = await cachedGet('/topics', { params });
      return response.data.topics || [];
    } catch (error) {
      console.error('Error fetching topics:', error);
      throw error;
    }
  },
  
  // Clear all cached data
  clearCache: async () => {
    await cacheManager.clearAllCache();
    console.log('API cache cleared');
  }
};

export default apiService;
