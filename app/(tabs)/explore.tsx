import { StyleSheet, View } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors } from '@/constants/theme';

export default function ExploreScreen() {
  const colorScheme = useColorScheme();
  
  return (
    <ThemedView style={styles.container}>
      <View style={styles.header}>
        <IconSymbol 
          size={80} 
          name="magnifyingglass" 
          color={Colors[colorScheme ?? 'light'].tint}
        />
        <ThemedText type="title" style={styles.title}>Explore</ThemedText>
        <ThemedText style={styles.subtitle}>
          Discover new features and insights
        </ThemedText>
      </View>
      
      <View style={styles.content}>
        <ThemedView style={styles.placeholder}>
          <IconSymbol 
            size={48} 
            name="sparkles" 
            color={Colors[colorScheme ?? 'light'].tabIconDefault}
          />
          <ThemedText style={styles.placeholderText}>
            Additional features will be implemented here
          </ThemedText>
          <ThemedText style={styles.features}>
            • Mood insights and analytics
            • Wellness resources
            • Community features
            • Achievement tracking
          </ThemedText>
        </ThemedView>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
  header: {
    alignItems: 'center',
    paddingTop: 60,
    paddingBottom: 40,
  },
  title: {
    marginTop: 16,
    marginBottom: 8,
  },
  subtitle: {
    textAlign: 'center',
    opacity: 0.7,
    paddingHorizontal: 20,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
  },
  placeholder: {
    alignItems: 'center',
    padding: 30,
    borderRadius: 16,
    marginHorizontal: 10,
  },
  placeholderText: {
    marginTop: 16,
    marginBottom: 20,
    textAlign: 'center',
    fontSize: 16,
  },
  features: {
    textAlign: 'center',
    lineHeight: 24,
    opacity: 0.8,
  },
});
