import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  SafeAreaView
} from 'react-native';
import apiService from '../services/api';
import SearchBar from '../components/SearchBar';
import ShowItem from '../components/ShowItem';
import EpisodeItem from '../components/EpisodeItem';
import ErrorView from '../components/ErrorView';
import { COLORS, SPACING, TYPOGRAPHY } from '../utils/theme';
import { stripHtmlAndDecodeEntities } from '../utils/textUtils';

const SearchScreen = ({ navigation }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState({
    shows: [],
    episodes: [],
    people: []
  });
  const [activeTab, setActiveTab] = useState('shows');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSearch = async (query) => {
    if (!query.trim()) {
      setSearchResults({ shows: [], episodes: [], people: [] });
      return;
    }

    setSearchQuery(query);
    setLoading(true);
    setError(null);

    try {
      // Build more comprehensive search params
      const searchParams = {
        // Support both label and description search
        'or[0][filter][label][operator]': 'CONTAINS',
        'or[0][filter][label][value]': query,
        'or[1][filter][description][operator]': 'CONTAINS',
        'or[1][filter][description][value]': query,
        // Include nested data for better display
        'embed': 'shows,people',
        'limit': 20
      };

      // Search shows with content searching
      const showsPromise = apiService.getShows({
        'or[0][filter][label][operator]': 'CONTAINS',
        'or[0][filter][label][value]': query,
        'or[1][filter][description][operator]': 'CONTAINS',
        'or[1][filter][description][value]': query,
        'limit': 15
      });
      
      // Search episodes with content searching
      const episodesPromise = apiService.getEpisodes({
        'or[0][filter][label][operator]': 'CONTAINS',
        'or[0][filter][label][value]': query,
        'or[1][filter][description][operator]': 'CONTAINS',
        'or[1][filter][description][value]': query,
        'or[2][filter][teaser][operator]': 'CONTAINS',
        'or[2][filter][teaser][value]': query,
        'embed': 'shows',
        'limit': 15
      });
      
      // Search people by name (label) and bio (description)
      const peoplePromise = apiService.getPeople({
        'or[0][filter][label][operator]': 'CONTAINS',
        'or[0][filter][label][value]': query,
        'or[1][filter][description][operator]': 'CONTAINS',
        'or[1][filter][description][value]': query,
        'or[2][filter][shortBio][operator]': 'CONTAINS', 
        'or[2][filter][shortBio][value]': query,
        'limit': 15
      });

      // Wait for all requests to complete
      const [shows, episodes, people] = await Promise.all([
        showsPromise,
        episodesPromise,
        peoplePromise
      ]);

      console.log(`Search results - Shows: ${shows?.length || 0}, Episodes: ${episodes?.length || 0}, People: ${people?.length || 0}`);

      setSearchResults({
        shows: shows || [],
        episodes: episodes || [],
        people: people || []
      });
    } catch (err) {
      setError('Failed to search. Please try again.');
      console.error('Error searching:', err);
    } finally {
      setLoading(false);
    }
  };

  const renderShowItem = ({ item }) => (
    <ShowItem 
      show={item} 
      onPress={() => navigation.navigate('ShowDetail', { 
        id: item.id, 
        title: stripHtmlAndDecodeEntities(item.label) || 'Show Details'
      })}
    />
  );

  const renderEpisodeItem = ({ item }) => {
    // Try to extract show ID from embedded data or directly from the item
    let showId = null;
    let showName = null;
    
    // Extract from embedded data
    if (item._embedded && item._embedded.shows) {
      const showData = item._embedded.shows;
      if (Array.isArray(showData) && showData.length > 0) {
        showId = showData[0].id;
        showName = stripHtmlAndDecodeEntities(showData[0].label) || showData[0].title;
      } else if (typeof showData === 'object' && showData.id) {
        showId = showData.id;
        showName = stripHtmlAndDecodeEntities(showData.label) || showData.title;
      }
    }
    
    // Try alternate embedded notation
    if (!showId && item.embedded && item.embedded.shows) {
      const showData = item.embedded.shows;
      if (Array.isArray(showData) && showData.length > 0) {
        showId = showData[0].id;
        showName = stripHtmlAndDecodeEntities(showData[0].label) || showData[0].title;
      } else if (typeof showData === 'object' && showData.id) {
        showId = showData.id;
        showName = stripHtmlAndDecodeEntities(showData.label) || showData.title;
      }
    }
    
    // Try direct show reference
    if (!showId && item.show && item.show.id) {
      showId = item.show.id;
      showName = stripHtmlAndDecodeEntities(item.show.label);
    }
    
    console.log(`Episode ${item.id}: ${stripHtmlAndDecodeEntities(item.label)} - Show ID: ${showId}, Show Name: ${showName}`);
    
    return (
      <EpisodeItem 
        episode={item} 
        onPress={() => navigation.navigate('EpisodeDetail', { 
          id: item.id, 
          title: stripHtmlAndDecodeEntities(item.label) || 'Episode Details',
          showId: showId,
          // Pass along any embedded data to avoid refetching
          initialEpisodeData: item
        })}
      />
    );
  };

  const renderPersonItem = ({ item }) => (
    <TouchableOpacity
      style={styles.personItem}
      onPress={() => {
        // Navigate to the PersonDetail screen instead of Episodes
        navigation.navigate('PersonDetail', { 
          id: item.id, 
          name: stripHtmlAndDecodeEntities(item.label) || 'Person Details',
          personData: item
        });
      }}
    >
      <Text style={styles.personName}>{stripHtmlAndDecodeEntities(item.label)}</Text>
      {item.role && <Text style={styles.personRole}>{stripHtmlAndDecodeEntities(item.role)}</Text>}
    </TouchableOpacity>
  );

  const renderContent = () => {
    if (loading) {
      return (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={COLORS.CTA} />
          <Text style={styles.loadingText}>Searching...</Text>
        </View>
      );
    }

    if (error) {
      return (
        <ErrorView 
          message={error} 
          onRetry={() => handleSearch(searchQuery)} 
        />
      );
    }

    if (!searchQuery) {
      return (
        <View style={styles.centerContainer}>
          <Text style={styles.emptyText}>Search for shows, episodes, or people</Text>
        </View>
      );
    }

    const currentResults = searchResults[activeTab] || [];

    if (currentResults.length === 0) {
      return (
        <View style={styles.centerContainer}>
          <Text style={styles.emptyText}>No {activeTab} found for "{searchQuery}"</Text>
        </View>
      );
    }

    return (
      <FlatList
        data={currentResults}
        renderItem={
          activeTab === 'shows' ? renderShowItem :
          activeTab === 'episodes' ? renderEpisodeItem :
          renderPersonItem
        }
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.listContent}
      />
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <SearchBar 
        onSearch={handleSearch} 
        placeholder="Search TWiT content..." 
      />
      
      <View style={styles.tabsContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'shows' && styles.activeTab]}
          onPress={() => setActiveTab('shows')}
        >
          <Text style={[styles.tabText, activeTab === 'shows' && styles.activeTabText]}>
            Shows ({searchResults.shows.length})
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.tab, activeTab === 'episodes' && styles.activeTab]}
          onPress={() => setActiveTab('episodes')}
        >
          <Text style={[styles.tabText, activeTab === 'episodes' && styles.activeTabText]}>
            Episodes ({searchResults.episodes.length})
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.tab, activeTab === 'people' && styles.activeTab]}
          onPress={() => setActiveTab('people')}
        >
          <Text style={[styles.tabText, activeTab === 'people' && styles.activeTabText]}>
            People ({searchResults.people.length})
          </Text>
        </TouchableOpacity>
      </View>
      
      {renderContent()}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.BACKGROUND,
  },
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: COLORS.CARD,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.BORDER,
  },
  tab: {
    flex: 1,
    paddingVertical: SPACING.SMALL + 4,
    alignItems: 'center',
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: COLORS.CTA,
  },
  tabText: {
    fontSize: TYPOGRAPHY.FONT_SIZE.MEDIUM,
    color: COLORS.TEXT_MEDIUM,
  },
  activeTabText: {
    color: COLORS.PRIMARY,
    fontWeight: 'bold',
  },
  listContent: {
    padding: SPACING.MEDIUM,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.MEDIUM,
  },
  loadingText: {
    marginTop: SPACING.SMALL + 4,
    fontSize: TYPOGRAPHY.FONT_SIZE.MEDIUM,
    color: COLORS.TEXT_MEDIUM,
  },
  emptyText: {
    fontSize: TYPOGRAPHY.FONT_SIZE.MEDIUM,
    color: COLORS.TEXT_MEDIUM,
    textAlign: 'center',
  },
  personItem: {
    backgroundColor: COLORS.CARD,
    borderRadius: 8,
    padding: SPACING.MEDIUM,
    marginBottom: SPACING.SMALL + 4,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.41,
  },
  personName: {
    fontSize: TYPOGRAPHY.FONT_SIZE.LARGE,
    fontWeight: 'bold',
    color: COLORS.TEXT_DARK,
    marginBottom: 4,
  },
  personRole: {
    fontSize: TYPOGRAPHY.FONT_SIZE.MEDIUM,
    color: COLORS.TEXT_MEDIUM,
  },
});

export default SearchScreen;
