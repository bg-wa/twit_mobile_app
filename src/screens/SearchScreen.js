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
      // Search shows by label (title)
      const showsPromise = apiService.getShows({ 'filter[label]': query });
      
      // Search episodes by label (title)
      const episodesPromise = apiService.getEpisodes({ 'filter[label]': query });
      
      // Search people by label (name)
      const peoplePromise = apiService.getPeople({ 'filter[label]': query });

      // Wait for all requests to complete
      const [shows, episodes, people] = await Promise.all([
        showsPromise,
        episodesPromise,
        peoplePromise
      ]);

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
        title: item.label || 'Show Details'
      })}
    />
  );

  const renderEpisodeItem = ({ item }) => (
    <EpisodeItem 
      episode={item} 
      onPress={() => navigation.navigate('EpisodeDetail', { 
        id: item.id, 
        title: item.label || 'Episode Details'
      })}
    />
  );

  const renderPersonItem = ({ item }) => (
    <TouchableOpacity
      style={styles.personItem}
      onPress={() => {
        // Navigate to person detail or show episodes with this person
        navigation.navigate('Episodes', { 
          filter: { 'filter[people]': item.id },
          title: `Episodes with ${item.label}`
        });
      }}
    >
      <Text style={styles.personName}>{item.label}</Text>
      {item.role && <Text style={styles.personRole}>{item.role}</Text>}
    </TouchableOpacity>
  );

  const renderContent = () => {
    if (loading) {
      return (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#ff0000" />
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
    backgroundColor: '#f5f5f5',
  },
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#eeeeee',
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: '#ff0000',
  },
  tabText: {
    fontSize: 14,
    color: '#666666',
  },
  activeTabText: {
    color: '#ff0000',
    fontWeight: 'bold',
  },
  listContent: {
    padding: 16,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666666',
  },
  emptyText: {
    fontSize: 16,
    color: '#666666',
    textAlign: 'center',
  },
  personItem: {
    backgroundColor: '#ffffff',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.41,
  },
  personName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333333',
    marginBottom: 4,
  },
  personRole: {
    fontSize: 14,
    color: '#666666',
  },
});

export default SearchScreen;
