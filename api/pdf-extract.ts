/// <reference types="node" />

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  })
}

export async function OPTIONS() {
  return new Response(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  })
}

export async function POST(request: Request) {
  const apiKey = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY
  if (!apiKey) {
    return json({ ok: false, error: 'GEMINI_API_KEY not configured' }, 500)
  }

  let body: { pdf_base64?: string; file_name?: string }
  try {
    body = await request.json()
  } catch (e) {
    return json({ ok: false, error: `Invalid JSON body: ${e instanceof Error ? e.message : String(e)}` }, 400)
  }

  const { pdf_base64, file_name } = body
  if (!pdf_base64) {
    return json({ ok: false, error: 'pdf_base64 required' }, 400)
  }

  // Validate base64
  const base64Size = Math.ceil(pdf_base64.length * 3 / 4)
  if (base64Size > 15 * 1024 * 1024) {
    return json({ ok: false, error: `파일이 너무 큽니다 (${(base64Size / 1024 / 1024).toFixed(1)}MB). 10MB 이하만 가능합니다.` }, 400)
  }

  // Gemini multimodal: PDF → text extraction
  const extractPrompt = `이 PDF 문서의 모든 텍스트 내용을 정확하게 추출해주세요.

규칙:
- 원문 텍스트를 최대한 그대로 보존
- 표(table)가 있으면 구조를 유지하되 텍스트로 변환
- 이미지 속 텍스트도 OCR하여 추출
- 페이지 번호, 헤더/푸터 등 반복 요소는 제거
- 불필요한 줄바꿈은 정리하되 문단 구분은 유지
- 추출된 텍스트만 반환 (설명이나 코멘트 없이)

파일명: ${file_name || 'document.pdf'}`

  const requestBody = JSON.stringify({
    contents: [{
      parts: [
        { text: extractPrompt },
        { inlineData: { mimeType: 'application/pdf', data: pdf_base64 } },
      ],
    }],
    generationConfig: {
      temperature: 0.1,
      maxOutputTokens: 8192,
    },
  })

  // Try models in order
  const models = [
    { url: `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, name: 'Gemini 2.5 Flash' },
    { url: `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`, name: 'Gemini 2.0 Flash' },
  ]

  const errors: string[] = []

  for (const model of models) {
    try {
      const response = await fetch(model.url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: requestBody,
      })

      if (response.ok) {
        const data = await response.json()
        const text = (data as any).candidates?.[0]?.content?.parts?.[0]?.text
        if (text) {
          return json({ ok: true, text, model: model.name, fileSize: `${(base64Size / 1024).toFixed(0)}KB` })
        }
        // Check for safety block or other issues
        const blockReason = (data as any).candidates?.[0]?.finishReason
        const promptFeedback = (data as any).promptFeedback?.blockReason
        errors.push(`${model.name}: empty text (finishReason=${blockReason}, promptBlock=${promptFeedback})`)
        continue
      }

      // Non-OK response - capture error details
      const errText = await response.text().catch(() => 'no body')
      let errMsg = `status ${response.status}`
      try {
        const errJson = JSON.parse(errText)
        errMsg = errJson?.error?.message ?? errMsg
      } catch {
        errMsg = errText.slice(0, 200)
      }
      errors.push(`${model.name}: ${errMsg}`)
      continue
    } catch (err) {
      errors.push(`${model.name}: ${err instanceof Error ? err.message : 'network error'}`)
      continue
    }
  }

  return json({
    ok: false,
    error: errors[errors.length - 1] || 'All models failed',
    errors,
    debug: { base64Length: pdf_base64.length, estimatedSize: `${(base64Size / 1024).toFixed(0)}KB` },
  }, 502)
}
