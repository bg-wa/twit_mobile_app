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
import { COLORS, SPACING, TYPOGRAPHY } from '../utils/theme';

const PeopleScreen = ({ navigation }) => {
  const [people, setPeople] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [filterStaff, setFilterStaff] = useState(true); // Default to staff only (true = staff only)

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
        style={styles.personItem}
        onPress={() => navigateToPersonDetail(item)}
      >
        <View style={styles.personImageContainer}>
          {imageUrl ? (
            <Image
              source={{ uri: imageUrl }}
              style={styles.personImage}
              resizeMode="cover"
            />
          ) : (
            <View style={styles.personPlaceholder}>
              <Text style={styles.personPlaceholderText}>{getInitials(item.label)}</Text>
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
          filterStaff === null && styles.filterButtonActive
        ]}
        onPress={() => setFilterStaff(null)}
      >
        <Text style={[
          styles.filterButtonText,
          filterStaff === null && styles.filterButtonTextActive
        ]}>All</Text>
      </TouchableOpacity>
      <TouchableOpacity 
        style={[
          styles.filterButton, 
          filterStaff === true && styles.filterButtonActive
        ]}
        onPress={() => setFilterStaff(true)}
      >
        <Text style={[
          styles.filterButtonText,
          filterStaff === true && styles.filterButtonTextActive
        ]}>TWiT Staff</Text>
      </TouchableOpacity>
      <TouchableOpacity 
        style={[
          styles.filterButton, 
          filterStaff === false && styles.filterButtonActive
        ]}
        onPress={() => setFilterStaff(false)}
      >
        <Text style={[
          styles.filterButtonText,
          filterStaff === false && styles.filterButtonTextActive
        ]}>Guests</Text>
      </TouchableOpacity>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.CTA} />
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
        contentContainerStyle={styles.peopleGrid}
        refreshing={refreshing}
        onRefresh={handleRefresh}
        ListEmptyComponent={() => (
          <View style={styles.noResultsContainer}>
            <Text style={styles.noResultsText}>No people found</Text>
          </View>
        )}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.BACKGROUND,
  },
  filterContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.MEDIUM,
    paddingVertical: SPACING.SMALL,
    backgroundColor: COLORS.CARD,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.BORDER,
  },
  filterButton: {
    paddingVertical: SPACING.SMALL,
    paddingHorizontal: SPACING.MEDIUM,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.BORDER,
  },
  filterButtonActive: {
    backgroundColor: COLORS.PRIMARY,
    borderColor: COLORS.PRIMARY,
  },
  filterButtonText: {
    fontSize: TYPOGRAPHY.FONT_SIZE.MEDIUM,
    color: COLORS.TEXT_MEDIUM,
  },
  filterButtonTextActive: {
    color: COLORS.TEXT_LIGHT,
    fontWeight: '600',
  },
  peopleGrid: {
    paddingHorizontal: SPACING.SMALL,
    paddingTop: SPACING.SMALL,
  },
  personItem: {
    backgroundColor: COLORS.CARD,
    borderRadius: 8,
    overflow: 'hidden',
    margin: SPACING.SMALL,
    width: '46%',
    borderWidth: 1,
    borderColor: COLORS.BORDER,
    alignItems: 'center',
  },
  personImageContainer: {
    width: '100%',
    height: 120,
  },
  personImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  personPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: COLORS.PRIMARY_LIGHT,
    justifyContent: 'center',
    alignItems: 'center',
  },
  personPlaceholderText: {
    fontSize: TYPOGRAPHY.FONT_SIZE.XX_LARGE,
    color: COLORS.TEXT_LIGHT,
    fontWeight: 'bold',
  },
  personInfo: {
    padding: SPACING.MEDIUM,
    alignItems: 'center',
  },
  personName: {
    fontSize: TYPOGRAPHY.FONT_SIZE.MEDIUM,
    fontWeight: '600',
    color: COLORS.TEXT_DARK,
    textAlign: 'center',
    marginBottom: 2,
  },
  personRole: {
    fontSize: TYPOGRAPHY.FONT_SIZE.SMALL,
    color: COLORS.TEXT_MEDIUM,
    textAlign: 'center',
    marginBottom: SPACING.SMALL,
  },
  staffBadge: {
    position: 'absolute',
    bottom: 5,
    right: 5,
    backgroundColor: COLORS.CTA,
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  staffText: {
    fontSize: TYPOGRAPHY.FONT_SIZE.SMALL,
    color: COLORS.TEXT_LIGHT,
    fontWeight: '500',
    marginLeft: 2,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.BACKGROUND,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.BACKGROUND,
    padding: SPACING.LARGE,
  },
  errorText: {
    fontSize: TYPOGRAPHY.FONT_SIZE.MEDIUM,
    color: COLORS.ERROR,
    textAlign: 'center',
    marginBottom: SPACING.MEDIUM,
  },
  retryButton: {
    backgroundColor: COLORS.SECONDARY,
    paddingHorizontal: SPACING.MEDIUM,
    paddingVertical: SPACING.SMALL,
    borderRadius: 5,
  },
  retryButtonText: {
    color: COLORS.TEXT_LIGHT,
    fontSize: TYPOGRAPHY.FONT_SIZE.MEDIUM,
    fontWeight: '600',
  },
  noResultsContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.LARGE,
  },
  noResultsText: {
    fontSize: TYPOGRAPHY.FONT_SIZE.LARGE,
    color: COLORS.TEXT_MEDIUM,
    textAlign: 'center',
  },
});

export default PeopleScreen;
