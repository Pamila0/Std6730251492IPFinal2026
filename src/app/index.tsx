import AsyncStorage from '@react-native-async-storage/async-storage';
import { Stack, router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
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
  Pamila_Emp_ID?: string;
  Pamila_Name?: string;
  Pamila_Position?: string;
  Pamila_Department?: string;
  Pamila_BaseSalary?: number;
  Pamila_Bonus?: number;
  Pamila_NetSalary?: number;
}

const API_BASE_URL = 'http://119.59.102.161:3111/api';

const clusterPricesLocally = (data: any[]) => {
  if (!data || data.length === 0) return [];
  const prices = data.map((item) => parseFloat(item.Pamila_BaseSalary || item.price || 0));

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

  return data.map((item, index) => {
    const base = parseFloat(item.Pamila_BaseSalary || item.price || 0);
    const bonus = parseFloat(item.Pamila_Bonus || item.stock || 0);
    const net = base + bonus;

    const d0 = Math.abs(base - sortedCentroids[0]);
    const d1 = Math.abs(base - sortedCentroids[1]);
    const d2 = Math.abs(base - sortedCentroids[2]);

    let tier = 'Operational Level';
    if (d1 <= d0 && d1 <= d2) tier = 'Senior Level';
    else if (d2 <= d0 && d2 <= d1) tier = 'Executive Level';

    return {
      ...item,
      id: Number(item.id || item.Pamila_ID || index + 1),
      name: item.Pamila_Name || item.name || 'พนักงาน',
      price: base,
      stock: bonus,
      priceTier: tier,
      Pamila_Emp_ID: item.Pamila_Emp_ID || `EMP0${index + 1}`,
      Pamila_Name: item.Pamila_Name || item.name || 'N/A',
      Pamila_Position: item.Pamila_Position || item.position || 'Staff',
      Pamila_Department: item.Pamila_Department || item.department || 'General',
      Pamila_BaseSalary: base,
      Pamila_Bonus: bonus,
      Pamila_NetSalary: item.Pamila_NetSalary ? parseFloat(item.Pamila_NetSalary) : net,
    };
  });
};

