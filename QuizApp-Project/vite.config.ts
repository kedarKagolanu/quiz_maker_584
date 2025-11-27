import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    // Optimize bundle splitting
    rollupOptions: {
      output: {
        manualChunks: {
          // Vendor libraries
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-ui': ['lucide-react'],
          'vendor-math': ['katex'],
          
          // Application chunks
          'quiz-core': [
            './src/lib/multiQuizGenerator.ts',
            './src/lib/recursiveQuizResolver.ts',
            './src/hooks/useMultiQuizManager.ts',
            './src/hooks/useQuizCreator.ts'
          ],
          'storage': [
            './src/lib/storage/SupabaseDriver.ts',
            './src/lib/storage/LocalStorageDriver.ts',
            './src/lib/storage/StorageService.ts'
          ],
          'components': [
            './src/components/quiz-creator/QuizSourceManager.tsx',
            './src/components/quiz-creator/QuizSettings.tsx',
            './src/components/MusicPlayer.tsx'
          ]
        }
      }
    },
    // Reduce chunk size warning limit
    chunkSizeWarningLimit: 600,
    // Enable source maps for debugging
    sourcemap: false
  },
  // Optimize dev server
  server: {
    port: 8080,
    host: true
  }
})