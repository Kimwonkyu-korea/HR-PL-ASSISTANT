export interface GenerateOptions {
  apiKey: string
  systemPrompt: string
  userPrompt: string
  model?: string
  onChunk?: (text: string) => void
}

export async function generateWithClaude(opts: GenerateOptions): Promise<string> {
  const { apiKey, systemPrompt, userPrompt, model, onChunk } = opts

  const res = await fetch('/api/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ apiKey, systemPrompt, userPrompt, model }),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: '알 수 없는 오류' }))
    throw new Error(err.error || `HTTP ${res.status}`)
  }

  if (!res.body) throw new Error('스트림 응답 없음')

  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let result = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    const chunk = decoder.decode(value, { stream: true })
    result += chunk
    onChunk?.(chunk)
  }

  return result
}
