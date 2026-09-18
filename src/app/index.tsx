import AsyncStorage from '@react-native-async-storage/async-storage';
import { Stack, router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Modal,
  Platform,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export interface Product {
  id: number;
  name: string;
  price: number;
  original_price?: number;
  stock?: number;
  image?: string;
  image_url?: string;
  priceTier?: string;
  details?: string;
}

const API_BASE_URL = 'http://119.59.102.161:3111/api';

// ฟังก์ชัน K-Means Clustering แบบ 3 Centroids (จัดกลุ่มช่วงราคา)
const clusterPricesLocally = (data: any[]) => {
  if (!data || data.length === 0) return [];
  const prices = data.map((item) => parseFloat(item.price || 0));

  let centroids = [
    Math.min(...prices),
    (Math.min(...prices) + Math.max(...prices)) / 2,
    Math.max(...prices),
  ];

  for (let iter = 0; iter < 5; iter++) {
    const clusters: number[][] = [[], [], []];
    prices.forEach((p) => {
      let minDist = Infinity;
      let clusterIndex = 0;
      centroids.forEach((c, idx) => {
        const dist = Math.abs(p - c);
        if (dist < minDist) {
          minDist = dist;
          clusterIndex = idx;
        }
      });
      clusters[clusterIndex].push(p);
    });

    centroids = clusters.map((c, idx) =>
      c.length > 0 ? c.reduce((a, b) => a + b, 0) / c.length : centroids[idx]
    );
  }

  const sortedCentroids = [...centroids].sort((a, b) => a - b);

  return data.map((item) => {
    const p = parseFloat(item.price || 0);
    const d0 = Math.abs(p - sortedCentroids[0]);
    const d1 = Math.abs(p - sortedCentroids[1]);
    const d2 = Math.abs(p - sortedCentroids[2]);

    let tier = 'ราคาประหยัด';
    if (d1 <= d0 && d1 <= d2) tier = 'ราคากลาง';
    else if (d2 <= d0 && d2 <= d1) tier = 'พรีเมียม';

    return {
      ...item,
      id: Number(item.id),
      price: Number(item.price),
      image: item.image_url || item.image || 'https://via.placeholder.com/150',
      priceTier: tier,
    };
  });
};

export default function HomeScreen() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [userRole, setUserRole] = useState<string>('user');

  // State เก็บสินค้าในตะกร้า
  const [cart, setCart] = useState<Product[]>([]);

  // Modal & Form States
  const [modalVisible, setModalVisible] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [stock, setStock] = useState('');
  const [imageUrl, setImageUrl] = useState('');

  // ฟังก์ชันแสดง Alert ที่รองรับทั้ง Mobile และ Web Browser
  const showAlert = (title: string, msg: string) => {
    if (Platform.OS === 'web') {
      alert(`${title}\n${msg}`);
    } else {
      Alert.alert(title, msg);
    }
  };

  const checkUserRole = async () => {
    try {
      const role = await AsyncStorage.getItem('userRole');
      setUserRole(role || 'user');
    } catch (err) {
      console.error('Error fetching user role:', err);
    }
  };

  // โหลดข้อมูลตะกร้าสินค้าจาก AsyncStorage (ใช้คีย์ 'cart' ให้ตรงกับหน้า cart.tsx)
  const loadCart = async () => {
    try {
      const storedCart = await AsyncStorage.getItem('cart');
      if (storedCart) {
        setCart(JSON.parse(storedCart));
      } else {
        setCart([]);
      }
    } catch (err) {
      console.error('Error loading cart:', err);
    }
  };

  const fetchProducts = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/products`);
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      if (Array.isArray(data)) {
        const clustered = clusterPricesLocally(data);
        setProducts(clustered);
      }
    } catch (err) {
      console.warn('Backend fetch error:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchProducts();
    loadCart();
  }, []);

  useFocusEffect(
    useCallback(() => {
      checkUserRole();
      fetchProducts();
      loadCart();
    }, [])
  );

  const onRefresh = () => {
    setRefreshing(true);
    checkUserRole();
    fetchProducts();
    loadCart();
  };

  // ฟังก์ชันสำหรับกดเพิ่มสินค้าเข้าตะกร้า (บันทึกลงคีย์ 'cart')
  const handleAddToCart = async (item: Product) => {
    const updatedCart = [...cart, item];
    setCart(updatedCart);

    try {
      // เซฟลง AsyncStorage ด้วยคีย์ 'cart' เพื่อให้หน้า /cart ดึงข้อมูลไปแสดงได้ถูกต้อง
      await AsyncStorage.setItem('cart', JSON.stringify(updatedCart));
    } catch (err) {
      console.error('Error saving cart:', err);
    }

    // แจ้งเตือนสินค้าที่เพิ่ม
    showAlert('สำเร็จ!', `เพิ่ม "${item.name}" ลงในตะกร้าเรียบร้อยแล้ว`);
  };

  const handleOpenAddModal = () => {
    setEditingId(null);
    setName('');
    setPrice('');
    setStock('');
    setImageUrl('');
    setModalVisible(true);
  };

  const handleOpenEditModal = (item: Product) => {
    setEditingId(item.id);
    setName(item.name);
    setPrice(String(item.price));
    setStock(String(item.stock ?? 0));
    setImageUrl(item.image_url || item.image || '');
    setModalVisible(true);
  };

  const handleSaveProduct = async () => {
    if (!name || !price) {
      showAlert('แจ้งเตือน', 'กรุณากรอกชื่อสินค้าและราคา');
      return;
    }

    const payload = {
      name,
      price: parseFloat(price),
      stock: parseInt(stock) || 0,
      image_url: imageUrl,
    };

    try {
      const isEdit = editingId !== null;
      const url = isEdit ? `${API_BASE_URL}/products/${editingId}` : `${API_BASE_URL}/products`;
      const method = isEdit ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method: method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        showAlert('สำเร็จ', isEdit ? 'แก้ไขสินค้าเรียบร้อย' : 'เพิ่มสินค้าสำเร็จ');
        setModalVisible(false);
        fetchProducts();
      } else {
        const data = await res.json();
        showAlert('เกิดข้อผิดพลาด', data.message || 'ไม่สามารถบันทึกข้อมูลได้');
      }
    } catch (err) {
      showAlert('ข้อผิดพลาด', 'ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Header Bar */}
      <View style={styles.header}>
        <Text style={styles.logoTitle}>🛍️ MILA Shop</Text>
        <View style={styles.navIcons}>
          <TouchableOpacity style={styles.iconBtn} onPress={() => router.push('/search')}>
            <Text style={{ fontSize: 18 }}>🔍</Text>
          </TouchableOpacity>

          {/* ปุ่มตะกร้าสินค้าแบบมี Badge นับจำนวนเรียลไทม์ */}
          <TouchableOpacity style={styles.iconBtn} onPress={() => router.push('/cart')}>
            <Text style={{ fontSize: 18 }}>🛒</Text>
            {cart.length > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{cart.length}</Text>
              </View>
            )}
          </TouchableOpacity>

          <TouchableOpacity style={styles.iconBtn} onPress={() => router.push('/login')}>
            <Text style={{ fontSize: 18 }}>👤</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Admin Bar */}
      {userRole === 'admin' && (
        <View style={styles.adminBar}>
          <TouchableOpacity style={styles.adminAddBtn} onPress={handleOpenAddModal}>
            <Text style={styles.adminAddTxt}>➕ เพิ่มสินค้าใหม่ (Admin)</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Content Area */}
      {loading ? (
        <ActivityIndicator size="large" color="#5C3D2E" style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={products}
          keyExtractor={(item) => String(item.id)}
          numColumns={2}
          columnWrapperStyle={styles.row}
          contentContainerStyle={{ padding: 12 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View style={styles.imgWrap}>
                <Image source={{ uri: item.image }} style={styles.cardImg} />
                {item.priceTier && (
                  <View style={styles.tierBadge}>
                    <Text style={styles.tierTxt}>{item.priceTier}</Text>
                  </View>
                )}
              </View>

              <Text style={styles.prodName} numberOfLines={2}>{item.name}</Text>
              <Text style={styles.price}>฿{item.price.toLocaleString()}</Text>
              <Text style={styles.stock}>สต็อก: {item.stock ?? 0} ชิ้น</Text>

              {/* Action Buttons */}
              <View style={styles.cardActions}>
                <TouchableOpacity
                  style={styles.cartBtn}
                  onPress={() => handleAddToCart(item)}
                >
                  <Text style={styles.cartBtnTxt}>ใส่ตะกร้า</Text>
                </TouchableOpacity>

                {userRole === 'admin' && (
                  <>
                    <TouchableOpacity
                      style={styles.editBtn}
                      onPress={() => handleOpenEditModal(item)}
                    >
                      <Text style={{ fontSize: 12 }}>✏️</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.deleteBtn}
                      onPress={() =>
                        router.push({
                          pathname: '/delete',
                          params: { id: item.id, name: item.name },
                        })
                      }
                    >
                      <Text style={{ fontSize: 12 }}>🗑️</Text>
                    </TouchableOpacity>
                  </>
                )}
              </View>
            </View>
          )}
        />
      )}

      {/* Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              {editingId ? 'Edit Product' : 'New Product'}
            </Text>

            <Text style={styles.label}>Product Name</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. White Sneakers"
              placeholderTextColor="#AAA"
              value={name}
              onChangeText={setName}
            />

            <Text style={styles.label}>Price (THB)</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. 1500"
              placeholderTextColor="#AAA"
              keyboardType="numeric"
              value={price}
              onChangeText={setPrice}
            />

            <Text style={styles.label}>Stock</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. 10"
              placeholderTextColor="#AAA"
              keyboardType="numeric"
              value={stock}
              onChangeText={setStock}
            />

            <Text style={styles.label}>Image URL (Optional)</Text>
            <TextInput
              style={styles.input}
              placeholder="https://"
              placeholderTextColor="#AAA"
              value={imageUrl}
              onChangeText={setImageUrl}
            />

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setModalVisible(false)}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.saveBtn} onPress={handleSaveProduct}>
                <Text style={styles.saveBtnText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAF6F0' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E8DCCF',
  },
  logoTitle: { fontSize: 20, fontWeight: 'bold', color: '#4A2E1D' },
  navIcons: { flexDirection: 'row', gap: 10 },
  iconBtn: { padding: 8, backgroundColor: '#F0EABE', borderRadius: 8, position: 'relative' },
  
  badge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#E53E3E',
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  badgeText: { color: '#FFF', fontSize: 10, fontWeight: 'bold' },

  adminBar: { padding: 12, backgroundColor: '#FFF' },
  adminAddBtn: { backgroundColor: '#2E8B57', padding: 10, borderRadius: 8, alignItems: 'center' },
  adminAddTxt: { color: '#FFF', fontWeight: 'bold' },
  row: { justifyContent: 'space-between', marginBottom: 12 },
  card: {
    backgroundColor: '#FFF',
    width: '48%',
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: '#E8DCCF',
  },
  imgWrap: { position: 'relative', width: '100%', height: 120, marginBottom: 8 },
  cardImg: { width: '100%', height: '100%', borderRadius: 8 },
  tierBadge: {
    position: 'absolute',
    bottom: 4,
    left: 4,
    backgroundColor: 'rgba(74, 46, 29, 0.85)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  tierTxt: { color: '#FFF', fontSize: 10, fontWeight: 'bold' },
  prodName: { fontSize: 13, fontWeight: 'bold', color: '#4A2E1D', height: 36 },
  price: { fontSize: 15, fontWeight: 'bold', color: '#2E8B57', marginVertical: 2 },
  stock: { fontSize: 11, color: '#666', marginBottom: 8 },
  cardActions: { flexDirection: 'row', gap: 4 },
  cartBtn: { flex: 1, backgroundColor: '#5C3D2E', paddingVertical: 6, borderRadius: 6, alignItems: 'center' },
  cartBtnTxt: { color: '#FFF', fontSize: 11, fontWeight: 'bold' },
  editBtn: { backgroundColor: '#FFF9C4', padding: 6, borderRadius: 6, justifyContent: 'center', alignItems: 'center' },
  deleteBtn: { backgroundColor: '#FFEBEE', padding: 6, borderRadius: 6, justifyContent: 'center', alignItems: 'center' },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '85%',
    maxWidth: 400,
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 20,
    elevation: 5,
  },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: '#1A1A1A', marginBottom: 16 },
  label: { fontSize: 12, fontWeight: '600', color: '#555', marginBottom: 4 },
  input: {
    backgroundColor: '#F9F9F9',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    padding: 10,
    fontSize: 14,
    marginBottom: 12,
  },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 12, marginTop: 8 },
  cancelBtn: { paddingVertical: 8, paddingHorizontal: 16 },
  cancelBtnText: { color: '#666', fontWeight: '500' },
  saveBtn: { backgroundColor: '#0F172A', paddingVertical: 8, paddingHorizontal: 20, borderRadius: 8 },
  saveBtnText: { color: '#FFF', fontWeight: 'bold' },
});