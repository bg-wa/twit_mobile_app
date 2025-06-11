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

// API service functions
const apiService = {
  // Shows
  getShows: async (params = {}) => {
    try {
      // Check if we're online
      const online = await cacheManager.isOnline();
      
      if (online) {
        // If online, fetch from API
        const response = await api.get('/shows', { params });
        const shows = response.data.shows || [];
        
        // Cache the results
        await cacheManager.saveToCache(cacheManager.CACHE_KEYS.SHOWS, shows);
        return shows;
      } else {
        // If offline, try to get from cache
        const cachedShows = await cacheManager.getFromCache(cacheManager.CACHE_KEYS.SHOWS);
        if (cachedShows) {
          console.log('Using cached shows data');
          return cachedShows;
        }
        throw new Error('No internet connection and no cached data available');
      }
    } catch (error) {
      console.error('Error fetching shows:', error);
      throw error;
    }
  },
  
  getShowById: async (id) => {
    try {
      const cacheKey = `${cacheManager.CACHE_KEYS.SHOW_DETAIL}${id}`;
      const online = await cacheManager.isOnline();
      
      if (online) {
        const response = await api.get(`/shows/${id}`);
        // Extract just the show object from response.data.shows
        const showData = response.data.shows || {};
        await cacheManager.saveToCache(cacheKey, showData);
        return showData;
      } else {
        const cachedShow = await cacheManager.getFromCache(cacheKey);
        if (cachedShow) {
          console.log(`Using cached data for show ${id}`);
          return cachedShow;
        }
        throw new Error('No internet connection and no cached data available');
      }
    } catch (error) {
      console.error(`Error fetching show ${id}:`, error);
      throw error;
    }
  },
  
  // Episodes
  getEpisodes: async (params = {}) => {
    try {
      const online = await cacheManager.isOnline();
      
      if (online) {
        const response = await api.get('/episodes', { params });
        const episodes = response.data.episodes || [];
        await cacheManager.saveToCache(cacheManager.CACHE_KEYS.EPISODES, episodes);
        return episodes;
      } else {
        const cachedEpisodes = await cacheManager.getFromCache(cacheManager.CACHE_KEYS.EPISODES);
        if (cachedEpisodes) {
          console.log('Using cached episodes data');
          return cachedEpisodes;
        }
        throw new Error('No internet connection and no cached data available');
      }
    } catch (error) {
      console.error('Error fetching episodes:', error);
      throw error;
    }
  },
  
  getEpisodesByPersonId: async (personId, params = {}) => {
    try {
      const online = await cacheManager.isOnline();
      
      if (online) {
        // Set the credits_people parameter to the person's ID
        const queryParams = {
          ...params,
          credits_people: personId,
          // Limit to a reasonable number of episodes
          range: params.range || 10
        };
        
        const response = await api.get('/episodes', { params: queryParams });
        console.log(`Fetched ${response.data.episodes?.length || 0} episodes for person ${personId}`);
        return response.data.episodes || [];
      } else {
        // We could implement caching for person's episodes here if needed
        throw new Error('Cannot fetch person episodes while offline');
      }
    } catch (error) {
      console.error(`Error fetching episodes for person ${personId}:`, error);
      throw error;
    }
  },
  
  getEpisodeById: async (id) => {
    try {
      const cacheKey = `${cacheManager.CACHE_KEYS.EPISODE_DETAIL}${id}`;
      const online = await cacheManager.isOnline();
      
      if (online) {
        // Request multiple embedded entities using comma separated list
        const response = await api.get(`/episodes/${id}?embed=people,hosts,guests,shows`);
        const episodeData = response.data.episodes || {};
        
        // If the episode is part of a show but doesn't have people directly, get show hosts/guests
        if ((!episodeData._embedded || !episodeData._embedded.people) && episodeData._embedded && episodeData._embedded.shows) {
          try {
            // Get the first show ID
            const showId = episodeData._embedded.shows[0]?.id;
            if (showId) {
              const showResponse = await api.get(`/shows/${showId}?embed=hosts,people`);
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
        
        await cacheManager.saveToCache(cacheKey, episodeData);
        return episodeData;
      } else {
        const cachedEpisode = await cacheManager.getFromCache(cacheKey);
        if (cachedEpisode) {
          console.log(`Using cached data for episode ${id}`);
          return cachedEpisode;
        }
        throw new Error('No internet connection and no cached data available');
      }
    } catch (error) {
      console.error(`Error fetching episode ${id}:`, error);
      throw error;
    }
  },
  
  // Streams
  getStreams: async (params = {}) => {
    try {
      const online = await cacheManager.isOnline();
      
      if (online) {
        const response = await api.get('/streams', { params });
        const streams = response.data.streams || [];
        await cacheManager.saveToCache(cacheManager.CACHE_KEYS.STREAMS, streams);
        return streams;
      } else {
        const cachedStreams = await cacheManager.getFromCache(cacheManager.CACHE_KEYS.STREAMS);
        if (cachedStreams) {
          console.log('Using cached streams data');
          return cachedStreams;
        }
        throw new Error('No internet connection and no cached data available');
      }
    } catch (error) {
      console.error('Error fetching streams:', error);
      throw error;
    }
  },
  
  getStreamById: async (id) => {
    try {
      // Streams should always be fetched fresh if possible since they're live content
      const online = await cacheManager.isOnline();
      
      if (online) {
        const response = await api.get(`/streams/${id}`);
        return response.data;
      } else {
        throw new Error('Cannot fetch live stream details while offline');
      }
    } catch (error) {
      console.error(`Error fetching stream ${id}:`, error);
      throw error;
    }
  },
  
  // People
  getPeople: async (params = {}) => {
    try {
      const online = await cacheManager.isOnline();
      
      if (online) {
        const response = await api.get('/people', { params });
        
        // Debug the response structure
        console.log('People API response structure:', Object.keys(response.data));
        
        // The API returns an object with a 'people' property that contains the array
        if (response.data && Array.isArray(response.data.people)) {
          return response.data.people;
        }
        return [];
      } else {
        // People data is less critical, so we don't cache it by default
        throw new Error('Cannot fetch people while offline');
      }
    } catch (error) {
      console.error('Error fetching people:', error);
      throw error;
    }
  },
  
  getPersonById: async (id) => {
    try {
      const online = await cacheManager.isOnline();
      
      if (online) {
        const response = await api.get(`/people/${id}`);
        return response.data;
      } else {
        throw new Error('Cannot fetch person details while offline');
      }
    } catch (error) {
      console.error(`Error fetching person ${id}:`, error);
      throw error;
    }
  },
  
  // Posts (blog posts, transcripts)
  getPosts: async (params = {}) => {
    try {
      const online = await cacheManager.isOnline();
      
      if (online) {
        const response = await api.get('/posts', { params });
        return response.data.posts || [];
      } else {
        throw new Error('Cannot fetch posts while offline');
      }
    } catch (error) {
      console.error('Error fetching posts:', error);
      throw error;
    }
  },
  
  // Categories
  getCategories: async (params = {}) => {
    try {
      const online = await cacheManager.isOnline();
      
      if (online) {
        const response = await api.get('/categories', { params });
        return response.data.categories || [];
      } else {
        throw new Error('Cannot fetch categories while offline');
      }
    } catch (error) {
      console.error('Error fetching categories:', error);
      throw error;
    }
  },
  
  // Topics
  getTopics: async (params = {}) => {
    try {
      const online = await cacheManager.isOnline();
      
      if (online) {
        const response = await api.get('/topics', { params });
        return response.data.topics || [];
      } else {
        throw new Error('Cannot fetch topics while offline');
      }
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
