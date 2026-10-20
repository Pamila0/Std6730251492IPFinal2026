import { useLocalSearchParams, useRouter } from 'expo-router';
import { Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

const API_BASE_URL = 'http://119.59.102.161:3111/api';

export default function DeleteScreen() {
  const router = useRouter();
  const { id, name } = useLocalSearchParams();

  const handleDelete = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/products/${id}`, { method: 'DELETE' });
      if (res.ok) {
        Alert.alert('สำเร็จ', 'ลบข้อมูลพนักงานเรียบร้อยแล้ว');
        router.back();
      } else {
        Alert.alert('เกิดข้อผิดพลาด', 'ไม่สามารถลบข้อมูลพนักงานได้');
      }
    } catch (err) {
      Alert.alert('ข้อผิดพลาด', 'ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้');
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>🗑️ ยืนยันการลบข้อมูลพนักงาน</Text>
      <Text style={styles.desc}>คุณต้องการลบข้อมูลพนักงาน "{name}" ใช่หรือไม่?</Text>
      <View style={styles.row}>
        <TouchableOpacity style={[styles.btn, styles.btnCancel]} onPress={() => router.back()}>
          <Text style={styles.btnTxt}>ยกเลิก</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.btn, styles.btnDelete]} onPress={handleDelete}>
          <Text style={styles.btnTxt}>ลบพนักงาน</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FAF6F0' },
  title: { fontSize: 20, fontWeight: 'bold', color: '#4A2E1D', marginBottom: 12 },
  desc: { fontSize: 15, color: '#555', marginBottom: 24, textAlign: 'center' },
  row: { flexDirection: 'row', gap: 12 },
  btn: { paddingVertical: 12, paddingHorizontal: 24, borderRadius: 8 },
  btnCancel: { backgroundColor: '#888' },
  btnDelete: { backgroundColor: '#D32F2F' },
  btnTxt: { color: '#FFF', fontWeight: 'bold' },
});