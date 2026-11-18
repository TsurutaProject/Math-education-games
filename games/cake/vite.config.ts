import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'

function adminEntry(): Plugin {
  return {
    name: 'cake-admin-entry',
    enforce: 'post',
    generateBundle(_options, bundle) {
      const entry = bundle['index.html']
      if (entry?.type === 'asset') {
        this.emitFile({ type: 'asset', fileName: 'admin/index.html',
          source: String(entry.source).replace('<head>', '<head><base href="../">') })
      }
    },
  }
}

export default defineConfig({ plugins: [react(), adminEntry()] })