export default function HomeScreen() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [userRole, setUserRole] = useState<string>('user');

  const [modalVisible, setModalVisible] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [name, setName] = useState('');
  const [position, setPosition] = useState('');
  const [price, setPrice] = useState('');
  const [stock, setStock] = useState('');

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
      setUserRole(role || 'admin');
    } catch (err) {
      console.error('Error fetching user role:', err);
    }
  };

  const fetchProducts = async () => {
    try {
      let res = await fetch(`${API_BASE_URL}/products`);
      if (!res.ok) {
        res = await fetch(`${API_BASE_URL}/employees`);
      }
      const data = await res.json();
      if (Array.isArray(data)) {
        const clustered = clusterPricesLocally(data);
        setProducts(clustered);
      }
    } catch (err) {
      console.warn('Backend fetch error, using local storage cache if available');
      try {
        const cached = await AsyncStorage.getItem('local_employees');
        if (cached) {
          setProducts(JSON.parse(cached));
        }
      } catch (e) {
        console.error(e);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  useFocusEffect(
    useCallback(() => {
      checkUserRole();
      fetchProducts();
    }, [])
  );

  const onRefresh = () => {
    setRefreshing(true);
    checkUserRole();
    fetchProducts();
  };

  const handleOpenAddModal = () => {
    setEditingId(null);
    setName('');
    setPosition('');
    setPrice('');
    setStock('');
    setModalVisible(true);
  };

  const handleOpenEditModal = (item: Product) => {
    setEditingId(item.id);
    setName(item.Pamila_Name || item.name);
    setPosition(item.Pamila_Position || 'Staff');
    setPrice(String(item.Pamila_BaseSalary || item.price));
    setStock(String(item.Pamila_Bonus ?? 0));
    setModalVisible(true);
  };

  const handleSaveProduct = async () => {
    if (!name || !price) {
      showAlert('แจ้งเตือน', 'กรุณากรอกชื่อพนักงานและเงินเดือน');
      return;
    }

    const baseVal = parseFloat(price) || 0;
    const bonusVal = parseFloat(stock) || 0;

    // ส่งฟิลด์ให้ตรงกับที่ Backend และฐานข้อมูล (Prefix Pamila_)
    const payload = {
      Pamila_Emp_ID: `EMP0${products.length + 1}`,
      Pamila_Name: name,
      Pamila_Position: position || 'Staff',
      Pamila_Department: 'General',
      Pamila_BaseSalary: baseVal,
      Pamila_Bonus: bonusVal,
      name: name,
      price: baseVal,
      stock: bonusVal,
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
        showAlert('สำเร็จ', isEdit ? 'แก้ไขข้อมูลเรียบร้อย' : 'เพิ่มข้อมูลสำเร็จ');
        setModalVisible(false);
        fetchProducts();
      } else {
        throw new Error('Save error');
      }
    } catch (err) {
      // กรณี API มีปัญหา บันทึกลง AsyncStorage เพื่อให้ข้อมูลไม่หายเวลา Refresh
      const isEdit = editingId !== null;
      const newEmp: Product = {
        id: isEdit && editingId ? editingId : Date.now(),
        name,
        price: baseVal,
        stock: bonusVal,
        Pamila_Emp_ID: `EMP0${products.length + 1}`,
        Pamila_Name: name,
        Pamila_Position: position || 'Staff',
        Pamila_Department: 'General',
        Pamila_BaseSalary: baseVal,
        Pamila_Bonus: bonusVal,
        Pamila_NetSalary: baseVal + bonusVal,
      };

      let updatedList = [];
      if (isEdit) {
        updatedList = products.map((p) => (p.id === editingId ? newEmp : p));
      } else {
        updatedList = [newEmp, ...products];
      }

      setProducts(updatedList);
      await AsyncStorage.setItem('local_employees', JSON.stringify(updatedList));

      showAlert('สำเร็จ (Offline Mode)', isEdit ? 'แก้ไขข้อมูลเรียบร้อยแล้ว' : 'เพิ่มข้อมูลสำเร็จแล้ว');
      setModalVisible(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Header Bar */}
      <View style={styles.header}>
        <Text style={styles.logoTitle}>📊 HR Manager & Salary Analytics</Text>
        <View style={styles.navIcons}>
          <TouchableOpacity style={styles.iconBtn} onPress={() => router.push('/search')}>
            <Text style={{ fontSize: 18 }}>🔍</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.iconBtn} onPress={() => router.push('/login')}>
            <Text style={{ fontSize: 18 }}>👤</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Admin Bar */}
      {(userRole === 'admin' || userRole === 'user') && (
        <View style={styles.adminBar}>
          <TouchableOpacity style={styles.adminAddBtn} onPress={handleOpenAddModal}>
            <Text style={styles.adminAddTxt}>➕ เพิ่มชื่อพนักงาน</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.adminDashboardBtn}
            onPress={() => router.push('/dashboard')}
          >
            <Text style={styles.adminDashboardTxt}>📊 ดู Dashboard</Text>
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
          contentContainerStyle={{ padding: 12 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View style={styles.cardHeaderRow}>
                <Text style={styles.empIdTag}>{item.Pamila_Emp_ID || 'EMP001'}</Text>
                {item.priceTier && (
                  <View style={styles.tierBadge}>
                    <Text style={styles.tierTxt}>{item.priceTier}</Text>
                  </View>
                )}
              </View>

              <Text style={styles.prodName}>{item.Pamila_Name || item.name}</Text>
              <Text style={styles.positionText}>ตำแหน่ง: {item.Pamila_Position || 'Staff'}</Text>
              <Text style={styles.price}>Net Salary: ฿{(item.Pamila_NetSalary || (item.Pamila_BaseSalary! + item.Pamila_Bonus!)).toLocaleString()}</Text>
              <Text style={styles.stock}>แผนก: {item.Pamila_Department || 'General'}</Text>

              {/* Action Buttons */}
              <View style={styles.cardActions}>
                <TouchableOpacity
                  style={styles.editBtn}
                  onPress={() => handleOpenEditModal(item)}
                >
                  <Text style={styles.actionBtnTxt}>✏️ แก้ไข</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.deleteBtn}
                  onPress={() =>
                    router.push({
                      pathname: '/delete',
                      params: { id: item.id, name: item.Pamila_Name || item.name },
                    })
                  }
                >
                  <Text style={styles.actionBtnTxt}>🗑️ ลบ</Text>
                </TouchableOpacity>
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
              {editingId ? 'แก้ไขข้อมูลพนักงาน' : 'เพิ่มชื่อพนักงาน'}
            </Text>

            <Text style={styles.label}>ชื่อ - นามสกุล พนักงาน</Text>
            <TextInput
              style={styles.input}
              placeholder="เช่น Somchai Jaidee"
              placeholderTextColor="#AAA"
              value={name}
              onChangeText={setName}
            />

            <Text style={styles.label}>ตำแหน่ง (Position)</Text>
            <TextInput
              style={styles.input}
              placeholder="เช่น HR Manager, Developer"
              placeholderTextColor="#AAA"
              value={position}
              onChangeText={setPosition}
            />

            <Text style={styles.label}>ฐานเงินเดือน (Base Salary)</Text>
            <TextInput
              style={styles.input}
              placeholder="เช่น 35000"
              placeholderTextColor="#AAA"
              keyboardType="numeric"
              value={price}
              onChangeText={setPrice}
            />

            <Text style={styles.label}>โบนัส / ค่าตอบแทนพิเศษ</Text>
            <TextInput
              style={styles.input}
              placeholder="เช่น 5000"
              placeholderTextColor="#AAA"
              keyboardType="numeric"
              value={stock}
              onChangeText={setStock}
            />

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setModalVisible(false)}
              >
                <Text style={styles.cancelBtnText}>ยกเลิก</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.saveBtn} onPress={handleSaveProduct}>
                <Text style={styles.saveBtnText}>บันทึก</Text>
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
  logoTitle: { fontSize: 16, fontWeight: 'bold', color: '#4A2E1D' },
  navIcons: { flexDirection: 'row', gap: 10 },
  iconBtn: { padding: 8, backgroundColor: '#F0EABE', borderRadius: 8, position: 'relative' },

  adminBar: { flexDirection: 'row', gap: 10, padding: 12, backgroundColor: '#FFF' },
  adminAddBtn: { flex: 1, backgroundColor: '#2E8B57', padding: 10, borderRadius: 8, alignItems: 'center' },
  adminAddTxt: { color: '#FFF', fontWeight: 'bold' },
  adminDashboardBtn: { flex: 1, backgroundColor: '#4A2E1D', padding: 10, borderRadius: 8, alignItems: 'center' },
  adminDashboardTxt: { color: '#FFF', fontWeight: 'bold' },

  card: {
    backgroundColor: '#FFF',
    width: '100%',
    borderRadius: 10,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E8DCCF',
  },
  cardHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  empIdTag: { fontSize: 12, fontWeight: 'bold', color: '#777' },
  tierBadge: {
    backgroundColor: 'rgba(74, 46, 29, 0.85)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  tierTxt: { color: '#FFF', fontSize: 10, fontWeight: 'bold' },
  prodName: { fontSize: 16, fontWeight: 'bold', color: '#4A2E1D', marginBottom: 2 },
  positionText: { fontSize: 13, color: '#555', marginBottom: 4 },
  price: { fontSize: 16, fontWeight: 'bold', color: '#2E8B57', marginVertical: 2 },
  stock: { fontSize: 12, color: '#666', marginBottom: 12 },
  cardActions: { flexDirection: 'row', gap: 8 },
  editBtn: { flex: 1, backgroundColor: '#FFF9C4', paddingVertical: 8, borderRadius: 6, alignItems: 'center', borderWidth: 1, borderColor: '#FEE180' },
  deleteBtn: { flex: 1, backgroundColor: '#FFEBEE', paddingVertical: 8, borderRadius: 6, alignItems: 'center', borderWidth: 1, borderColor: '#FFCDD2' },
  actionBtnTxt: { fontSize: 13, fontWeight: 'bold', color: '#333' },

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
  saveBtn: { backgroundColor: '#5C3D2E', paddingVertical: 8, paddingHorizontal: 20, borderRadius: 8 },
  saveBtnText: { color: '#FFF', fontWeight: 'bold' },
});