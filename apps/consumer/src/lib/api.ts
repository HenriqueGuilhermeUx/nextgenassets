const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/v1';
export const api = {
  get: (p: string, headers?: Record<string, string>) => fetch(`${API_URL}${p}`, { headers: headers as any }).then(r => r.json()),
  post: (p: string, b: any, headers?: Record<string, string>) => fetch(`${API_URL}${p}`, { method: 'POST', headers: { 'Content-Type': 'application/json', ...(headers as any) }, body: JSON.stringify(b) }).then(r => r.json())
};
