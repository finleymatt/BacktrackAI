import React, { useState } from 'react';
import { View, StyleSheet, Modal, Alert, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text, Button, Card, TextInput } from './';
import { useTheme } from '../theme/ThemeContext';

interface CreateFolderModalProps {
  visible: boolean;
  onClose: () => void;
  onCreateFolder: (data: { name: string; description?: string; color?: string; is_public?: boolean }) => Promise<void>;
}

const FOLDER_COLORS = [
  '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7',
  '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E9'
];

export const CreateFolderModal: React.FC<CreateFolderModalProps> = ({
  visible,
  onClose,
  onCreateFolder,
}) => {
  const { theme } = useTheme();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [selectedColor, setSelectedColor] = useState<string | undefined>();
  const [isPublic, setIsPublic] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleCreate = async () => {
    if (!name.trim()) {
      Alert.alert('Error', 'Please enter a folder name');
      return;
    }

    try {
      setLoading(true);
      await onCreateFolder({
        name: name.trim(),
        description: description.trim() || undefined,
        color: selectedColor,
        is_public: isPublic,
      });
      
      // Reset form
      setName('');
      setDescription('');
      setSelectedColor(undefined);
      setIsPublic(false);
      onClose();
    } catch (error) {
      Alert.alert('Error', 'Failed to create folder');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      setName('');
      setDescription('');
      setSelectedColor(undefined);
      setIsPublic(false);
      onClose();
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <View style={styles.header}>
          <Text variant="h2">Create Folder</Text>
          <Button
            title="Cancel"
            variant="outline"
            size="small"
            onPress={handleClose}
            disabled={loading}
          />
        </View>

        <View style={styles.content}>
          <Card style={styles.formCard}>
            <TextInput
              label="Folder Name"
              value={name}
              onChangeText={setName}
              placeholder="Enter folder name"
              maxLength={50}
              disabled={loading}
            />

            <TextInput
              label="Description (Optional)"
              value={description}
              onChangeText={setDescription}
              placeholder="Enter folder description"
              multiline
              numberOfLines={3}
              maxLength={200}
              disabled={loading}
              style={styles.descriptionInput}
            />

            <View style={styles.section}>
              <Text variant="h4" style={styles.sectionTitle}>Color</Text>
              <View style={styles.colorGrid}>
                <TouchableOpacity
                  style={[
                    styles.colorOption,
                    !selectedColor && styles.selectedColor,
                    { borderColor: theme.colors.border }
                  ]}
                  onPress={() => setSelectedColor(undefined)}
                  disabled={loading}
                >
                  <Text variant="caption">None</Text>
                </TouchableOpacity>
                {FOLDER_COLORS.map((color) => (
                  <TouchableOpacity
                    key={color}
                    style={[
                      styles.colorOption,
                      { backgroundColor: color },
                      selectedColor === color && styles.selectedColor,
                      { borderColor: theme.colors.border }
                    ]}
                    onPress={() => setSelectedColor(color)}
                    disabled={loading}
                  />
                ))}
              </View>
            </View>

            <View style={styles.section}>
              <Text variant="h4" style={styles.sectionTitle}>Privacy</Text>
              <TouchableOpacity
                style={[
                  styles.privacyOption,
                  { borderColor: theme.colors.border }
                ]}
                onPress={() => setIsPublic(!isPublic)}
                disabled={loading}
              >
                <View style={styles.privacyInfo}>
                  <Text variant="body" style={styles.privacyTitle}>
                    {isPublic ? '🌐 Public' : '🔒 Private'}
                  </Text>
                  <Text variant="caption" color={theme.colors.textSecondary}>
                    {isPublic 
                      ? 'This folder can be shared with others' 
                      : 'This folder is only visible to you'
                    }
                  </Text>
                </View>
                <View style={[
                  styles.checkbox,
                  { borderColor: theme.colors.border },
                  isPublic && { backgroundColor: theme.colors.primary }
                ]}>
                  {isPublic && <Text style={styles.checkmark}>✓</Text>}
                </View>
              </TouchableOpacity>
            </View>
          </Card>

          <Button
            title="Create Folder"
            onPress={handleCreate}
            loading={loading}
            fullWidth
            style={styles.createButton}
          />
        </View>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  formCard: {
    marginBottom: 16,
  },
  descriptionInput: {
    marginTop: 16,
  },
  section: {
    marginTop: 24,
  },
  sectionTitle: {
    marginBottom: 12,
  },
  colorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  colorOption: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectedColor: {
    borderWidth: 3,
    borderColor: '#007AFF',
  },
  privacyOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderWidth: 1,
    borderRadius: 8,
  },
  privacyInfo: {
    flex: 1,
  },
  privacyTitle: {
    marginBottom: 4,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkmark: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  createButton: {
    marginTop: 'auto',
  },
});
