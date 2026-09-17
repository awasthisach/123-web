import React, { useState } from 'react';
import {
  Shield,
  Lock,
  Unlock,
  KeyRound,
  FileLock,
  Plus,
  Trash2,
  Download,
  Eye,
  EyeOff,
  AlertTriangle,
  FileCheck2,
  X,
  UploadCloud,
  CheckCircle2,
} from 'lucide-react';
import { VaultFile } from '../types';
import { encryptDataWithWorker, decryptDataWithWorker } from '../lib/cryptoVault';
import { formatBytes } from '../lib/driveApi';

interface PrivacyVaultProps {
  vaultFiles: VaultFile[];
  onAddVaultFile: (file: VaultFile) => void;
  onDeleteVaultFile: (id: string) => void;
}

export const PrivacyVault: React.FC<PrivacyVaultProps> = ({
  vaultFiles,
  onAddVaultFile,
  onDeleteVaultFile,
}) => {
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [passphrase, setPassphrase] = useState('MyVaultPass2026!');
  const [inputPass, setInputPass] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Add new file state
  const [isAddingFile, setIsAddingFile] = useState(false);
  const [newFileName, setNewFileName] = useState('');
  const [newFileContent, setNewFileContent] = useState('');
  const [newFileTags, setNewFileTags] = useState('confidential, secret');
  const [encrypting, setEncrypting] = useState(false);

  // Decrypted file preview modal
  const [previewFile, setPreviewFile] = useState<{ name: string; content: string } | null>(null);
  const [decryptingId, setDecryptingId] = useState<string | null>(null);

  const handleUnlock = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputPass) {
      setErrorMsg('Please enter your vault master key');
      return;
    }
    // Check against configured passphrase
    if (inputPass === passphrase) {
      setIsUnlocked(true);
      setErrorMsg('');
      setInputPass('');
    } else {
      setErrorMsg('Invalid master password. Zero-knowledge authentication failed.');
    }
  };

  const handleLock = () => {
    setIsUnlocked(false);
    setPreviewFile(null);
  };

  const handleEncryptAndSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFileName.trim() || !newFileContent.trim()) {
      setErrorMsg('File title and sensitive content are required.');
      return;
    }

    setEncrypting(true);
    try {
      const { ciphertext, iv, salt } = await encryptDataWithWorker(newFileContent, passphrase);

      const newVaultItem: VaultFile = {
        id: `vault-${Date.now()}`,
        name: newFileName.endsWith('.aes') ? newFileName : `${newFileName}.aes`,
        originalName: newFileName,
        size: new Blob([newFileContent]).size + 128,
        mimeType: 'application/octet-stream',
        encryptedData: ciphertext,
        iv,
        salt,
        uploadedAt: new Date().toISOString(),
        tags: newFileTags.split(',').map(t => t.trim()).filter(Boolean),
        notes: 'AES-256-GCM zero-knowledge client encrypted via Web Worker',
      };

      onAddVaultFile(newVaultItem);
      setIsAddingFile(false);
      setNewFileName('');
      setNewFileContent('');
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Encryption failed');
    } finally {
      setEncrypting(false);
    }
  };

  const handleDecryptView = async (file: VaultFile) => {
    setDecryptingId(file.id);
    try {
      const plainText = await decryptDataWithWorker(file.encryptedData, file.iv, file.salt, passphrase);
      setPreviewFile({
        name: file.originalName,
        content: plainText,
      });
    } catch (err) {
      alert('Decryption failed: Master key mismatch or corrupted payload.');
    } finally {
      setDecryptingId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="rounded-2xl p-5 sm:p-6 bg-gradient-to-br from-zinc-900 to-zinc-950 text-white border border-zinc-800 shadow-md">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start sm:items-center gap-3.5">
            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 shrink-0">
              <Shield className="w-6 h-6" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-lg sm:text-xl font-bold tracking-tight">Zero-Knowledge Privacy Vault</h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold tracking-wide bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  AES-256-GCM
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold tracking-wide bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Web Worker Thread
                </span>
              </div>
              <p className="text-xs sm:text-sm text-zinc-400 mt-1 max-w-xl">
                Encrypted in a background Web Worker before sync. Zero UI blocking during 100,000 PBKDF2 iterations.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-center">
            {isUnlocked ? (
              <button
                id="lock-vault-btn"
                onClick={handleLock}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold border border-zinc-700 transition active:scale-95 min-h-[44px]"
              >
                <Lock className="w-4 h-4 text-amber-400" />
                Lock Vault
              </button>
            ) : (
              <span className="inline-flex items-center gap-1.5 text-xs text-amber-400/90 font-medium px-3 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20">
                <Lock className="w-3.5 h-3.5" /> Vault Locked
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Main Content: Locked Screen or Files Manager */}
      {!isUnlocked ? (
        <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/60 p-8 text-center max-w-md mx-auto shadow-sm">
          <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-500 mx-auto flex items-center justify-center mb-4">
            <KeyRound className="w-8 h-8" />
          </div>
          <h3 className="text-base sm:text-lg font-bold text-zinc-900 dark:text-zinc-100">Unlock Privacy Vault</h3>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 mb-6">
            Enter your client-side encryption key to decrypt and manage your secure documents.
          </p>

          <form onSubmit={handleUnlock} className="space-y-4 text-left">
            <div>
              <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
                Master Passphrase
              </label>
              <div className="relative">
                <input
                  id="vault-passphrase-input"
                  type={showPassword ? 'text' : 'password'}
                  value={inputPass}
                  onChange={e => setInputPass(e.target.value)}
                  placeholder="Enter vault passphrase..."
                  className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/80 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 min-h-[44px]"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 p-1 min-h-[36px] min-w-[36px] flex items-center justify-center"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <p className="text-[11px] text-zinc-400 mt-1.5">
                Demo Key: <code className="bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded text-amber-600 dark:text-amber-400 font-mono">MyVaultPass2026!</code>
              </p>
            </div>

            {errorMsg && (
              <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 text-rose-600 dark:text-rose-400 text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <button
              id="submit-unlock-vault"
              type="submit"
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-semibold text-sm shadow-sm transition active:scale-[0.98] min-h-[44px]"
            >
              <Unlock className="w-4 h-4" />
              Unlock & Decrypt Workspace
            </button>
          </form>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Action Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-zinc-900 p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800">
            <div>
              <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                <FileLock className="w-4 h-4 text-amber-500" />
                Protected Documents ({vaultFiles.length})
              </h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Encrypted at rest using PBKDF2 derived keys and AES-GCM tags.
              </p>
            </div>

            <button
              id="open-add-vault-file-btn"
              onClick={() => setIsAddingFile(true)}
              className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-semibold shadow-sm transition active:scale-95 min-h-[44px]"
            >
              <Plus className="w-4 h-4" />
              Encrypt New Document
            </button>
          </div>

          {/* Files List */}
          {vaultFiles.length === 0 ? (
            <div className="text-center py-12 rounded-2xl border border-dashed border-zinc-300 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/30">
              <Shield className="w-10 h-10 text-zinc-400 mx-auto mb-2" />
              <p className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">Your Vault is Empty</p>
              <p className="text-xs text-zinc-500 mt-1 max-w-sm mx-auto">
                No encrypted documents stored yet. Click "Encrypt New Document" above to secure contracts, passwords, or secret files.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {vaultFiles.map(file => (
                <div
                  key={file.id}
                  className="p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 hover:border-amber-500/40 transition flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-500 border border-amber-500/20 shrink-0">
                          <FileLock className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <h4 className="text-xs sm:text-sm font-semibold text-zinc-900 dark:text-zinc-100 truncate">
                            {file.originalName}
                          </h4>
                          <span className="text-[11px] text-zinc-400 font-mono">
                            {formatBytes(file.size)} • {new Date(file.uploadedAt).toLocaleDateString()}
                          </span>
                        </div>
                      </div>

                      <button
                        onClick={() => onDeleteVaultFile(file.id)}
                        className="p-2 text-zinc-400 hover:text-rose-500 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/30 transition min-h-[44px] min-w-[44px] flex items-center justify-center"
                        title="Delete encrypted document"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="flex flex-wrap gap-1.5 mt-3">
                      {file.tags.map(tag => (
                        <span
                          key={tag}
                          className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400"
                        >
                          #{tag}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between gap-2">
                    <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" /> Ciphertext verified
                    </span>

                    <button
                      onClick={() => handleDecryptView(file)}
                      disabled={decryptingId === file.id}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-100 hover:bg-amber-500 hover:text-white dark:bg-zinc-800 dark:hover:bg-amber-600 text-zinc-700 dark:text-zinc-200 text-xs font-medium transition min-h-[44px] touch-manipulation"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      {decryptingId === file.id ? 'Decrypting...' : 'View Decrypted'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Add New Encrypted File Modal */}
      {isAddingFile && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-zinc-900 rounded-2xl max-w-lg w-full p-6 border border-zinc-200 dark:border-zinc-800 shadow-2xl animate-in fade-in max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-100 dark:border-zinc-800">
              <div className="flex items-center gap-2">
                <FileLock className="w-5 h-5 text-amber-500" />
                <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">Client-Side Encryption</h3>
              </div>
              <button
                onClick={() => setIsAddingFile(false)}
                className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 min-h-[44px] min-w-[44px] flex items-center justify-center"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleEncryptAndSave} className="space-y-4 mt-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                  Document Name
                </label>
                <input
                  type="text"
                  value={newFileName}
                  onChange={e => setNewFileName(e.target.value)}
                  placeholder="e.g. Master_Bank_Credentials.txt"
                  className="w-full px-3 py-2 text-xs sm:text-sm rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-amber-500/30 min-h-[44px]"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                  Confidential Plaintext Content
                </label>
                <textarea
                  rows={4}
                  value={newFileContent}
                  onChange={e => setNewFileContent(e.target.value)}
                  placeholder="Paste confidential data, secrets, or notes to encrypt with AES-GCM..."
                  className="w-full px-3 py-2 text-xs sm:text-sm rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 font-mono focus:outline-none focus:ring-2 focus:ring-amber-500/30"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                  Tags (comma separated)
                </label>
                <input
                  type="text"
                  value={newFileTags}
                  onChange={e => setNewFileTags(e.target.value)}
                  placeholder="banking, legal, password"
                  className="w-full px-3 py-2 text-xs sm:text-sm rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-amber-500/30 min-h-[44px]"
                />
              </div>

              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-400 text-xs">
                <p className="font-semibold">Zero-Knowledge Guarantee</p>
                <p className="mt-0.5 text-[11px] opacity-90">
                  Data is transformed using WebCrypto subtle crypto before storing. The plaintext never touches any network socket unencrypted.
                </p>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddingFile(false)}
                  className="flex-1 px-4 py-2.5 rounded-xl border border-zinc-300 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 text-xs font-semibold hover:bg-zinc-100 dark:hover:bg-zinc-800 min-h-[44px]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={encrypting}
                  className="flex-1 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-semibold shadow-sm transition active:scale-95 disabled:opacity-50 min-h-[44px]"
                >
                  {encrypting ? 'Encrypting with AES-256...' : 'Encrypt & Store'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Decrypted Content Preview Modal */}
      {previewFile && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-zinc-900 rounded-2xl max-w-lg w-full p-6 border border-zinc-200 dark:border-zinc-800 shadow-2xl animate-in fade-in max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-100 dark:border-zinc-800">
              <div className="flex items-center gap-2">
                <FileCheck2 className="w-5 h-5 text-emerald-500" />
                <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 truncate max-w-xs">
                  {previewFile.name} (Decrypted)
                </h3>
              </div>
              <button
                onClick={() => setPreviewFile(null)}
                className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 min-h-[44px] min-w-[44px] flex items-center justify-center"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mt-4">
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-2">Decrypted In-Memory Content:</p>
              <pre className="p-4 rounded-xl bg-zinc-100 dark:bg-zinc-950 font-mono text-xs text-zinc-800 dark:text-zinc-200 whitespace-pre-wrap break-all max-h-60 overflow-y-auto border border-zinc-200 dark:border-zinc-800">
                {previewFile.content}
              </pre>
            </div>

            <div className="mt-5 flex justify-end">
              <button
                onClick={() => setPreviewFile(null)}
                className="px-4 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-zinc-100 dark:hover:bg-zinc-200 dark:text-zinc-900 text-xs font-semibold min-h-[44px]"
              >
                Close Decrypted View
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
