import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const API_BASE_URL = 'http://119.59.102.161:3111/api';

interface Employee {
  id: number;
  Pamila_Emp_ID: string;
  Pamila_Name: string;
  Pamila_Position: string;
  Pamila_Department: string;
  Pamila_BaseSalary: number;
  Pamila_Bonus: number;
  Pamila_NetSalary: number;
}

export default function SearchScreen() {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchEmployees();
  }, []);

  const fetchEmployees = async () => {
    try {
      let res = await fetch(`${API_BASE_URL}/products`);
      if (!res.ok) {
        res = await fetch(`${API_BASE_URL}/employees`);
      }
      const data = await res.json();
      
      if (Array.isArray(data)) {
        const mappedData: Employee[] = data.map((item: any, index: number) => {
          const base = parseFloat(item.Pamila_BaseSalary || item.price || 0);
          const bonus = parseFloat(item.Pamila_Bonus || 0);
          return {
            id: Number(item.id || item.Pamila_ID || index + 1),
            Pamila_Emp_ID: item.Pamila_Emp_ID || `EMP0${index + 1}`,
            Pamila_Name: item.Pamila_Name || item.name || 'N/A',
            Pamila_Position: item.Pamila_Position || item.position || 'Staff',
            Pamila_Department: item.Pamila_Department || item.department || 'General',
            Pamila_BaseSalary: base,
            Pamila_Bonus: bonus,
            Pamila_NetSalary: base + bonus,
          };
        });
        setEmployees(mappedData);
      }
    } catch (err) {
      console.warn('Backend offline, using mock employee list for search');
      setEmployees([
        {
          id: 1,
          Pamila_Emp_ID: 'EMP001',
          Pamila_Name: 'พามิลา กุมภวงค์',
          Pamila_Position: 'HR Manager',
          Pamila_Department: 'Human Resources',
          Pamila_BaseSalary: 45000,
          Pamila_Bonus: 10000,
          Pamila_NetSalary: 55000,
        },
        {
          id: 2,
          Pamila_Emp_ID: 'EMP002',
          Pamila_Name: 'สมชาย ใจดี',
          Pamila_Position: 'Senior Developer',
          Pamila_Department: 'IT',
          Pamila_BaseSalary: 38000,
          Pamila_Bonus: 5000,
          Pamila_NetSalary: 43000,
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleGoBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/');
    }
  };

  const filteredEmployees = employees.filter((item) => {
    const q = query.trim().toLowerCase();
    return (
      item.Pamila_Name.toLowerCase().includes(q) ||
      item.Pamila_Emp_ID.toLowerCase().includes(q) ||
      item.Pamila_Position.toLowerCase().includes(q) ||
      item.Pamila_Department.toLowerCase().includes(q)
    );
  });

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={handleGoBack}>
          <Text style={styles.backBtnText}>⬅️ ย้อนกลับ</Text>
        </TouchableOpacity>
        <Text style={styles.title}>🔍 ค้นหาพนักงาน</Text>
      </View>

      <TextInput
        style={styles.searchInput}
        placeholder="พิมพ์ชื่อ, รหัสพนักงาน, ตำแหน่ง หรือ แผนก..."
        placeholderTextColor="#999"
        value={query}
        onChangeText={setQuery}
        autoFocus
      />

      <Text style={styles.resultText}>ผลการค้นหาสำหรับ: "{query}"</Text>

      {loading ? (
        <ActivityIndicator size="large" color="#5C3D2E" style={{ marginTop: 20 }} />
      ) : (
        <FlatList
          data={filteredEmployees}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={{ paddingBottom: 20 }}
          renderItem={({ item }) => (
            <View style={styles.empCard}>
              <View style={styles.empInfo}>
                <View style={styles.cardHeader}>
                  <Text style={styles.empId}>{item.Pamila_Emp_ID}</Text>
                  <Text style={styles.deptBadge}>{item.Pamila_Department}</Text>
                </View>
                <Text style={styles.empName}>{item.Pamila_Name}</Text>
                <Text style={styles.empPos}>ตำแหน่ง: {item.Pamila_Position}</Text>
                <Text style={styles.empSalary}>เงินเดือนสุทธิ: ฿{item.Pamila_NetSalary.toLocaleString()}</Text>
              </View>
            </View>
          )}
          ListEmptyComponent={
            <Text style={styles.emptyText}>
              {query.trim() ? 'ไม่พบข้อมูลพนักงานที่ตรงกับคำค้นหา' : 'พิมพ์คำค้นหาเพื่อเริ่มค้นหาพนักงาน'}
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
  searchInput: { backgroundColor: '#FFF', padding: 12, borderRadius: 8, borderWidth: 1, borderColor: '#DDD', fontSize: 14 },
  resultText: { color: '#666', marginTop: 10, marginBottom: 12 },
  
  empCard: { backgroundColor: '#FFF', borderRadius: 12, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: '#E8DCCF' },
  empInfo: { flex: 1 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  empId: { fontSize: 12, fontWeight: 'bold', color: '#888' },
  deptBadge: { fontSize: 11, fontWeight: 'bold', color: '#5C3D2E', backgroundColor: '#F0EABE', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  empName: { fontSize: 16, fontWeight: 'bold', color: '#4A2E1D', marginBottom: 2 },
  empPos: { fontSize: 13, color: '#666', marginBottom: 4 },
  empSalary: { fontSize: 14, color: '#2E8B57', fontWeight: 'bold' },
  
  emptyText: { textAlign: 'center', color: '#999', marginTop: 40 },
});