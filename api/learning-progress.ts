/// <reference types="node" />

import { getAdminClient, json, requireSignedInProfile } from './_lib/supabase.js'
import { readJsonFromStorage, writeJsonToStorage } from './_lib/storage-json.js'

const STORAGE_PATH = 'system/learning-progress.json'

type CourseProgress = {
  courseId: string
  courseTitle: string
  watchedSeconds: number
  durationSeconds: number
  progressPercent: number
  status: 'not_started' | 'in_progress' | 'completed'
  updatedAt: string
  completedAt: string | null
}

type LearnerRecord = {
  userId: string
  employeeId: string
  fullName: string
  department: string
  role: string
  courses: Record<string, CourseProgress>
}

type LearningStore = {
  users: Record<string, LearnerRecord>
}

const EMPTY_STORE: LearningStore = { users: {} }

function clampNumber(value: unknown, min: number, max: number) {
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) return min
  return Math.max(min, Math.min(max, parsed))
}

export async function GET(request: Request) {
  const auth = await requireSignedInProfile(request)
  if ('error' in auth) return auth.error

  try {
    const adminClient = getAdminClient()
    const store = await readJsonFromStorage<LearningStore>(adminClient, STORAGE_PATH, EMPTY_STORE)
    const me = store.users[auth.profile.id] ?? null

    if (auth.profile.role === 'admin') {
      return json({
        ok: true,
        me,
        learners: (Object.values(store.users) as LearnerRecord[]).sort((a, b) => a.employeeId.localeCompare(b.employeeId)),
      })
    }

    return json({
      ok: true,
      me,
      learners: [],
    })
  } catch (error) {
    return json(
      {
        ok: false,
        error: error instanceof Error ? error.message : String(error),
      },
      500
    )
  }
}

export async function POST(request: Request) {
  const auth = await requireSignedInProfile(request)
  if ('error' in auth) return auth.error

  try {
    const body = await request.json()
    const courseId = String(body.courseId ?? '').trim()
    const courseTitle = String(body.courseTitle ?? '').trim()

    if (!courseId || !courseTitle) {
      return json({ ok: false, error: 'course_id_and_title_required' }, 400)
    }

    const watchedSeconds = clampNumber(body.watchedSeconds, 0, 24 * 60 * 60)
    const durationSeconds = clampNumber(body.durationSeconds, 1, 24 * 60 * 60)
    const progressPercent = clampNumber(body.progressPercent, 0, 100)
    const status: CourseProgress['status'] =
      progressPercent >= 99 || watchedSeconds >= durationSeconds - 3
        ? 'completed'
        : progressPercent > 0
          ? 'in_progress'
          : 'not_started'

    const adminClient = getAdminClient()
    const store = await readJsonFromStorage<LearningStore>(adminClient, STORAGE_PATH, EMPTY_STORE)
    const current = store.users[auth.profile.id]

    const nextCourse: CourseProgress = {
      courseId,
      courseTitle,
      watchedSeconds,
      durationSeconds,
      progressPercent,
      status,
      updatedAt: new Date().toISOString(),
      completedAt: status === 'completed' ? new Date().toISOString() : null,
    }

    store.users[auth.profile.id] = {
      userId: auth.profile.id,
      employeeId: auth.profile.employee_id ?? auth.profile.id,
      fullName: auth.profile.full_name ?? '미등록 사용자',
      department: auth.profile.department ?? '-',
      role: auth.profile.role ?? 'owner',
      courses: {
        ...(current?.courses ?? {}),
        [courseId]: nextCourse,
      },
    }

    await writeJsonToStorage(adminClient, STORAGE_PATH, store)

    return json({
      ok: true,
      course: nextCourse,
    })
  } catch (error) {
    return json(
      {
        ok: false,
        error: error instanceof Error ? error.message : String(error),
      },
      500
    )
  }
}
