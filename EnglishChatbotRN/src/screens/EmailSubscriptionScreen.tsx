import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  TextInput,
  Modal,
  RefreshControl,
} from 'react-native';
import api from '../config/api';

interface EmailSubscription {
  id: string;
  email: string;
  isActive: boolean;
  createdAt: string;
}

const EmailSubscriptionScreen: React.FC = () => {
  const [subscriptions, setSubscriptions] = useState<EmailSubscription[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [email, setEmail] = useState('');
  const [sendModalVisible, setSendModalVisible] = useState(false);
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    loadSubscriptions();
  }, []);

  const loadSubscriptions = async () => {
    setLoading(true);
    try {
      const response = await api.get('/email/subscriptions');
      if (response.data.success) {
        setSubscriptions(response.data.data || []);
      }
    } catch (error) {
      Alert.alert('Lỗi', 'Không thể tải danh sách đăng ký');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadSubscriptions();
  };

  const addSubscription = async () => {
    if (!email.trim()) {
      Alert.alert('Lỗi', 'Vui lòng nhập email');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      Alert.alert('Lỗi', 'Email không hợp lệ');
      return;
    }

    try {
      const response = await api.post('/email/subscribe', {
        email: email.trim(),
      });

      if (response.data.success) {
        Alert.alert('Thành công', 'Đã thêm email đăng ký');
        setModalVisible(false);
        setEmail('');
        loadSubscriptions();
      } else {
        Alert.alert('Lỗi', response.data.message || 'Không thể thêm email');
      }
    } catch (error: any) {
      Alert.alert('Lỗi', error.response?.data?.message || 'Có lỗi xảy ra');
    }
  };

  const toggleSubscription = async (id: string, isActive: boolean) => {
    try {
      const response = await api.put(`/email/subscriptions/${id}`, {
        isActive: !isActive,
      });

      if (response.data.success) {
        loadSubscriptions();
      } else {
        Alert.alert('Lỗi', 'Không thể cập nhật trạng thái');
      }
    } catch (error) {
      Alert.alert('Lỗi', 'Có lỗi xảy ra khi cập nhật');
    }
  };

  const deleteSubscription = async (id: string, email: string) => {
    Alert.alert(
      'Xác nhận xóa',
      `Bạn có chắc chắn muốn xóa email "${email}"?`,
      [
        {text: 'Hủy', style: 'cancel'},
        {
          text: 'Xóa',
          style: 'destructive',
          onPress: async () => {
            try {
              const response = await api.delete(`/email/subscriptions/${id}`);
              if (response.data.success) {
                Alert.alert('Thành công', 'Đã xóa email');
                loadSubscriptions();
              } else {
                Alert.alert('Lỗi', 'Không thể xóa email');
              }
            } catch (error) {
              Alert.alert('Lỗi', 'Có lỗi xảy ra khi xóa');
            }
          },
        },
      ],
    );
  };

  const sendEmailToAll = async () => {
    if (!subject.trim() || !message.trim()) {
      Alert.alert('Lỗi', 'Vui lòng nhập đầy đủ tiêu đề và nội dung');
      return;
    }

    try {
      const response = await api.post('/email/send-bulk', {
        subject: subject.trim(),
        message: message.trim(),
      });

      if (response.data.success) {
        Alert.alert('Thành công', 'Đã gửi email đến tất cả người đăng ký');
        setSendModalVisible(false);
        setSubject('');
        setMessage('');
      } else {
        Alert.alert('Lỗi', response.data.message || 'Không thể gửi email');
      }
    } catch (error: any) {
      Alert.alert('Lỗi', error.response?.data?.message || 'Có lỗi xảy ra');
    }
  };

  const renderSubscriptionItem = ({item}: {item: EmailSubscription}) => (
    <View style={styles.subscriptionItem}>
      <View style={styles.subscriptionInfo}>
        <Text style={styles.emailText}>{item.email}</Text>
        <Text style={styles.dateText}>
          Đăng ký: {new Date(item.createdAt).toLocaleDateString('vi-VN')}
        </Text>
        <View style={[
          styles.statusBadge,
          item.isActive ? styles.activeBadge : styles.inactiveBadge
        ]}>
          <Text style={[
            styles.statusText,
            item.isActive ? styles.activeText : styles.inactiveText
          ]}>
            {item.isActive ? 'Đang hoạt động' : 'Tạm dừng'}
          </Text>
        </View>
      </View>

      <View style={styles.actionButtons}>
        <TouchableOpacity
          style={[styles.actionButton, styles.toggleButton]}
          onPress={() => toggleSubscription(item.id, item.isActive)}>
          <Text style={styles.actionButtonText}>
            {item.isActive ? 'Tắt' : 'Bật'}
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.actionButton, styles.deleteButton]}
          onPress={() => deleteSubscription(item.id, item.email)}>
          <Text style={styles.actionButtonText}>Xóa</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>📧 Email Subscription</Text>
        <View style={styles.headerButtons}>
          <TouchableOpacity
            style={styles.headerButton}
            onPress={() => setModalVisible(true)}>
            <Text style={styles.headerButtonText}>+ Thêm</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.headerButton, styles.sendButton]}
            onPress={() => setSendModalVisible(true)}>
            <Text style={styles.headerButtonText}>Gửi email</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.stats}>
        <Text style={styles.statsText}>
          Tổng số: {subscriptions.length} | 
          Hoạt động: {subscriptions.filter(s => s.isActive).length}
        </Text>
      </View>

      <FlatList
        data={subscriptions}
        renderItem={renderSubscriptionItem}
        keyExtractor={(item) => item.id}
        style={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>Chưa có email đăng ký nào</Text>
          </View>
        }
      />

      {/* Add Email Modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>Thêm email đăng ký</Text>
            
            <TextInput
              style={styles.emailInput}
              value={email}
              onChangeText={setEmail}
              placeholder="Nhập địa chỉ email..."
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => {
                  setModalVisible(false);
                  setEmail('');
                }}>
                <Text style={styles.cancelButtonText}>Hủy</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.addButton}
                onPress={addSubscription}>
                <Text style={styles.addButtonText}>Thêm</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Send Email Modal */}
      <Modal
        visible={sendModalVisible}
        animationType="slide"
        presentationStyle="formSheet">
        <View style={styles.sendModalContainer}>
          <View style={styles.sendModalHeader}>
            <Text style={styles.sendModalTitle}>Gửi email hàng loạt</Text>
            <TouchableOpacity onPress={() => setSendModalVisible(false)}>
              <Text style={styles.closeButton}>✕</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.sendModalContent}>
            <Text style={styles.label}>Tiêu đề:</Text>
            <TextInput
              style={styles.subjectInput}
              value={subject}
              onChangeText={setSubject}
              placeholder="Nhập tiêu đề email..."
            />

            <Text style={styles.label}>Nội dung:</Text>
            <TextInput
              style={styles.messageInput}
              value={message}
              onChangeText={setMessage}
              placeholder="Nhập nội dung email..."
              multiline
              textAlignVertical="top"
            />

            <View style={styles.sendModalButtons}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => {
                  setSendModalVisible(false);
                  setSubject('');
                  setMessage('');
                }}>
                <Text style={styles.cancelButtonText}>Hủy</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.sendEmailButton}
                onPress={sendEmailToAll}>
                <Text style={styles.sendEmailButtonText}>Gửi</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    backgroundColor: '#7137ea',
    paddingVertical: 15,
    paddingHorizontal: 20,
  },
  headerTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 10,
  },
  headerButtons: {
    flexDirection: 'row',
    gap: 10,
  },
  headerButton: {
    backgroundColor: '#fff',
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 8,
  },
  sendButton: {
    backgroundColor: '#28a745',
  },
  headerButtonText: {
    color: '#7137ea',
    fontWeight: '600',
    fontSize: 12,
  },
  stats: {
    backgroundColor: '#e9ecef',
    paddingVertical: 10,
    paddingHorizontal: 20,
  },
  statsText: {
    fontSize: 14,
    color: '#666',
  },
  list: {
    flex: 1,
    paddingHorizontal: 15,
    paddingTop: 10,
  },
  subscriptionItem: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 15,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  subscriptionInfo: {
    marginBottom: 12,
  },
  emailText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 5,
  },
  dateText: {
    fontSize: 12,
    color: '#999',
    marginBottom: 8,
  },
  statusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  activeBadge: {
    backgroundColor: '#d4edda',
  },
  inactiveBadge: {
    backgroundColor: '#f8d7da',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '500',
  },
  activeText: {
    color: '#155724',
  },
  inactiveText: {
    color: '#721c24',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  toggleButton: {
    backgroundColor: '#17a2b8',
  },
  deleteButton: {
    backgroundColor: '#dc3545',
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 50,
  },
  emptyText: {
    color: '#999',
    fontSize: 16,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    width: '90%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 20,
    color: '#333',
  },
  emailInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 20,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#6c757d',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  addButton: {
    flex: 1,
    backgroundColor: '#7137ea',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  addButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  sendModalContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  sendModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  sendModalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  closeButton: {
    fontSize: 24,
    color: '#999',
  },
  sendModalContent: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  subjectInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 20,
  },
  messageInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    height: 200,
    marginBottom: 30,
  },
  sendModalButtons: {
    flexDirection: 'row',
    gap: 12,
    paddingBottom: 20,
  },
  sendEmailButton: {
    flex: 1,
    backgroundColor: '#28a745',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  sendEmailButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default EmailSubscriptionScreen;