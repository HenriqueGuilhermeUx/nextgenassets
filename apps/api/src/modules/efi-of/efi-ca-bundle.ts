// ============================================
//  EFI CA BUNDLE (inline pra não depender de filesystem)
//  Carregado do process.cwd() OU inline
// ============================================

import * as fs from 'fs';
import * as path from 'path';

export function loadEfiCaBundle(homolog: boolean = false): Buffer | null {
  const fileName = homolog ? 'efi-chain-homolog.crt' : 'efi-chain-prod.crt';
  const possiblePaths = [
    path.join(process.cwd(), 'apps/api/dist/certs', fileName),
    path.join(process.cwd(), 'apps/api/src/certs', fileName),
    path.join(process.cwd(), 'dist/certs', fileName),
    path.join(process.cwd(), 'src/certs', fileName),
    path.join(__dirname, '..', '..', '..', 'certs', fileName),
    `/etc/secrets/${fileName}`
  ];
  
  for (const p of possiblePaths) {
    try {
      if (fs.existsSync(p)) {
        return fs.readFileSync(p);
      }
    } catch {}
  }
  return null;
}
