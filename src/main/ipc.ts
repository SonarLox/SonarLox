import { ipcMain, dialog } from 'electron'
import { readFile } from 'fs/promises'

ipcMain.handle('open-audio-file', async () => {
  const result = await dialog.showOpenDialog({
    filters: [{ name: 'Audio', extensions: ['mp3', 'wav'] }],
    properties: ['openFile']
  })
  if (result.canceled || !result.filePaths.length) return null
  const nodeBuffer = await readFile(result.filePaths[0])
  const arrayBuffer = nodeBuffer.buffer.slice(
    nodeBuffer.byteOffset,
    nodeBuffer.byteOffset + nodeBuffer.byteLength
  )
  return { buffer: arrayBuffer, name: result.filePaths[0].split(/[\\/]/).pop() }
})
