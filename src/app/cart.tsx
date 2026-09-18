import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
    Image,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Product } from './index';

// ขยาย Interface เพื่อรองรับฟิลด์ quantity (จำนวนสินค้า)
export interface CartItem extends Product {
  quantity?: number;
}

export default function CartScreen() {
  const router = useRouter();
  const [step, setStep] = useState<'CART' | 'SHIPPING' | 'RECEIPT'>('CART');
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [shippingInfo, setShippingInfo] = useState({ name: '', phone: '', address: '' });

  useEffect(() => {
    loadCartData();
  }, []);

  // โหลดข้อมูลตะกร้า และจัดกลุ่มสินค้าชิ้นเดียวกันให้รวมยอด quantity
  const loadCartData = async () => {
    try {
      const storedCart = await AsyncStorage.getItem('cart');
      if (storedCart) {
        const parsedCart: Product[] = JSON.parse(storedCart);
        const countedMap = new Map<number, CartItem>();
        
        parsedCart.forEach((item) => {
          const itemId = Number(item.id);
          if (countedMap.has(itemId)) {
            const existing = countedMap.get(itemId)!;
            existing.quantity = (existing.quantity || 1) + 1;
          } else {
            countedMap.set(itemId, { ...item, id: itemId, quantity: item.quantity || 1 });
          }
        });
        
        setCartItems(Array.from(countedMap.values()));
      } else {
        setCartItems([]);
      }
    } catch (err) {
      console.error('Error loading cart items:', err);
    }
  };

  const showAlert = (title: string, msg: string) => {
    if (Platform.OS === 'web') {
      alert(`${title}\n${msg}`);
    } else {
      alert(`${title}: ${msg}`);
    }
  };

  // ฟังก์ชันบันทึกข้อมูลตะกร้าลง AsyncStorage (แปลงกลับเป็นแบบรายการเรียงเดี่ยวเพื่อให้หน้าอื่นดึงไปใช้ต่อได้ถูกต้อง)
  const saveCartToStorage = async (updatedCart: CartItem[]) => {
    setCartItems(updatedCart);
    try {
      const flattened: Product[] = [];
      updatedCart.forEach((item) => {
        const qty = item.quantity || 1;
        for (let i = 0; i < qty; i++) {
          flattened.push({ ...item, quantity: 1 });
        }
      });
      await AsyncStorage.setItem('cart', JSON.stringify(flattened));
    } catch (err) {
      console.error('Error saving cart:', err);
    }
  };

  // เพิ่มจำนวนสินค้าทีละ 1 แบบเรียลไทม์
  const handleIncrease = (id: number) => {
    const updated = cartItems.map((item) => {
      if (item.id === id) {
        return { ...item, quantity: (item.quantity || 1) + 1 };
      }
      return item;
    });
    saveCartToStorage(updated);
  };

  // ลดจำนวนสินค้าทีละ 1 (ถ้าเหลือ 0 จะทำการตัดรายการสินค้านั้นออก)
  const handleDecrease = (id: number) => {
    const updated = cartItems
      .map((item) => {
        if (item.id === id) {
          const newQty = (item.quantity || 1) - 1;
          return newQty > 0 ? { ...item, quantity: newQty } : null;
        }
        return item;
      })
      .filter(Boolean) as CartItem[];

    saveCartToStorage(updated);
  };

  // ลบสินค้าออกจากตะกร้าทันที
  const handleRemoveItem = (id: number) => {
    const updated = cartItems.filter((item) => item.id !== id);
    saveCartToStorage(updated);
  };

  // คำนวณราคารวมทั้งหมดแบบเรียลไทม์ (ราคา x จำนวน)
  const totalPrice = cartItems.reduce(
    (sum, item) => sum + Number(item.price || 0) * (item.quantity || 1),
    0
  );

  // ฟังก์ชันกดสั่งซื้อ (ส่งข้อมูลไปบันทึกลง Server/Database ผ่าน API พร้อมข้อมูลจัดส่ง)
  const handleCheckout = async () => {
    if (!shippingInfo.name || !shippingInfo.phone || !shippingInfo.address) {
      showAlert('แจ้งเตือน', 'กรุณากรอกข้อมูลจัดส่งให้ครบถ้วน');
      return;
    }

    try {
      const response = await fetch('http://119.59.102.161:3111/api/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: 1, 
          total_amount: totalPrice,
          name: shippingInfo.name,       // ส่งชื่อ-นามสกุลไปบันทึก
          phone: shippingInfo.phone,     // ส่งเบอร์โทรศัพท์ไปบันทึก
          address: shippingInfo.address, // ส่งที่อยู่จัดส่งไปบันทึก
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        await AsyncStorage.removeItem('cart');
        setStep('RECEIPT');
      } else {
        showAlert('เกิดข้อผิดพลาด', data.message || 'ไม่สามารถบันทึกคำสั่งซื้อได้');
      }
    } catch (err) {
      console.error('Checkout error:', err);
      showAlert('ข้อผิดพลาด', 'ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.headerBar}>
        <TouchableOpacity 
          style={styles.backBtn} 
          onPress={() => {
            if (step === 'SHIPPING') {
              setStep('CART');
            } else {
              router.back();
            }
          }}
        >
          <Text style={styles.backBtnTxt}>⬅️ ย้อนกลับ</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {step === 'CART' && '🛒 ตะกร้าสินค้า'}
          {step === 'SHIPPING' && '📦 ข้อมูลจัดส่ง'}
          {step === 'RECEIPT' && '🎉 สั่งซื้อสำเร็จ'}
        </Text>
        <View style={{ width: 60 }} />
      </View>

      {step === 'CART' && (
        <View style={{ flex: 1 }}>
          {cartItems.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyTxt}>ไม่มีสินค้าในตะกร้า</Text>
              <TouchableOpacity style={styles.btn} onPress={() => router.back()}>
                <Text style={styles.btnTxt}>ไปเลือกซื้อสินค้า</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              <ScrollView style={{ flex: 1, paddingHorizontal: 16 }}>
                {cartItems.map((item) => (
                  <View key={item.id} style={styles.cartCard}>
                    <Image
                      source={{ uri: item.image || item.image_url || 'https://via.placeholder.com/150' }}
                      style={styles.productImg}
                    />
                    <View style={{ flex: 1, marginLeft: 12 }}>
                      <Text style={styles.productName} numberOfLines={2}>{item.name}</Text>
                      <Text style={styles.productPrice}>฿{Number(item.price).toLocaleString()}</Text>

                      {/* ปุ่มปรับเพิ่ม-ลด จำนวนสินค้าแบบเรียลไทม์ */}
                      <View style={styles.qtyContainer}>
                        <TouchableOpacity
                          style={styles.qtyBtn}
                          onPress={() => handleDecrease(item.id)}
                        >
                          <Text style={styles.qtyBtnText}>-</Text>
                        </TouchableOpacity>

                        <Text style={styles.qtyText}>{item.quantity || 1}</Text>

                        <TouchableOpacity
                          style={styles.qtyBtn}
                          onPress={() => handleIncrease(item.id)}
                        >
                          <Text style={styles.qtyBtnText}>+</Text>
                        </TouchableOpacity>
                      </View>
                    </View>

                    <TouchableOpacity
                      style={styles.deleteItemBtn}
                      onPress={() => handleRemoveItem(item.id)}
                    >
                      <Text style={{ fontSize: 16 }}>🗑️</Text>
                    </TouchableOpacity>
                  </View>
                ))}
              </ScrollView>

              <View style={styles.footerSummary}>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>ยอดรวมทั้งหมด:</Text>
                  <Text style={styles.summaryPrice}>฿{totalPrice.toLocaleString()}</Text>
                </View>
                <TouchableOpacity style={styles.btn} onPress={() => setStep('SHIPPING')}>
                  <Text style={styles.btnTxt}>ดำเนินการสั่งซื้อ</Text>
                </TouchableOpacity>
              </View>
            </>
          )}
        </View>
      )}

      {step === 'SHIPPING' && (
        <ScrollView style={{ flex: 1, padding: 16 }}>
          <Text style={styles.sectionTitle}>กรอกข้อมูลสำหรับจัดส่งสินค้า</Text>
          
          <Text style={styles.label}>ชื่อ-นามสกุล</Text>
          <TextInput
            style={styles.input}
            placeholder="กรอกชื่อและนามสกุล"
            placeholderTextColor="#AAA"
            value={shippingInfo.name}
            onChangeText={(v) => setShippingInfo({ ...shippingInfo, name: v })}
          />

          <Text style={styles.label}>เบอร์โทรศัพท์</Text>
          <TextInput
            style={styles.input}
            placeholder="0812345678"
            placeholderTextColor="#AAA"
            keyboardType="phone-pad"
            value={shippingInfo.phone}
            onChangeText={(v) => setShippingInfo({ ...shippingInfo, phone: v })}
          />

          <Text style={styles.label}>ที่อยู่จัดส่ง</Text>
          <TextInput
            style={[styles.input, { height: 90, textAlignVertical: 'top' }]}
            placeholder="บ้านเลขที่, ถนน, ตำบล, อำเภอ, จังหวัด, รหัสไปรษณีย์"
            placeholderTextColor="#AAA"
            multiline
            value={shippingInfo.address}
            onChangeText={(v) => setShippingInfo({ ...shippingInfo, address: v })}
          />

          <TouchableOpacity style={styles.btn} onPress={handleCheckout}>
            <Text style={styles.btnTxt}>ยืนยันการชำระเงิน</Text>
          </TouchableOpacity>
        </ScrollView>
      )}

      {step === 'RECEIPT' && (
        <View style={styles.successContainer}>
          <Text style={{ fontSize: 60, marginBottom: 12 }}>✅</Text>
          <Text style={styles.successTitle}>สั่งซื้อสินค้าสำเร็จแล้ว!</Text>
          <Text style={styles.successSub}>ขอบคุณที่ใช้บริการ MILA Shop</Text>
          <TouchableOpacity style={[styles.btn, { width: '80%', marginTop: 24 }]} onPress={() => router.replace('/')}>
            <Text style={styles.btnTxt}>กลับสู่หน้าหลัก</Text>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAF6F0' },
  headerBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E8DCCF',
  },
  backBtn: { padding: 6, backgroundColor: '#F0EABE', borderRadius: 8 },
  backBtnTxt: { fontSize: 12, fontWeight: 'bold', color: '#4A2E1D' },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#4A2E1D' },

  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  emptyTxt: { textAlign: 'center', color: '#888', fontSize: 16, marginBottom: 16 },

  cartCard: {
    flexDirection: 'row',
    backgroundColor: '#FFF',
    borderRadius: 10,
    padding: 10,
    alignItems: 'center',
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#E8DCCF',
  },
  productImg: { width: 60, height: 60, borderRadius: 8 },
  productName: { fontSize: 14, fontWeight: 'bold', color: '#4A2E1D' },
  productPrice: { fontSize: 14, fontWeight: 'bold', color: '#2E8B57', marginTop: 2, marginBottom: 6 },
  
  qtyContainer: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  qtyBtn: {
    width: 26,
    height: 26,
    backgroundColor: '#F0EABE',
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  qtyBtnText: { fontSize: 14, fontWeight: 'bold', color: '#4A2E1D' },
  qtyText: { fontSize: 14, fontWeight: 'bold', color: '#333', minWidth: 20, textAlign: 'center' },

  deleteItemBtn: { padding: 8, backgroundColor: '#FFEBEE', borderRadius: 8 },

  footerSummary: {
    backgroundColor: '#FFF',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#E8DCCF',
  },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  summaryLabel: { fontSize: 16, fontWeight: '600', color: '#555' },
  summaryPrice: { fontSize: 18, fontWeight: 'bold', color: '#2E8B57' },

  sectionTitle: { fontSize: 16, fontWeight: 'bold', color: '#4A2E1D', marginBottom: 12 },
  label: { fontSize: 12, fontWeight: '600', color: '#555', marginBottom: 4 },
  input: {
    backgroundColor: '#FFF',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    marginBottom: 12,
    fontSize: 14,
  },
  btn: { backgroundColor: '#5C3D2E', padding: 14, borderRadius: 8, alignItems: 'center' },
  btnTxt: { color: '#FFF', fontWeight: 'bold', fontSize: 15 },

  successContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  successTitle: { fontSize: 22, fontWeight: 'bold', color: '#4A2E1D', marginBottom: 6 },
  successSub: { fontSize: 14, color: '#666', marginBottom: 12 },
});