import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// กำหนด URL และ Port 3111 ตามเครื่องของคุณ
const API_BASE_URL = 'http://119.59.102.161:3111/api';

interface Product {
  id: number;
  name: string;
  price: number;
  stock: number;
  image_url: string;
  details?: string;
}

export default function SearchScreen() {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/products`);
      const data = await res.json();
      if (Array.isArray(data)) {
        setProducts(data);
      }
    } catch (err) {
      console.error('Failed to fetch products for search:', err);
    } finally {
      setLoading(false);
    }
  };

  const showAlert = (title: string, msg: string) => {
    if (Platform.OS === 'web') {
      alert(`${title}\n${msg}`);
    } else {
      alert(`${title}: ${msg}`);
    }
  };

  // ฟังก์ชันกดเพิ่มสินค้าลงตะกร้า
  const handleAddToCart = async (product: Product) => {
    try {
      const existingCart = await AsyncStorage.getItem('cart');
      let cart = existingCart ? JSON.parse(existingCart) : [];

      cart.push({
        id: product.id,
        name: product.name,
        price: product.price,
        image: product.image_url,
        quantity: 1,
      });

      await AsyncStorage.setItem('cart', JSON.stringify(cart));
      showAlert('สำเร็จ', `เพิ่ม "${product.name}" ลงตะกร้าแล้ว`);
    } catch (err) {
      console.error('Error adding to cart:', err);
      showAlert('เกิดข้อผิดพลาด', 'ไม่สามารถเพิ่มสินค้าลงตะกร้าได้');
    }
  };

  const filteredProducts = products.filter((item) =>
    item.name.toLowerCase().includes(query.trim().toLowerCase())
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Header พร้อมปุ่มย้อนกลับ */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backBtnText}>⬅️ ย้อนกลับ</Text>
        </TouchableOpacity>
        <Text style={styles.title}>🔍 ค้นหาสินค้า</Text>
      </View>

      {/* ช่องกรอกคำค้นหา */}
      <TextInput
        style={styles.searchInput}
        placeholder="พิมพ์ชื่อสินค้าเพื่อค้นหา..."
        placeholderTextColor="#999"
        value={query}
        onChangeText={setQuery}
        autoFocus
      />

      <Text style={styles.resultText}>ผลการค้นหาสำหรับ: "{query}"</Text>

      {/* แสดงรายการสินค้า */}
      {loading ? (
        <ActivityIndicator size="large" color="#5C3D2E" style={{ marginTop: 20 }} />
      ) : (
        <FlatList
          data={filteredProducts}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={{ paddingBottom: 20 }}
          renderItem={({ item }) => (
            <View style={styles.productCard}>
              {item.image_url ? (
                <Image source={{ uri: item.image_url }} style={styles.productImg} />
              ) : (
                <View style={[styles.productImg, styles.noImg]}>
                  <Text style={{ color: '#999' }}>ไม่มีรูปภาพ</Text>
                </View>
              )}
              <View style={styles.productInfo}>
                <Text style={styles.productName}>{item.name}</Text>
                <Text style={styles.productPrice}>฿{item.price}</Text>
                <Text style={styles.productStock}>สต็อก: {item.stock} ชิ้น</Text>
              </View>

              {/* ปุ่มเพิ่มสินค้าลงตะกร้า */}
              <TouchableOpacity 
                style={styles.addToCartBtn} 
                onPress={() => handleAddToCart(item)}
              >
                <Text style={styles.addToCartText}>🛒 เพิ่ม</Text>
              </TouchableOpacity>
            </View>
          )}
          ListEmptyComponent={
            <Text style={styles.emptyText}>
              {query.trim() ? 'ไม่พบสินค้าที่ตรงกับคำค้นหา' : 'พิมพ์ชื่อสินค้าเพื่อเริ่มค้นหา'}
            </Text>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: '#FAF6F0' },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  backBtn: { marginRight: 12, paddingVertical: 6, paddingHorizontal: 12, backgroundColor: '#E8DCCF', borderRadius: 8 },
  backBtnText: { color: '#4A2E1D', fontWeight: 'bold' },
  title: { fontSize: 20, fontWeight: 'bold', color: '#4A2E1D' },
  searchInput: { backgroundColor: '#FFF', padding: 12, borderRadius: 8, borderWidth: 1, borderColor: '#DDD', fontSize: 15 },
  resultText: { color: '#666', marginTop: 10, marginBottom: 12 },
  productCard: { flexDirection: 'row', backgroundColor: '#FFF', borderRadius: 12, padding: 12, marginBottom: 10, borderWidth: 1, borderColor: '#E8DCCF', alignItems: 'center' },
  productImg: { width: 65, height: 65, borderRadius: 8, marginRight: 12 },
  noImg: { backgroundColor: '#EEE', justifyContent: 'center', alignItems: 'center' },
  productInfo: { flex: 1 },
  productName: { fontSize: 16, fontWeight: 'bold', color: '#4A2E1D' },
  productPrice: { fontSize: 14, color: '#2E8B57', fontWeight: 'bold', marginTop: 2 },
  productStock: { fontSize: 12, color: '#888', marginTop: 2 },
  addToCartBtn: {
    backgroundColor: '#5C3D2E',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addToCartText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  emptyText: { textAlign: 'center', color: '#999', marginTop: 40 },
});