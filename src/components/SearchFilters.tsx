import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity, ScrollView, Modal } from 'react-native';
import { Text, Button, Card } from './index';
import { useTheme } from '../theme/ThemeContext';
import { Source, Platform, Tag } from '../data/models';
import { SearchFilters } from '../features/search';

interface SearchFiltersProps {
  filters: SearchFilters;
  availableFilters: {
    sourceTypes: Source[];
    platforms: Platform[];
    tags: Tag[];
  } | null;
  onFiltersChange: (filters: SearchFilters) => void;
  onClearFilters: () => void;
}

export const SearchFiltersComponent: React.FC<SearchFiltersProps> = ({
  filters,
  availableFilters,
  onFiltersChange,
  onClearFilters,
}) => {
  const { theme } = useTheme();
  const [showModal, setShowModal] = useState(false);

  const hasActiveFilters = 
    (filters.sourceTypes && filters.sourceTypes.length > 0) ||
    (filters.platforms && filters.platforms.length > 0) ||
    (filters.tags && filters.tags.length > 0) ||
    (filters.dateRange && (filters.dateRange.start || filters.dateRange.end));

  const toggleSourceFilter = (source: Source) => {
    const currentSources = filters.sourceTypes || [];
    const newSources = currentSources.includes(source)
      ? currentSources.filter(s => s !== source)
      : [...currentSources, source];
    
    onFiltersChange({
      ...filters,
      sourceTypes: newSources.length > 0 ? newSources : undefined,
    });
  };

  const togglePlatformFilter = (platform: Platform) => {
    const currentPlatforms = filters.platforms || [];
    const newPlatforms = currentPlatforms.includes(platform)
      ? currentPlatforms.filter(p => p !== platform)
      : [...currentPlatforms, platform];
    
    onFiltersChange({
      ...filters,
      platforms: newPlatforms.length > 0 ? newPlatforms : undefined,
    });
  };

  const toggleTagFilter = (tagName: string) => {
    const currentTags = filters.tags || [];
    const newTags = currentTags.includes(tagName)
      ? currentTags.filter(t => t !== tagName)
      : [...currentTags, tagName];
    
    onFiltersChange({
      ...filters,
      tags: newTags.length > 0 ? newTags : undefined,
    });
  };

  const FilterChip: React.FC<{
    label: string;
    isActive: boolean;
    onPress: () => void;
    color?: string;
  }> = ({ label, isActive, onPress, color }) => (
    <TouchableOpacity
      style={[
        styles.filterChip,
        {
          backgroundColor: isActive 
            ? (color || theme.colors.primary) 
            : theme.colors.surface,
          borderColor: isActive 
            ? (color || theme.colors.primary) 
            : theme.colors.border,
        }
      ]}
      onPress={onPress}
    >
      <Text 
        variant="caption" 
        style={[
          styles.filterChipText,
          { 
            color: isActive 
              ? theme.colors.onPrimary 
              : theme.colors.text 
          }
        ]}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );

  const FilterSection: React.FC<{
    title: string;
    children: React.ReactNode;
  }> = ({ title, children }) => (
    <View style={styles.filterSection}>
      <Text variant="h4" style={styles.filterSectionTitle}>
        {title}
      </Text>
      <View style={styles.filterChips}>
        {children}
      </View>
    </View>
  );

  return (
    <>
      <View style={styles.container}>
        <TouchableOpacity
          style={[
            styles.filterButton,
            {
              backgroundColor: hasActiveFilters 
                ? theme.colors.primary 
                : theme.colors.surface,
              borderColor: theme.colors.border,
            }
          ]}
          onPress={() => setShowModal(true)}
        >
          <Text 
            variant="button" 
            style={[
              styles.filterButtonText,
              { 
                color: hasActiveFilters 
                  ? theme.colors.onPrimary 
                  : theme.colors.text 
              }
            ]}
          >
            🔍 Filters {hasActiveFilters ? `(${[
              ...(filters.sourceTypes || []),
              ...(filters.platforms || []),
              ...(filters.tags || []),
            ].length})` : ''}
          </Text>
        </TouchableOpacity>

        {hasActiveFilters && (
          <TouchableOpacity
            style={[styles.clearButton, { borderColor: theme.colors.border }]}
            onPress={onClearFilters}
          >
            <Text variant="caption" style={styles.clearButtonText}>
              Clear
            </Text>
          </TouchableOpacity>
        )}
      </View>

      <Modal
        visible={showModal}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View style={[styles.modalContainer, { backgroundColor: theme.colors.background }]}>
          <View style={[styles.modalHeader, { borderBottomColor: theme.colors.border }]}>
            <Text variant="h2" style={styles.modalTitle}>
              Search Filters
            </Text>
            <TouchableOpacity onPress={() => setShowModal(false)}>
              <Text variant="button" style={[styles.closeButton, { color: theme.colors.primary }]}>
                Done
              </Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
            {availableFilters && (
              <>
                <FilterSection title="Source Type">
                  {availableFilters.sourceTypes.map(source => (
                    <FilterChip
                      key={source}
                      label={source.replace('_', ' ').toUpperCase()}
                      isActive={filters.sourceTypes?.includes(source) || false}
                      onPress={() => toggleSourceFilter(source)}
                    />
                  ))}
                </FilterSection>

                <FilterSection title="Platform">
                  {availableFilters.platforms.map(platform => (
                    <FilterChip
                      key={platform}
                      label={platform.toUpperCase()}
                      isActive={filters.platforms?.includes(platform) || false}
                      onPress={() => togglePlatformFilter(platform)}
                    />
                  ))}
                </FilterSection>

                <FilterSection title="Tags">
                  {availableFilters.tags.map(tag => (
                    <FilterChip
                      key={tag.id}
                      label={tag.name}
                      isActive={filters.tags?.includes(tag.name) || false}
                      onPress={() => toggleTagFilter(tag.name)}
                      color={tag.color}
                    />
                  ))}
                </FilterSection>
              </>
            )}

            <View style={styles.modalActions}>
              <Button
                variant="outline"
                onPress={onClearFilters}
                style={styles.clearAllButton}
              >
                Clear All Filters
              </Button>
            </View>
          </ScrollView>
        </View>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 8,
  },
  filterButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
  },
  filterButtonText: {
    fontWeight: '500',
  },
  clearButton: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
  },
  clearButtonText: {
    color: '#FF3B30',
    fontWeight: '500',
  },
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontWeight: '600',
  },
  closeButton: {
    fontWeight: '500',
  },
  modalContent: {
    flex: 1,
    padding: 16,
  },
  filterSection: {
    marginBottom: 24,
  },
  filterSectionTitle: {
    marginBottom: 12,
    fontWeight: '600',
  },
  filterChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  filterChip: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 16,
    borderWidth: 1,
  },
  filterChipText: {
    fontWeight: '500',
  },
  modalActions: {
    marginTop: 24,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 0, 0, 0.1)',
  },
  clearAllButton: {
    alignSelf: 'center',
  },
});
