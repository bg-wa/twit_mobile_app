import React, { useRef, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity, Platform } from 'react-native';
import { WebView } from 'react-native-webview';
import { COLORS, SPACING, TYPOGRAPHY } from '../utils/theme';

// Use the Google Calendar embed URL for best in-app rendering
// Default to Agenda (Schedule) view and hide extraneous chrome
// Ref: https://twit.tv/schedule
const CALENDAR_EMBED_URL =
  'https://calendar.google.com/calendar/embed?src=mg877fp19824mj30g497frm74o@group.calendar.google.com&ctz=America/Los_Angeles&mode=AGENDA&showPrint=0&showTabs=0&showDate=0&showTitle=0&showCalendars=0&wkst=1&hl=en';

const ScheduleScreen = () => {
  const webRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const handleReload = useCallback(() => {
    setError(null);
    setLoading(true);
    try {
      webRef.current?.reload();
    } catch (_) {
      // no-op
    }
  }, []);

  return (
    <View style={styles.container}>
      {error ? (
        <View style={styles.errorContainer}>
          <Text style={styles.errorTitle}>Failed to load schedule</Text>
          <Text style={styles.errorText}>Please check your connection and try again.</Text>
          <TouchableOpacity style={styles.retryButton} onPress={handleReload}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          {loading && (
            <View style={styles.loadingOverlay}>
              <ActivityIndicator size="large" color={COLORS.CTA} />
              <Text style={styles.loadingText}>Loading schedule…</Text>
            </View>
          )}
          <View style={styles.webContainer}>
            <WebView
              ref={webRef}
              source={{ uri: CALENDAR_EMBED_URL }}
              onLoadStart={() => {
                setError(null);
                setLoading(true);
              }}
              onLoadEnd={() => setLoading(false)}
              onError={(syntheticEvent) => {
                setLoading(false);
                setError(syntheticEvent?.nativeEvent?.description || 'Unknown error');
              }}
              startInLoadingState={false}
              javaScriptEnabled
              domStorageEnabled
              allowsBackForwardNavigationGestures
              originWhitelist={["*"]}
              pullToRefreshEnabled={Platform.OS === 'android'}
              showsVerticalScrollIndicator={false}
              showsHorizontalScrollIndicator={false}
              // Best-effort to hide/disable inner scrollbars
              injectedJavaScript={`(function(){
                try {
                  var css = '*{-ms-overflow-style:none;scrollbar-width:none}*::-webkit-scrollbar{display:none}';
                  var s = document.createElement('style'); s.type='text/css'; s.appendChild(document.createTextNode(css));
                  document.head.appendChild(s);
                  document.body.style.overflow='hidden';
                } catch(e) { /* no-op */ }
              })();`}
              style={styles.webView}
            />
          </View>
        </>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.BACKGROUND,
  },
  webContainer: {
    flex: 1,
    padding: SPACING.MEDIUM,
  },
  webView: {
    flex: 1,
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: COLORS.BACKGROUND,
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  loadingText: {
    marginTop: SPACING.SMALL + 4,
    fontSize: TYPOGRAPHY.FONT_SIZE.LARGE,
    color: COLORS.TEXT_MEDIUM,
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.LARGE,
  },
  errorTitle: {
    fontSize: TYPOGRAPHY.FONT_SIZE.X_LARGE,
    fontWeight: '700',
    color: COLORS.ERROR,
    marginBottom: SPACING.SMALL,
  },
  errorText: {
    fontSize: TYPOGRAPHY.FONT_SIZE.MEDIUM,
    color: COLORS.TEXT_MEDIUM,
    textAlign: 'center',
    marginBottom: SPACING.MEDIUM,
  },
  retryButton: {
    backgroundColor: COLORS.SECONDARY,
    paddingHorizontal: SPACING.MEDIUM,
    paddingVertical: SPACING.SMALL,
    borderRadius: 6,
  },
  retryButtonText: {
    color: COLORS.TEXT_LIGHT,
    fontSize: TYPOGRAPHY.FONT_SIZE.MEDIUM,
    fontWeight: '600',
  },
});

export default ScheduleScreen;
