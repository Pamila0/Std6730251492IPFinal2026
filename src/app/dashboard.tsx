import { Stack, router } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const API_BASE_URL = 'http://119.59.102.161:3111/api';

interface Product {
  id: number;
  name: string;
  price: number;
  stock?: number;
}

export default function DashboardScreen() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // States สำหรับสถิติ
  const [totalProducts, setTotalProducts] = useState(0);
  const [totalStock, setTotalStock] = useState(0);
  const [outOfStockCount, setOutOfStockCount] = useState(0);
  const [lowStockProducts, setLowStockProducts] = useState<Product[]>([]);
  const [priceTiersCount, setPriceTiersCount] = useState({
    budget: 0,
    mid: 0,
    premium: 0,
  });

  const fetchDashboardData = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/products`);
      if (!res.ok) throw new Error('Failed to fetch products');
      const data: Product[] = await res.json();

      if (Array.isArray(data)) {
        // 1. รวมจำนวนสินค้าและสต็อกทั้งหมด
        setTotalProducts(data.length);
        const stockSum = data.reduce((sum, item) => sum + Number(item.stock || 0), 0);
        setTotalStock(stockSum);

        // 2. ค้นหาสินค้าสต็อกน้อย (น้อยกว่า 5 ชิ้น) & หมดสต็อก
        const lowStock = data.filter((item) => Number(item.stock || 0) < 5);
        const outOfStock = data.filter((item) => Number(item.stock || 0) === 0);
        setLowStockProducts(lowStock);
        setOutOfStockCount(outOfStock.length);

        // 3. จัดกลุ่มราคาสินค้าด้วย K-Means แบบ 3 กลุ่ม
        if (data.length > 0) {
          const prices = data.map((item) => parseFloat(String(item.price || 0)));
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
          let budget = 0;
          let mid = 0;
          let premium = 0;

          prices.forEach((p) => {
            const d0 = Math.abs(p - sortedCentroids[0]);
            const d1 = Math.abs(p - sortedCentroids[1]);
            const d2 = Math.abs(p - sortedCentroids[2]);

            if (d1 <= d0 && d1 <= d2) mid++;
            else if (d2 <= d0 && d2 <= d1) premium++;
            else budget++;
          });

          setPriceTiersCount({ budget, mid, premium });
        }
      }
    } catch (err) {
      console.error('Dashboard data error:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchDashboardData();
  };

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen options={{ title: '📊 Admin Dashboard' }} />

      {loading ? (
        <ActivityIndicator size="large" color="#5C3D2E" style={{ marginTop: 40 }} />
      ) : (
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        >
          {/* หัวข้อ Dashboard */}
          <View style={styles.headerArea}>
            <Text style={styles.titleText}>สรุปภาพรวมร้านค้า MILA Shop</Text>
            <Text style={styles.subText}>อัปเดตข้อมูลสินค้าและสต็อกล่าสุด</Text>
          </View>

          {/* การ์ดสถิติรวม */}
          <View style={styles.metricsGrid}>
            <View style={[styles.metricCard, { backgroundColor: '#E3F2FD' }]}>
              <Text style={styles.metricIcon}>📦</Text>
              <Text style={styles.metricValue}>{totalProducts}</Text>
              <Text style={styles.metricLabel}>รายการสินค้าทั้งหมด</Text>
            </View>

            <View style={[styles.metricCard, { backgroundColor: '#E8F5E9' }]}>
              <Text style={styles.metricIcon}>🏷️</Text>
              <Text style={styles.metricValue}>{totalStock}</Text>
              <Text style={styles.metricLabel}>จำนวนสต็อกรวม</Text>
            </View>

            <View style={[styles.metricCard, { backgroundColor: '#FFF3E0' }]}>
              <Text style={styles.metricIcon}>⚠️</Text>
              <Text style={styles.metricValue}>{lowStockProducts.length}</Text>
              <Text style={styles.metricLabel}>สินค้าใกล้หมด</Text>
            </View>

            <View style={[styles.metricCard, { backgroundColor: '#FFEBEE' }]}>
              <Text style={styles.metricIcon}>🚨</Text>
              <Text style={styles.metricValue}>{outOfStockCount}</Text>
              <Text style={styles.metricLabel}>สินค้าหมดสต็อก</Text>
            </View>
          </View>

          {/* สรุปการจัดกลุ่มช่วงราคา (K-Means) */}
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>🎯 การจัดกลุ่มช่วงราคา (K-Means)</Text>
            <Text style={styles.sectionDesc}>แบ่งกลุ่มราคาสินค้าอัตโนมัติเป็น 3 ระดับ</Text>

            <View style={styles.tierContainer}>
              <View style={styles.tierItem}>
                <View style={styles.tierHeader}>
                  <Text style={styles.tierName}>💚 ราคาประหยัด</Text>
                  <Text style={styles.tierCount}>{priceTiersCount.budget} รายการ</Text>
                </View>
                <View style={styles.progressBg}>
                  <View
                    style={[
                      styles.progressBar,
                      {
                        width: `${totalProducts ? (priceTiersCount.budget / totalProducts) * 100 : 0}%`,
                        backgroundColor: '#4CAF50',
                      },
                    ]}
                  />
                </View>
              </View>

              <View style={styles.tierItem}>
                <View style={styles.tierHeader}>
                  <Text style={styles.tierName}>💙 ราคากลาง</Text>
                  <Text style={styles.tierCount}>{priceTiersCount.mid} รายการ</Text>
                </View>
                <View style={styles.progressBg}>
                  <View
                    style={[
                      styles.progressBar,
                      {
                        width: `${totalProducts ? (priceTiersCount.mid / totalProducts) * 100 : 0}%`,
                        backgroundColor: '#2196F3',
                      },
                    ]}
                  />
                </View>
              </View>

              <View style={styles.tierItem}>
                <View style={styles.tierHeader}>
                  <Text style={styles.tierName}>💜 พรีเมียม</Text>
                  <Text style={styles.tierCount}>{priceTiersCount.premium} รายการ</Text>
                </View>
                <View style={styles.progressBg}>
                  <View
                    style={[
                      styles.progressBar,
                      {
                        width: `${totalProducts ? (priceTiersCount.premium / totalProducts) * 100 : 0}%`,
                        backgroundColor: '#9C27B0',
                      },
                    ]}
                  />
                </View>
              </View>
            </View>
          </View>

          {/* ตารางสินค้าที่ต้องเติมสต็อก */}
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>🔔 รายการสินค้าที่ต้องรีบเติมสต็อก</Text>

            {lowStockProducts.length === 0 ? (
              <Text style={styles.emptyText}>ไม่มีสินค้าระดับสต็อกต่ำในขณะนี้ 👍</Text>
            ) : (
              lowStockProducts.map((prod) => (
                <View key={prod.id} style={styles.lowStockRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.lowStockName}>{prod.name}</Text>
                    <Text style={styles.lowStockPrice}>฿{prod.price.toLocaleString()}</Text>
                  </View>
                  <View style={styles.stockBadge}>
                    <Text style={styles.stockBadgeText}>คงเหลือ: {prod.stock ?? 0} ชิ้น</Text>
                  </View>
                </View>
              ))
            )}
          </View>

          {/* ปุ่มทางลัดกลับหน้าหลัก */}
          <TouchableOpacity style={styles.backBtn} onPress={() => router.replace('/')}>
            <Text style={styles.backBtnText}>กลับสู่หน้าหลักร้านค้า</Text>
          </TouchableOpacity>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAF6F0' },
  scrollContent: { padding: 16 },
  headerArea: { marginBottom: 16 },
  titleText: { fontSize: 22, fontWeight: 'bold', color: '#4A2E1D' },
  subText: { fontSize: 13, color: '#777', marginTop: 2 },

  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 20,
  },
  metricCard: {
    width: '48%',
    padding: 14,
    borderRadius: 12,
    alignItems: 'flex-start',
  },
  metricIcon: { fontSize: 20, marginBottom: 4 },
  metricValue: { fontSize: 22, fontWeight: 'bold', color: '#2C3E50' },
  metricLabel: { fontSize: 12, color: '#555', marginTop: 2 },

  sectionCard: {
    backgroundColor: '#FFF',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E8DCCF',
  },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', color: '#4A2E1D', marginBottom: 4 },
  sectionDesc: { fontSize: 12, color: '#888', marginBottom: 14 },

  tierContainer: { gap: 12 },
  tierItem: { marginBottom: 4 },
  tierHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  tierName: { fontSize: 13, fontWeight: '600', color: '#333' },
  tierCount: { fontSize: 13, color: '#666', fontWeight: 'bold' },
  progressBg: { height: 10, backgroundColor: '#EEE', borderRadius: 5, overflow: 'hidden' },
  progressBar: { height: '100%', borderRadius: 5 },

  lowStockRow: {
    flexDirection: 'row',
    justify: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  lowStockName: { fontSize: 14, fontWeight: 'bold', color: '#333' },
  lowStockPrice: { fontSize: 12, color: '#2E8B57', marginTop: 2 },
  stockBadge: { backgroundColor: '#FFEBEE', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  stockBadgeText: { fontSize: 11, color: '#C62828', fontWeight: 'bold' },
  emptyText: { fontSize: 13, color: '#888', textAlign: 'center', marginVertical: 10 },

  backBtn: {
    backgroundColor: '#5C3D2E',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 20,
  },
  backBtnText: { color: '#FFF', fontWeight: 'bold', fontSize: 14 },
});






เนยน่ารัด