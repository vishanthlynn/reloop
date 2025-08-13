import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

const OrderDetailScreen = () => {
  return (
    <View style={styles.container}>
      <Text>Order Detail Screen</Text>
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

export default OrderDetailScreen;
