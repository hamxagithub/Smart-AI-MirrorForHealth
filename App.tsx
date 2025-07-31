/**
 * Moodify Mirror - AI-powered Smart Mirror for Wellness & Mental Health
 * @format
 */

import React from 'react';
import { StatusBar, StyleSheet, useColorScheme, View } from 'react-native';

import { GestureHandlerRootView } from 'react-native-gesture-handler';
import MoodifyMirrorApp from './src/MoodifyMirrorApp';

function App() {
  const isDarkMode = useColorScheme() === 'dark';

  return (
    <GestureHandlerRootView style={styles.container}>
      <View style={styles.container}>
        <StatusBar 
          barStyle={isDarkMode ? 'light-content' : 'dark-content'} 
          backgroundColor="transparent"
          translucent
        />
        <MoodifyMirrorApp/>
      </View>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

export default App;
