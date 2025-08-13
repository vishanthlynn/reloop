import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

const CreateListingScreen = () => {
  return (
    <View style={styles.container}>
      <Text>Create Listing Screen</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default CreateListingScreen;
