const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/v1';
export const api = {
  get: (p: string) => fetch(`${API_URL}${p}`).then(r => r.json()),
  post: (p: string, b: any) => fetch(`${API_URL}${p}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(b) }).then(r => r.json())
};
