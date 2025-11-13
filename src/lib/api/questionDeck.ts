import { apiRequest, BASE_URL } from './client';
import type { ApiResponse } from '../types/api';
import type {
  ListFilesData,
  QuestionDeckContent,
} from '../types/questionDeck';

export async function listFiles(): Promise<ApiResponse<ListFilesData>> {
  return apiRequest<ListFilesData>('/api/list', { method: 'GET' });
}

export async function getDeck(
  filename: string
): Promise<ApiResponse<QuestionDeckContent>> {
  const params = new URLSearchParams({ data_only: 'false' });
  const path = `/api/getContentByName/${encodeURIComponent(filename)}?${params.toString()}`;
  return apiRequest<QuestionDeckContent>(path, { method: 'GET' });
}

// data_only = true 时，返回的是 data 内的内容，不包含外层包装
export async function getDeckDataOnly(
  filename: string
): Promise<QuestionDeckContent | null> {
  const params = new URLSearchParams({ data_only: 'true' });
  const url = `${BASE_URL}/api/getContentByName/${encodeURIComponent(filename)}?${params.toString()}`;
  try {
    const resp = await fetch(url);
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const data = (await resp.json()) as QuestionDeckContent;
    return data;
  } catch (e) {
    console.error('getDeckDataOnly failed', e);
    return null;
  }
}

export async function updateDeck(
  filename: string,
  content: QuestionDeckContent
): Promise<ApiResponse<void>> {
  return apiRequest<void>('/api/update', {
    method: 'POST',
    body: JSON.stringify({ filename, content }),
  });
}

export async function removeFile(filename: string): Promise<ApiResponse<void>> {
  return apiRequest<void>('/api/remove', {
    method: 'POST',
    body: JSON.stringify({ filename }),
  });
}
