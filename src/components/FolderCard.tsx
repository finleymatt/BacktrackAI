import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Text, Card } from './';
import { useTheme } from '../theme/ThemeContext';
import { Folder } from '../data/models';

interface FolderCardProps {
  folder: Folder;
  onPress?: () => void;
  onTogglePrivacy?: () => void;
  showPrivacyToggle?: boolean;
}

export const FolderCard: React.FC<FolderCardProps> = ({
  folder,
  onPress,
  onTogglePrivacy,
  showPrivacyToggle = true,
}) => {
  const { theme } = useTheme();

  const getFolderIcon = () => {
    return folder.is_public ? '🌐' : '🔒';
  };

  const getPrivacyText = () => {
    return folder.is_public ? 'Public' : 'Private';
  };

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
      <Card style={styles.card}>
        <View style={styles.header}>
          <View style={styles.titleContainer}>
            <Text variant="h3" style={styles.title}>
              {folder.name}
            </Text>
            {folder.description && (
              <Text variant="body" color={theme.colors.textSecondary} style={styles.description}>
                {folder.description}
              </Text>
            )}
          </View>
          
          {showPrivacyToggle && (
            <TouchableOpacity
              onPress={onTogglePrivacy}
              style={[
                styles.privacyButton,
                { backgroundColor: folder.is_public ? theme.colors.success : theme.colors.surface }
              ]}
            >
              <Text style={styles.privacyIcon}>{getFolderIcon()}</Text>
            </TouchableOpacity>
          )}
        </View>
        
        <View style={styles.footer}>
          <Text variant="caption" color={theme.colors.textSecondary}>
            {getPrivacyText()}
          </Text>
          {folder.color && (
            <View style={[styles.colorIndicator, { backgroundColor: folder.color }]} />
          )}
        </View>
      </Card>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    marginBottom: 12,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  titleContainer: {
    flex: 1,
    marginRight: 12,
  },
  title: {
    marginBottom: 4,
  },
  description: {
    lineHeight: 18,
  },
  privacyButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.1)',
  },
  privacyIcon: {
    fontSize: 16,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  colorIndicator: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.1)',
  },
});
