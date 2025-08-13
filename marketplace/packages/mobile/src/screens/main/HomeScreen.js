import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  RefreshControl,
  FlatList,
  TouchableOpacity,
  Image,
  Dimensions,
} from 'react-native';
import {
  Text,
  Card,
  Chip,
  Searchbar,
  ActivityIndicator,
  FAB,
} from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useQuery } from '@tanstack/react-query';
import { productService } from '../../services/product.service';
import { CATEGORIES } from '../../config';

const { width } = Dimensions.get('window');

const HomeScreen = ({ navigation }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['products', selectedCategory],
    queryFn: () => productService.getProducts({ 
      category: selectedCategory,
      limit: 20,
    }),
  });

  const handleSearch = () => {
    if (searchQuery.trim()) {
      navigation.navigate('SearchMain', { query: searchQuery });
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const renderCategory = ({ item }) => (
    <TouchableOpacity
      style={styles.categoryItem}
      onPress={() => setSelectedCategory(item.id === selectedCategory ? null : item.id)}
    >
      <View style={[
        styles.categoryIcon,
        selectedCategory === item.id && styles.categoryIconActive
      ]}>
        <Icon 
          name={item.icon} 
          size={24} 
          color={selectedCategory === item.id ? '#fff' : '#6366f1'} 
        />
      </View>
      <Text style={styles.categoryText}>{item.name}</Text>
    </TouchableOpacity>
  );

  const renderProduct = ({ item }) => (
    <TouchableOpacity
      onPress={() => navigation.navigate('ProductDetail', { productId: item._id })}
      style={styles.productCard}
    >
      <Card>
        <Card.Cover 
          source={{ uri: item.images[0]?.url || 'https://via.placeholder.com/150' }}
          style={styles.productImage}
        />
        <Card.Content style={styles.productContent}>
          <Text style={styles.productTitle} numberOfLines={2}>
            {item.title}
          </Text>
          <Text style={styles.productPrice}>₹{item.price.toLocaleString()}</Text>
          <View style={styles.productMeta}>
            <Icon name="map-marker" size={14} color="#666" />
            <Text style={styles.productLocation}>{item.location?.city || 'Unknown'}</Text>
          </View>
        </Card.Content>
      </Card>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Marketplace</Text>
        <TouchableOpacity onPress={() => navigation.navigate('Messages')}>
          <Icon name="message-outline" size={24} color="#333" />
        </TouchableOpacity>
      </View>

      <Searchbar
        placeholder="Search products..."
        onChangeText={setSearchQuery}
        value={searchQuery}
        onSubmitEditing={handleSearch}
        style={styles.searchBar}
      />

      <View style={styles.categoriesContainer}>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={CATEGORIES}
          renderItem={renderCategory}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.categoriesList}
        />
      </View>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#6366f1" />
        </View>
      ) : (
        <FlatList
          data={data?.products || []}
          renderItem={renderProduct}
          keyExtractor={(item) => item._id}
          numColumns={2}
          columnWrapperStyle={styles.productRow}
          contentContainerStyle={styles.productList}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Icon name="package-variant" size={64} color="#ccc" />
              <Text style={styles.emptyText}>No products found</Text>
            </View>
          }
        />
      )}

      <FAB
        icon="plus"
        style={styles.fab}
        onPress={() => navigation.navigate('Sell')}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
    elevation: 2,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  searchBar: {
    margin: 16,
    elevation: 2,
  },
  categoriesContainer: {
    backgroundColor: '#fff',
    paddingVertical: 12,
  },
  categoriesList: {
    paddingHorizontal: 16,
  },
  categoryItem: {
    alignItems: 'center',
    marginRight: 20,
  },
  categoryIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#f0f0ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  categoryIconActive: {
    backgroundColor: '#6366f1',
  },
  categoryText: {
    fontSize: 12,
    color: '#666',
  },
  productList: {
    padding: 8,
  },
  productRow: {
    justifyContent: 'space-between',
  },
  productCard: {
    width: (width - 32) / 2,
    margin: 8,
  },
  productImage: {
    height: 150,
  },
  productContent: {
    padding: 8,
  },
  productTitle: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 4,
  },
  productPrice: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#6366f1',
    marginBottom: 4,
  },
  productMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  productLocation: {
    fontSize: 12,
    color: '#666',
    marginLeft: 4,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 100,
  },
  emptyText: {
    marginTop: 16,
    fontSize: 16,
    color: '#999',
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
    backgroundColor: '#6366f1',
  },
});

export default HomeScreen;
