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
  ScrollView,
  RefreshControl,
} from 'react-native';
import {knowledgeService} from '../services/knowledgeService';
import {Knowledge} from '../types';

const KnowledgeAdminScreen: React.FC = () => {
  const [knowledge, setKnowledge] = useState<Knowledge[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingItem, setEditingItem] = useState<Knowledge | null>(null);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');

  useEffect(() => {
    loadKnowledge();
  }, []);

  const loadKnowledge = async () => {
    setLoading(true);
    try {
      const result = await knowledgeService.getKnowledge();
      if (result.success && result.data) {
        setKnowledge(result.data);
      } else {
        Alert.alert('Lỗi', result.message || 'Không thể tải dữ liệu');
      }
    } catch (error) {
      Alert.alert('Lỗi', 'Có lỗi xảy ra khi tải dữ liệu');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadKnowledge();
  };

  const openModal = (item?: Knowledge) => {
    if (item) {
      setEditingItem(item);
      setTitle(item.title);
      setContent(item.content);
    } else {
      setEditingItem(null);
      setTitle('');
      setContent('');
    }
    setModalVisible(true);
  };

  const closeModal = () => {
    setModalVisible(false);
    setEditingItem(null);
    setTitle('');
    setContent('');
  };

  const saveKnowledge = async () => {
    if (!title.trim() || !content.trim()) {
      Alert.alert('Lỗi', 'Vui lòng nhập đầy đủ tiêu đề và nội dung');
      return;
    }

    setLoading(true);
    try {
      let result;
      if (editingItem) {
        result = await knowledgeService.updateKnowledge(editingItem.id, title.trim(), content.trim());
      } else {
        result = await knowledgeService.addKnowledge(title.trim(), content.trim());
      }

      if (result.success) {
        Alert.alert('Thành công', editingItem ? 'Đã cập nhật kiến thức' : 'Đã thêm kiến thức mới');
        closeModal();
        loadKnowledge();
      } else {
        Alert.alert('Lỗi', result.message || 'Không thể lưu kiến thức');
      }
    } catch (error) {
      Alert.alert('Lỗi', 'Có lỗi xảy ra khi lưu');
    } finally {
      setLoading(false);
    }
  };

  const deleteKnowledge = async (item: Knowledge) => {
    Alert.alert(
      'Xác nhận xóa',
      `Bạn có chắc chắn muốn xóa "${item.title}"?`,
      [
        {text: 'Hủy', style: 'cancel'},
        {
          text: 'Xóa',
          style: 'destructive',
          onPress: async () => {
            try {
              const result = await knowledgeService.deleteKnowledge(item.id);
              if (result.success) {
                Alert.alert('Thành công', 'Đã xóa kiến thức');
                loadKnowledge();
              } else {
                Alert.alert('Lỗi', result.message || 'Không thể xóa kiến thức');
              }
            } catch (error) {
              Alert.alert('Lỗi', 'Có lỗi xảy ra khi xóa');
            }
          },
        },
      ],
    );
  };

  const chunkKnowledge = async (item: Knowledge) => {
    Alert.alert(
      'Xác nhận chunk',
      `Bạn có muốn chunk lại kiến thức "${item.title}"?`,
      [
        {text: 'Hủy', style: 'cancel'},
        {
          text: 'Chunk',
          onPress: async () => {
            try {
              const result = await knowledgeService.chunkKnowledge(item.id);
              if (result.success) {
                Alert.alert('Thành công', 'Đã chunk lại kiến thức');
              } else {
                Alert.alert('Lỗi', result.message || 'Không thể chunk kiến thức');
              }
            } catch (error) {
              Alert.alert('Lỗi', 'Có lỗi xảy ra khi chunk');
            }
          },
        },
      ],
    );
  };

  const renderKnowledgeItem = ({item}: {item: Knowledge}) => (
    <View style={styles.knowledgeItem}>
      <Text style={styles.knowledgeTitle}>{item.title}</Text>
      <Text style={styles.knowledgeContent} numberOfLines={3}>
        {item.content}
      </Text>
      <Text style={styles.knowledgeDate}>
        Tạo: {new Date(item.createdAt).toLocaleDateString('vi-VN')}
      </Text>
      
      <View style={styles.actionButtons}>
        <TouchableOpacity
          style={[styles.actionButton, styles.editButton]}
          onPress={() => openModal(item)}>
          <Text style={styles.actionButtonText}>Sửa</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.actionButton, styles.chunkButton]}
          onPress={() => chunkKnowledge(item)}>
          <Text style={styles.actionButtonText}>Chunk</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.actionButton, styles.deleteButton]}
          onPress={() => deleteKnowledge(item)}>
          <Text style={styles.actionButtonText}>Xóa</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>📚 Quản lý kiến thức</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => openModal()}>
          <Text style={styles.addButtonText}>+ Thêm</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={knowledge}
        renderItem={renderKnowledgeItem}
        keyExtractor={(item) => item.id}
        style={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>Chưa có kiến thức nào</Text>
          </View>
        }
      />

      <Modal
        visible={modalVisible}
        animationType="slide"
        presentationStyle="formSheet">
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>
              {editingItem ? 'Chỉnh sửa kiến thức' : 'Thêm kiến thức mới'}
            </Text>
            <TouchableOpacity onPress={closeModal}>
              <Text style={styles.closeButton}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            <Text style={styles.label}>Tiêu đề:</Text>
            <TextInput
              style={styles.titleInput}
              value={title}
              onChangeText={setTitle}
              placeholder="Nhập tiêu đề..."
            />

            <Text style={styles.label}>Nội dung:</Text>
            <TextInput
              style={styles.contentInput}
              value={content}
              onChangeText={setContent}
              placeholder="Nhập nội dung..."
              multiline
              textAlignVertical="top"
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={closeModal}>
                <Text style={styles.cancelButtonText}>Hủy</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.saveButton, loading && styles.saveButtonDisabled]}
                onPress={saveKnowledge}
                disabled={loading}>
                <Text style={styles.saveButtonText}>
                  {loading ? 'Đang lưu...' : 'Lưu'}
                </Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#7137ea',
    paddingVertical: 15,
    paddingHorizontal: 20,
  },
  headerTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  addButton: {
    backgroundColor: '#fff',
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 8,
  },
  addButtonText: {
    color: '#7137ea',
    fontWeight: '600',
  },
  list: {
    flex: 1,
    paddingHorizontal: 15,
    paddingTop: 10,
  },
  knowledgeItem: {
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
  knowledgeTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  knowledgeContent: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginBottom: 8,
  },
  knowledgeDate: {
    fontSize: 12,
    color: '#999',
    marginBottom: 12,
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
  editButton: {
    backgroundColor: '#17a2b8',
  },
  chunkButton: {
    backgroundColor: '#ffc107',
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
  modalContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  closeButton: {
    fontSize: 24,
    color: '#999',
  },
  modalContent: {
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
  titleInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 20,
  },
  contentInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    height: 200,
    marginBottom: 30,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
    paddingBottom: 20,
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
  saveButton: {
    flex: 1,
    backgroundColor: '#7137ea',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  saveButtonDisabled: {
    backgroundColor: '#ccc',
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default KnowledgeAdminScreen;