import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import { useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Platform,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const API_BASE_URL = 'http://119.59.102.161:3111/api';

export default function LoginScreen() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const showAlert = (title: string, msg: string) => {
    if (Platform.OS === 'web') {
      alert(`${title}: ${msg}`);
    } else {
      Alert.alert(title, msg);
    }
  };

  const handleLogin = async () => {
    if (!username.trim() || !password.trim()) {
      showAlert('กรุณากรอกข้อมูล', 'กรุณากรอกชื่อผู้ใช้และรหัสผ่าน');
      return;
    }

    setLoading(true);

    try {
      // ยิง API เช็ก Login ไปยัง Backend
      const res = await fetch(`${API_BASE_URL}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        // ดึง Role จาก response (กรณี Backend ไม่ได้ส่ง role มา ถ้าเป็น admin ให้ถือว่าเป็น admin)
        const role = data.user?.role || (username.toLowerCase() === 'admin' ? 'admin' : 'user');

        // บันทึกสิทธิ์ผู้ใช้ และ Token ลง AsyncStorage
        await AsyncStorage.setItem('userRole', role);
        if (data.token) {
          await AsyncStorage.setItem('userToken', data.token);
        }

        showAlert('สำเร็จ', `ยินดีต้อนรับ ${data.user?.fullname || username} (${role})`);
        router.replace('/');
      } else {
        showAlert('เข้าสู่ระบบไม่สำเร็จ', data.message || 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง');
      }
    } catch (err) {
      console.error('Backend connection error:', err);
      showAlert('ผิดพลาด', 'ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้ กรุณาตรวจสอบการรหัสผ่านหรือสถานะเซิร์ฟเวอร์');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>🔑 เข้าสู่ระบบ</Text>

        {/* ช่องกรอกชื่อผู้ใช้ (Username) */}
        <View style={styles.inputContainer}>
          <Text style={styles.label}>ชื่อผู้ใช้ (Username)</Text>
          <TextInput
            style={styles.input}
            placeholder="กรอกชื่อผู้ใช้"
            placeholderTextColor="#999"
            value={username}
            onChangeText={setUsername}
            autoCapitalize="none"
          />
        </View>

        {/* ช่องกรอกรหัสผ่าน */}
        <View style={styles.inputContainer}>
          <Text style={styles.label}>รหัสผ่าน</Text>
          <TextInput
            style={styles.input}
            placeholder="กรอกรหัสผ่าน"
            placeholderTextColor="#999"
            secureTextEntry
            value={password}
            onChangeText={setPassword}
          />
        </View>

        {/* ปุ่มเข้าสู่ระบบ */}
        <TouchableOpacity
          style={styles.loginBtn}
          onPress={handleLogin}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <Text style={styles.loginBtnText}>เข้าสู่ระบบ</Text>
          )}
        </TouchableOpacity>

        {/* ลิงก์สมัครสมาชิก */}
        <TouchableOpacity
          style={styles.registerLink}
          onPress={() => router.push('/register')}
        >
          <Text style={styles.registerText}>
            ยังไม่มีบัญชี? <Text style={styles.highlightText}>สมัครสมาชิกที่นี่</Text>
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAF6F0',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  card: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: '#FFF',
    padding: 24,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E8DCCF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#4A2E1D',
    textAlign: 'center',
    marginBottom: 24,
  },
  inputContainer: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4A2E1D',
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: '#DDD',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    backgroundColor: '#FFF',
  },
  loginBtn: {
    backgroundColor: '#5C3D2E',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  loginBtnText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  registerLink: {
    marginTop: 16,
    alignItems: 'center',
  },
  registerText: {
    fontSize: 13,
    color: '#666',
  },
  highlightText: {
    color: '#5C3D2E',
    fontWeight: 'bold',
  },
});