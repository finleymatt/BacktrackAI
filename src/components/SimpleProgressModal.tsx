import React from 'react';
import { View, StyleSheet, Modal, Dimensions } from 'react-native';
import { Text } from './Text';
import { Card } from './Card';
import { useTheme } from '../theme/ThemeContext';

interface SimpleProgressModalProps {
  visible: boolean;
  progress: number; // 0-100
  title: string;
  subtitle?: string;
  currentItem?: string;
  totalItems?: number;
  processedItems?: number;
}

export const SimpleProgressModal: React.FC<SimpleProgressModalProps> = ({
  visible,
  progress,
  title,
  subtitle,
  currentItem,
  totalItems,
  processedItems,
}) => {
  const { theme } = useTheme();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
    >
      <View style={styles.overlay}>
        <Card style={[styles.modal, { backgroundColor: theme.colors.surface }]}>
          <Text variant="h3" style={[styles.title, { color: theme.colors.text }]}>
            {title}
          </Text>
          
          {subtitle && (
            <Text variant="body" style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
              {subtitle}
            </Text>
          )}

          <View style={styles.progressContainer}>
            {/* Simple progress bar */}
            <View style={[styles.progressBarBackground, { backgroundColor: theme.colors.border }]}>
              <View 
                style={[
                  styles.progressBarFill, 
                  { 
                    backgroundColor: theme.colors.primary,
                    width: `${progress}%`
                  }
                ]} 
              />
            </View>
            
            <Text variant="h2" style={[styles.percentage, { color: theme.colors.primary }]}>
              {Math.round(progress)}%
            </Text>
            
            {processedItems !== undefined && totalItems && (
              <Text variant="caption" style={[styles.progressText, { color: theme.colors.textSecondary }]}>
                {processedItems}/{totalItems} items
              </Text>
            )}
          </View>

          {currentItem && (
            <View style={styles.currentItemContainer}>
              <Text variant="caption" style={[styles.currentItemLabel, { color: theme.colors.textSecondary }]}>
                Processing:
              </Text>
              <Text variant="body" style={[styles.currentItem, { color: theme.colors.text }]} numberOfLines={2}>
                {currentItem}
              </Text>
            </View>
          )}

          <View style={styles.statsContainer}>
            {totalItems && (
              <Text variant="caption" style={[styles.stat, { color: theme.colors.textSecondary }]}>
                Total Items: {totalItems}
              </Text>
            )}
            {processedItems !== undefined && (
              <Text variant="caption" style={[styles.stat, { color: theme.colors.textSecondary }]}>
                Processed: {processedItems}
              </Text>
            )}
          </View>
        </Card>
      </View>
    </Modal>
  );
};

const { width } = Dimensions.get('window');

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modal: {
    width: Math.min(width - 40, 320),
    padding: 24,
    alignItems: 'center',
  },
  title: {
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    textAlign: 'center',
    marginBottom: 24,
  },
  progressContainer: {
    width: '100%',
    marginBottom: 24,
    alignItems: 'center',
  },
  progressBarBackground: {
    width: '100%',
    height: 8,
    borderRadius: 4,
    marginBottom: 12,
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  percentage: {
    fontWeight: 'bold',
    marginBottom: 4,
  },
  progressText: {
    marginBottom: 8,
  },
  currentItemContainer: {
    width: '100%',
    marginBottom: 16,
  },
  currentItemLabel: {
    marginBottom: 4,
  },
  currentItem: {
    textAlign: 'center',
    fontStyle: 'italic',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
  },
  stat: {
    textAlign: 'center',
  },
});
