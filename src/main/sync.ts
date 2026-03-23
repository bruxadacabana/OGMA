/**
 * OGMA Sync — rclone integration
 * Pull antes de abrir o banco. Push (com WAL checkpoint) antes de encerrar.
 */

import { spawn } from 'child_process'
import { DATA_DIR } from './paths'
import { getDb } from './database'
import { createLogger } from './logger'

const log = createLogger('sync')

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Normaliza separadores para rclone (sempre forward slash) */
function toRclonePath(p: string): string {
  return p.replace(/\\/g, '/')
}

/** Executa rclone de forma assíncrona e resolve/rejeita com o código de saída */
function runRclone(args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    log.info('rclone', { args: args.join(' ') })

    const proc = spawn('rclone', args, { stdio: ['ignore', 'pipe', 'pipe'], shell: true })

    proc.stdout.on('data', (d: Buffer) => {
      const line = d.toString().trim()
      if (line) log.info('rclone stdout', { line })
    })
    proc.stderr.on('data', (d: Buffer) => {
      const line = d.toString().trim()
      if (line) log.info('rclone stderr', { line })
    })

    proc.on('close', (code) => {
      if (code === 0) {
        log.info('rclone concluído', { code })
        resolve()
      } else {
        const err = new Error(`rclone saiu com código ${code}`)
        log.error('rclone falhou', { code })
        reject(err)
      }
    })

    proc.on('error', (e) => {
      log.error('rclone não encontrado', { error: e.message })
      reject(e)
    })
  })
}

// ── API pública ───────────────────────────────────────────────────────────────

/**
 * Pull: copia ficheiros do remote para data/ local.
 * Deve ser chamado ANTES de getDb().
 * Exclui a pasta logs/ (não precisa de sync).
 */
export async function syncPull(remote: string): Promise<void> {
  const src = toRclonePath(remote.replace(/\/?$/, '/'))
  const dst = toRclonePath(DATA_DIR.replace(/\/?$/, '/'))

  log.info('Sync pull', { src, dst })
  await runRclone(['sync', src, dst, '--exclude', 'logs/**', '--create-empty-src-dirs'])
}

/**
 * Push: copia ficheiros de data/ local para o remote.
 * Força WAL checkpoint antes de enviar para garantir consistência do .db.
 * Exclui a pasta logs/.
 */
export async function syncPush(remote: string): Promise<void> {
  // Checkpoint WAL para garantir que ogma.db está consolidado
  try {
    const db = getDb()
    db.pragma('wal_checkpoint(TRUNCATE)')
    log.info('WAL checkpoint concluído')
  } catch (e) {
    log.error('WAL checkpoint falhou', { error: String(e) })
  }

  const src = toRclonePath(DATA_DIR.replace(/\/?$/, '/'))
  const dst = toRclonePath(remote.replace(/\/?$/, '/'))

  log.info('Sync push', { src, dst })
  await runRclone(['sync', src, dst, '--exclude', 'logs/**', '--create-empty-src-dirs'])
}
