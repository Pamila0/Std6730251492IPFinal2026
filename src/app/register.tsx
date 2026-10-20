import { useRouter } from 'expo-router';
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
 
const API_BASE_URL = 'http://119.59.102.161:3111/api';
 
export default function RegisterScreen() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
 
  const showAlert = (title: string, msg: string, onSuccess?: () => void) => {
    if (Platform.OS === 'web') {
      alert(`${title}: ${msg}`);
      if (onSuccess) onSuccess();
    } else {
      Alert.alert(title, msg, [
        {
          text: 'ตกลง',
          onPress: () => {
            if (onSuccess) onSuccess();
          },
        },
      ]);
    }
  };
 
  const handleRegister = async () => {
    const cleanUsername = username.trim();
    const cleanPassword = password.trim();
 
    if (!cleanUsername || !cleanPassword) {
      showAlert('กรุณากรอกข้อมูล', 'กรุณากรอกชื่อผู้ใช้และรหัสผ่านให้ครบถ้วน');
      return;
    }
 
    setLoading(true);
 
    try {
      const res = await fetch(`${API_BASE_URL}/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: cleanUsername,
          password: cleanPassword,
        }),
      });
 
      const data = await res.json();
 
      if (res.ok && data.success) {
        showAlert('สำเร็จ', 'ลงทะเบียนเรียบร้อยแล้ว เข้าสู่ระบบได้ทันที', () => {
          router.replace('/login');
        });
      } else {
        showAlert('สมัครสมาชิกไม่สำเร็จ', data.message || 'เกิดข้อผิดพลาดในการลงทะเบียน');
      }
    } catch (err) {
      console.error('Register connection error:', err);
      showAlert('ผิดพลาด', 'ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้');
    } finally {
      setLoading(false);
    }
  };
 
  return (
    <View style={styles.container}>
      <Text style={styles.title}>📝 สมัครสมาชิก</Text>
 
      <TextInput
        style={styles.input}
        placeholder="ชื่อผู้ใช้ (Username)"
        placeholderTextColor="#999"
        value={username}
        onChangeText={setUsername}
        autoCapitalize="none"
      />
 
      <TextInput
        style={styles.input}
        placeholder="รหัสผ่าน"
        placeholderTextColor="#999"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />
 
      <TouchableOpacity
        style={styles.btn}
        onPress={handleRegister}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#FFF" />
        ) : (
          <Text style={styles.btnTxt}>ยืนยันการสมัคร</Text>
        )}
      </TouchableOpacity>
 
      <TouchableOpacity
        style={styles.loginLink}
        onPress={() => router.replace('/login')}
      >
        <Text style={styles.loginLinkTxt}>
          มีบัญชีอยู่แล้ว? <Text style={styles.highlightTxt}>เข้าสู่ระบบที่นี่</Text>
        </Text>
      </TouchableOpacity>
    </View>
  );
}
 
const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
    backgroundColor: '#FAF6F0',
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#4A2E1D',
    marginBottom: 20,
    textAlign: 'center',
  },
  input: {
    backgroundColor: '#FFF',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#DDD',
    marginBottom: 12,
  },
  btn: {
    backgroundColor: '#2E8B57',
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  btnTxt: {
    color: '#FFF',
    fontWeight: 'bold',
  },
  loginLink: {
    marginTop: 16,
    alignItems: 'center',
  },
  loginLinkTxt: {
    fontSize: 13,
    color: '#666',
  },
  highlightTxt: {
    color: '#4A2E1D',
    fontWeight: 'bold',
  },
});
 