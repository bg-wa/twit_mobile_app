import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import apiService from '../services/api';

const PeopleScreen = ({ navigation }) => {
  const [people, setPeople] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [filterStaff, setFilterStaff] = useState(null); // null = all, true = staff only, false = non-staff

  useEffect(() => {
    fetchPeople();
  }, [filterStaff]);

  const fetchPeople = async () => {
    setLoading(true);
    setError(null);
    try {
      // Prepare filter params based on filterStaff state
      const params = {};
      if (filterStaff !== null) {
        params.twit_staff = filterStaff ? 1 : 0;
      }
      
      // The people data is directly returned from the API service
      const peopleData = await apiService.getPeople(params);
      setPeople(peopleData);
      
      // Add debug logging
      console.log(`Loaded ${peopleData.length} people`);
    } catch (err) {
      console.error('Error fetching people:', err);
      setError('Failed to load people. Please try again later.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchPeople();
  };

  const navigateToPersonDetail = (person) => {
    navigation.navigate('PersonDetail', { personId: person.id });
  };

  const getInitials = (name) => {
    if (!name) return '?';
    return name
      .split(' ')
      .map(part => part[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };

  const renderPersonItem = ({ item }) => {
    const imageUrl = item.picture?.derivatives?.twit_album_art_300x300 || 
                     item.picture?.url || 
                     null;
    
    return (
      <TouchableOpacity 
        style={styles.personCard}
        onPress={() => navigateToPersonDetail(item)}
      >
        <View style={styles.imageContainer}>
          {imageUrl ? (
            <Image
              source={{ uri: imageUrl }}
              style={styles.personImage}
              resizeMode="cover"
            />
          ) : (
            <View style={styles.placeholderImage}>
              <Text style={styles.placeholderText}>{getInitials(item.label)}</Text>
            </View>
          )}
          {item.staff && (
            <View style={styles.staffBadge}>
              <Ionicons name="star" size={12} color="#fff" />
            </View>
          )}
        </View>
        <View style={styles.personInfo}>
          <Text style={styles.personName} numberOfLines={1}>{item.label}</Text>
          {item.positionTitle && (
            <Text style={styles.personRole} numberOfLines={2}>{item.positionTitle}</Text>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  const renderFilterButtons = () => (
    <View style={styles.filterContainer}>
      <TouchableOpacity 
        style={[
          styles.filterButton, 
          filterStaff === null && styles.activeFilter
        ]}
        onPress={() => setFilterStaff(null)}
      >
        <Text style={[
          styles.filterText,
          filterStaff === null && styles.activeFilterText
        ]}>All</Text>
      </TouchableOpacity>
      <TouchableOpacity 
        style={[
          styles.filterButton, 
          filterStaff === true && styles.activeFilter
        ]}
        onPress={() => setFilterStaff(true)}
      >
        <Text style={[
          styles.filterText,
          filterStaff === true && styles.activeFilterText
        ]}>TWiT Staff</Text>
      </TouchableOpacity>
      <TouchableOpacity 
        style={[
          styles.filterButton, 
          filterStaff === false && styles.activeFilter
        ]}
        onPress={() => setFilterStaff(false)}
      >
        <Text style={[
          styles.filterText,
          filterStaff === false && styles.activeFilterText
        ]}>Guests</Text>
      </TouchableOpacity>
    </View>
  );

  if (loading && !refreshing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#f03e3e" />
        <Text style={styles.loadingText}>Loading people...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle" size={50} color="#f03e3e" />
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={fetchPeople}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {renderFilterButtons()}
      <FlatList
        data={people}
        renderItem={renderPersonItem}
        keyExtractor={(item) => item.id.toString()}
        numColumns={2}
        contentContainerStyle={styles.listContent}
        refreshing={refreshing}
        onRefresh={handleRefresh}
        ListEmptyComponent={() => (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No people found</Text>
          </View>
        )}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#343a40',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    padding: 20,
  },
  errorText: {
    marginVertical: 10,
    fontSize: 16,
    color: '#343a40',
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: '#f03e3e',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 5,
    marginTop: 10,
  },
  retryButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  listContent: {
    padding: 10,
  },
  personCard: {
    flex: 1,
    margin: 6,
    backgroundColor: 'white',
    borderRadius: 8,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    maxWidth: '48%',
  },
  imageContainer: {
    aspectRatio: 1,
    position: 'relative',
  },
  personImage: {
    width: '100%',
    height: '100%',
  },
  placeholderImage: {
    width: '100%',
    height: '100%',
    backgroundColor: '#e9ecef',
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#adb5bd',
  },
  staffBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: '#f03e3e',
    borderRadius: 12,
    padding: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  personInfo: {
    padding: 10,
  },
  personName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#212529',
    marginBottom: 4,
  },
  personRole: {
    fontSize: 12,
    color: '#6c757d',
  },
  emptyContainer: {
    padding: 30,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#6c757d',
  },
  filterContainer: {
    flexDirection: 'row',
    padding: 10,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  filterButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginHorizontal: 4,
    borderRadius: 20,
    backgroundColor: '#f1f3f5',
  },
  activeFilter: {
    backgroundColor: '#f03e3e',
  },
  filterText: {
    fontSize: 14,
    color: '#495057',
  },
  activeFilterText: {
    color: 'white',
    fontWeight: 'bold',
  },
});

export default PeopleScreen;
