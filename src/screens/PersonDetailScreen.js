import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Linking,
  SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import apiService from '../services/api';

const stripHtmlTags = (html) => {
  if (!html) return '';
  return html.replace(/<\/?[^>]+(>|$)/g, '');
};

const PersonDetailScreen = ({ route, navigation }) => {
  const { personId } = route.params;
  const [person, setPerson] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchPersonDetails();
  }, [personId]);

  const fetchPersonDetails = async () => {
    setLoading(true);
    try {
      const personData = await apiService.getPersonById(personId);
      setPerson(personData.people);
      
      // Set the screen title to the person's name
      if (personData.people && personData.people.label) {
        navigation.setOptions({ title: personData.people.label });
      }
    } catch (err) {
      console.error('Error fetching person details:', err);
      setError('Failed to load person details');
    } finally {
      setLoading(false);
    }
  };

  const handleRelatedLinkPress = (url) => {
    if (url) {
      Linking.openURL(url).catch(err => {
        console.error('Error opening URL:', err);
      });
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#f03e3e" />
        <Text style={styles.loadingText}>Loading person details...</Text>
      </View>
    );
  }

  if (error || !person) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle" size={50} color="#f03e3e" />
        <Text style={styles.errorText}>{error || 'Failed to load person'}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={fetchPersonDetails}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const imageUrl = person.picture?.derivatives?.twit_album_art_600x600 || 
                   person.picture?.url || 
                   null;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.contentContainer}>
        <View style={styles.headerContainer}>
          <View style={styles.imageContainer}>
            {imageUrl ? (
              <Image
                source={{ uri: imageUrl }}
                style={styles.personImage}
                resizeMode="contain"
              />
            ) : (
              <View style={styles.placeholderImage}>
                <Text style={styles.placeholderText}>
                  {person.label ? person.label.substring(0, 2).toUpperCase() : '?'}
                </Text>
              </View>
            )}
          </View>
          
          <View style={styles.headerInfo}>
            <Text style={styles.personName}>{person.label}</Text>
            {person.positionTitle && (
              <Text style={styles.personRole}>{person.positionTitle}</Text>
            )}
            {person.staff && (
              <View style={styles.staffBadge}>
                <Ionicons name="star" size={14} color="#fff" style={styles.staffIcon} />
                <Text style={styles.staffText}>TWiT Staff</Text>
              </View>
            )}
          </View>
        </View>

        {person.bio && (
          <View style={styles.sectionContainer}>
            <Text style={styles.sectionTitle}>Biography</Text>
            <Text style={styles.bioText}>{stripHtmlTags(person.bio)}</Text>
          </View>
        )}

        {person.relatedLinks && Array.isArray(person.relatedLinks) && person.relatedLinks.length > 0 && (
          <View style={styles.sectionContainer}>
            <Text style={styles.sectionTitle}>Related Links</Text>
            {person.relatedLinks.map((link, index) => (
              <TouchableOpacity 
                key={`link-${index}`}
                style={styles.linkButton}
                onPress={() => handleRelatedLinkPress(link.url)}
              >
                <Ionicons name="link" size={16} color="#f03e3e" />
                <Text style={styles.linkText}>{link.title || link.url}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  contentContainer: {
    padding: 16,
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
  headerContainer: {
    flexDirection: 'column',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  imageContainer: {
    width: 150,
    height: 150,
    borderRadius: 75,
    overflow: 'hidden',
    marginBottom: 16,
    borderWidth: 2,
    borderColor: '#e9ecef',
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
    fontSize: 48,
    fontWeight: 'bold',
    color: '#adb5bd',
  },
  headerInfo: {
    alignItems: 'center',
  },
  personName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#212529',
    textAlign: 'center',
    marginBottom: 4,
  },
  personRole: {
    fontSize: 16,
    color: '#6c757d',
    textAlign: 'center',
    marginBottom: 10,
  },
  staffBadge: {
    flexDirection: 'row',
    backgroundColor: '#f03e3e',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 12,
    alignItems: 'center',
  },
  staffIcon: {
    marginRight: 4,
  },
  staffText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 12,
  },
  sectionContainer: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#212529',
    marginBottom: 10,
  },
  bioText: {
    fontSize: 16,
    color: '#495057',
    lineHeight: 24,
  },
  linkButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  linkText: {
    fontSize: 16,
    color: '#f03e3e',
    marginLeft: 8,
  },
});

export default PersonDetailScreen;
