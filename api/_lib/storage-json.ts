const BUCKET = 'evidence'

export async function readJsonFromStorage<T>(
  adminClient: any,
  path: string,
  fallback: T
): Promise<T> {
  const { data, error } = await adminClient.storage.from(BUCKET).download(path)

  if (error || !data) {
    return fallback
  }

  try {
    const text = await data.text()
    return text ? (JSON.parse(text) as T) : fallback
  } catch {
    return fallback
  }
}

export async function writeJsonToStorage(
  adminClient: any,
  path: string,
  value: unknown
) {
  const payload = new Blob([JSON.stringify(value, null, 2)], {
    type: 'application/json; charset=utf-8',
  })

  const { error } = await adminClient.storage.from(BUCKET).upload(path, payload, {
    contentType: 'application/json; charset=utf-8',
    upsert: true,
  })

  if (error) {
    throw new Error(`storage_write_failed: ${error.message}`)
  }
}
