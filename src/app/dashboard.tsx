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

interface Employee {
  id: number;
  name: string;
  price: number;
  stock?: number;
  Pamila_Emp_ID?: string;
  Pamila_Name?: string;
  Pamila_Position?: string;
  Pamila_Department?: string;
  Pamila_BaseSalary?: number;
  Pamila_Bonus?: number;
  Pamila_NetSalary?: number;
}

export default function DashboardScreen() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // States สำหรับสถิติ HR & Salary Analytics
  const [totalEmployees, setTotalEmployees] = useState(0);
  const [totalSalaryExpense, setTotalSalaryExpense] = useState(0);
  const [averageSalary, setAverageSalary] = useState(0);
  const [maxSalary, setMaxSalary] = useState(0);
  
  const [topEarners, setTopEarners] = useState<Employee[]>([]);
  const [priceTiersCount, setPriceTiersCount] = useState({
    budget: 0, // Operational Level
    mid: 0,    // Senior Level
    premium: 0,// Executive Level
  });

  const processEmployeeData = (data: any[]) => {
    if (!Array.isArray(data) || data.length === 0) return;

    // แมปและแปลงข้อมูลทุกช่องให้เป็นตัวเลขอย่างปลอดภัย (Safety Parsing)
    const formattedData = data.map((item, index) => {
      const base = parseFloat(String(item.Pamila_BaseSalary ?? item.price ?? 0)) || 0;
      const bonus = parseFloat(String(item.Pamila_Bonus ?? item.stock ?? 0)) || 0;
      const net = base + bonus;

      return {
        ...item,
        id: Number(item.id || item.Pamila_ID || index + 1),
        Pamila_Emp_ID: item.Pamila_Emp_ID || `EMP0${index + 1}`,
        Pamila_Name: item.Pamila_Name || item.name || 'พนักงาน',
        Pamila_Position: item.Pamila_Position || item.position || 'Staff',
        Pamila_Department: item.Pamila_Department || item.department || 'General',
        Pamila_BaseSalary: base,
        Pamila_Bonus: bonus,
        Pamila_NetSalary: net,
      };
    });

    // 1. คำนวณสถิติรวม
    setTotalEmployees(formattedData.length);
    const totalExpense = formattedData.reduce((sum, item) => sum + item.Pamila_NetSalary, 0);
    setTotalSalaryExpense(totalExpense);
    setAverageSalary(formattedData.length > 0 ? Math.round(totalExpense / formattedData.length) : 0);
    
    const salaries = formattedData.map((item) => item.Pamila_NetSalary);
    const max = salaries.length > 0 ? Math.max(...salaries) : 0;
    setMaxSalary(max);

    // 2. พนักงานเงินเดือนสูงสุด (Top Earners)
    const sortedBySalary = [...formattedData].sort((a, b) => b.Pamila_NetSalary - a.Pamila_NetSalary);
    setTopEarners(sortedBySalary.slice(0, 3));

    // 3. K-Means Clustering (ป้องกัน Array ว่างหรือ Error ค่า Infinity)
    if (salaries.length > 0) {
      let centroids = [
        Math.min(...salaries),
        (Math.min(...salaries) + Math.max(...salaries)) / 2,
        Math.max(...salaries),
      ];

      for (let iter = 0; iter < 5; iter++) {
        const clusters: number[][] = [[], [], []];
        salaries.forEach((s) => {
          let minDist = Infinity;
          let clusterIndex = 0;
          centroids.forEach((c, idx) => {
            const dist = Math.abs(s - c);
            if (dist < minDist) {
              minDist = dist;
              clusterIndex = idx;
            }
          });
          clusters[clusterIndex].push(s);
        });

        centroids = clusters.map((c, idx) =>
          c.length > 0 ? c.reduce((a, b) => a + b, 0) / c.length : centroids[idx]
        );
      }

      const sortedCentroids = [...centroids].sort((a, b) => a - b);
      let budget = 0; // Operational
      let mid = 0;    // Senior
      let premium = 0;// Executive

      salaries.forEach((s) => {
        const d0 = Math.abs(s - sortedCentroids[0]);
        const d1 = Math.abs(s - sortedCentroids[1]);
        const d2 = Math.abs(s - sortedCentroids[2]);

        if (d1 <= d0 && d1 <= d2) mid++;
        else if (d2 <= d0 && d2 <= d1) premium++;
        else budget++;
      });

      setPriceTiersCount({ budget, mid, premium });
    }
  };

  const fetchDashboardData = async () => {
    try {
      let res = await fetch(`${API_BASE_URL}/products`);
      if (!res.ok) {
        res = await fetch(`${API_BASE_URL}/employees`);
      }
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        processEmployeeData(data);
      } else {
        throw new Error('Empty or invalid data');
      }
    } catch (err) {
      console.warn('Dashboard fetch error, loading fallback offline data');
      // ข้อมูลสำรองเมื่อเชื่อมต่อ API ไม่ได้
      const mockData = [
        {
          id: 1,
          Pamila_Emp_ID: 'EMP001',
          Pamila_Name: 'Pamila Kumpawong',
          Pamila_Position: 'HR Manager',
          Pamila_Department: 'Human Resources',
          Pamila_BaseSalary: 45000,
          Pamila_Bonus: 10000,
          price: 45000,
          stock: 10000,
          name: 'Pamila Kumpawong',
        },
      ];
      processEmployeeData(mockData);
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
      <Stack.Screen options={{ title: '📊 HR Analytics Dashboard' }} />

      {loading ? (
        <ActivityIndicator size="large" color="#5C3D2E" style={{ marginTop: 40 }} />
      ) : (
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        >
          {/* หัวข้อ Dashboard */}
          <View style={styles.headerArea}>
            <Text style={styles.titleText}>รายงานการวิเคราะห์เงินเดือนและบุคลากร</Text>
            <Text style={styles.subText}>HR Manager & Salary Analytics System</Text>
          </View>

          {/* การ์ดสถิติรวม */}
          <View style={styles.metricsGrid}>
            <View style={[styles.metricCard, { backgroundColor: '#E3F2FD' }]}>
              <Text style={styles.metricIcon}>👔</Text>
              <Text style={styles.metricValue}>{totalEmployees}</Text>
              <Text style={styles.metricLabel}>พนักงานทั้งหมด (คน)</Text>
            </View>

            <View style={[styles.metricCard, { backgroundColor: '#E8F5E9' }]}>
              <Text style={styles.metricIcon}>💰</Text>
              <Text style={styles.metricValue}>฿{totalSalaryExpense.toLocaleString()}</Text>
              <Text style={styles.metricLabel}>งบประมาณเงินเดือนรวม</Text>
            </View>

            <View style={[styles.metricCard, { backgroundColor: '#FFF3E0' }]}>
              <Text style={styles.metricIcon}>📊</Text>
              <Text style={styles.metricValue}>฿{averageSalary.toLocaleString()}</Text>
              <Text style={styles.metricLabel}>เงินเดือนเฉลี่ย (Net Salary)</Text>
            </View>

            <View style={[styles.metricCard, { backgroundColor: '#FFEBEE' }]}>
              <Text style={styles.metricIcon}>⭐</Text>
              <Text style={styles.metricValue}>฿{maxSalary.toLocaleString()}</Text>
              <Text style={styles.metricLabel}>เงินเดือนสูงสุด</Text>
            </View>
          </View>

          {/* สรุปการจัดกลุ่มระดับพนักงาน (K-Means) */}
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>🎯 การจัดกลุ่มระดับเงินเดือนพนักงาน (K-Means)</Text>
            <Text style={styles.sectionDesc}>แบ่งระดับบุคลากรตามโครงสร้างรายได้สุทธิ (Net Salary)</Text>

            <View style={styles.tierContainer}>
              <View style={styles.tierItem}>
                <View style={styles.tierHeader}>
                  <Text style={styles.tierName}>💚 Operational Level</Text>
                  <Text style={styles.tierCount}>{priceTiersCount.budget} คน</Text>
                </View>
                <View style={styles.progressBg}>
                  <View
                    style={[
                      styles.progressBar,
                      {
                        width: `${totalEmployees ? (priceTiersCount.budget / totalEmployees) * 100 : 0}%`,
                        backgroundColor: '#4CAF50',
                      },
                    ]}
                  />
                </View>
              </View>

              <View style={styles.tierItem}>
                <View style={styles.tierHeader}>
                  <Text style={styles.tierName}>💙 Senior Level</Text>
                  <Text style={styles.tierCount}>{priceTiersCount.mid} คน</Text>
                </View>
                <View style={styles.progressBg}>
                  <View
                    style={[
                      styles.progressBar,
                      {
                        width: `${totalEmployees ? (priceTiersCount.mid / totalEmployees) * 100 : 0}%`,
                        backgroundColor: '#2196F3',
                      },
                    ]}
                  />
                </View>
              </View>

              <View style={styles.tierItem}>
                <View style={styles.tierHeader}>
                  <Text style={styles.tierName}>💜 Executive Level</Text>
                  <Text style={styles.tierCount}>{priceTiersCount.premium} คน</Text>
                </View>
                <View style={styles.progressBg}>
                  <View
                    style={[
                      styles.progressBar,
                      {
                        width: `${totalEmployees ? (priceTiersCount.premium / totalEmployees) * 100 : 0}%`,
                        backgroundColor: '#9C27B0',
                      },
                    ]}
                  />
                </View>
              </View>
            </View>
          </View>

          {/* รายชื่อพนักงานเงินเดือนสูงสุด (Top Earners) */}
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>🏆 อันดับเงินเดือนสูงสุด (Top Earners)</Text>

            {topEarners.length === 0 ? (
              <Text style={styles.emptyText}>ไม่มีข้อมูลพนักงาน 👍</Text>
            ) : (
              topEarners.map((emp, index) => (
                <View key={emp.id || index} style={styles.lowStockRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.lowStockName}>{emp.Pamila_Name || emp.name}</Text>
                    <Text style={styles.lowStockPrice}>ตำแหน่ง: {emp.Pamila_Position || 'Staff'}</Text>
                  </View>
                  <View style={styles.stockBadge}>
                    <Text style={styles.stockBadgeText}>฿{(emp.Pamila_NetSalary || 0).toLocaleString()}</Text>
                  </View>
                </View>
              ))
            )}
          </View>

          {/* ปุ่มทางลัดกลับหน้าหลัก */}
          <TouchableOpacity style={styles.backBtn} onPress={() => router.replace('/')}>
            <Text style={styles.backBtnText}>กลับสู่หน้าหลักจัดการพนักงาน</Text>
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
  titleText: { fontSize: 20, fontWeight: 'bold', color: '#4A2E1D' },
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
  metricValue: { fontSize: 18, fontWeight: 'bold', color: '#2C3E50' },
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
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  lowStockName: { fontSize: 14, fontWeight: 'bold', color: '#333' },
  lowStockPrice: { fontSize: 12, color: '#666', marginTop: 2 },
  stockBadge: { backgroundColor: '#E8F5E9', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12 },
  stockBadgeText: { fontSize: 13, color: '#2E8B57', fontWeight: 'bold' },
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