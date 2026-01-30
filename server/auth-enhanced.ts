import { createClient } from '@/server/auth'
import { enforceRateLimit } from '@/lib/security/rate-limiter'
import { logAuthAttempt, isIPAddressBlocked } from '@/lib/security/audit-log'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'

export interface AuthUser {
  id: string
  email: string
  role?: 'admin' | 'user' | 'manager'
}

export interface AuthResult {
  success: boolean
  user?: AuthUser
  error?: string
}

export async function getSession(): Promise<AuthResult> {
  try {
    const supabase = await createClient()
    const { data: { user }, error } = await supabase.auth.getUser()

    if (error || !user) {
      return { success: false, error: error?.message || 'No user found' }
    }

    return {
      success: true,
      user: {
        id: user.id,
        email: user.email || '',
        role: user.user_metadata?.role || 'user',
      },
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Authentication failed',
    }
  }
}

export async function requireAuth(): Promise<AuthUser> {
  const result = await getSession()

  if (!result.success || !result.user) {
    redirect('/authentication')
  }

  return result.user
}

export async function requireAdmin(): Promise<AuthUser> {
  const user = await requireAuth()

  const adminUserId = process.env.ADMIN_USER_ID
  if (!adminUserId || user.id !== adminUserId) {
    redirect('/dashboard')
  }

  return user
}

export async function signInWithEmail(
  email: string,
  password: string,
  ipAddress?: string
): Promise<AuthResult> {
  const headersList = await headers()
  const ip = ipAddress || headersList.get('x-forwarded-for') || undefined

  if (await isIPAddressBlocked(ip || '')) {
    await logAuthAttempt(undefined, false, 'email', ip, undefined, 'IP address blocked due to too many failed attempts')
    return {
      success: false,
      error: 'Too many failed attempts. Please try again later.',
    }
  }

  try {
    await enforceRateLimit(`auth:${email}`, 'authentication')

    const supabase = await createClient()
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      await logAuthAttempt(
        (data as any)?.user?.id || undefined,
        false,
        'email',
        ip,
        headersList.get('user-agent') || undefined,
        error.message
      )

      return {
        success: false,
        error: error.message === 'Invalid login credentials'
          ? 'Invalid email or password'
          : error.message,
      }
    }

    await logAuthAttempt(
      data.user.id,
      true,
      'email',
      ip,
      headersList.get('user-agent') || undefined
    )

    return {
      success: true,
      user: {
        id: data.user.id,
        email: data.user.email || '',
        role: data.user.user_metadata?.role || 'user',
      },
    }
  } catch (error) {
    if (error instanceof Error && error.name === 'RateLimitError') {
      return {
        success: false,
        error: 'Too many sign-in attempts. Please try again later.',
      }
    }

    await logAuthAttempt(undefined, false, 'email', ip, undefined, error instanceof Error ? error.message : 'Unknown error')

    return {
      success: false,
      error: 'An unexpected error occurred. Please try again.',
    }
  }
}

export async function signUpWithEmail(
  email: string,
  password: string,
  confirmPassword: string,
  ipAddress?: string
): Promise<AuthResult> {
  if (password !== confirmPassword) {
    return {
      success: false,
      error: 'Passwords do not match',
    }
  }

  if (password.length < 8) {
    return {
      success: false,
      error: 'Password must be at least 8 characters long',
    }
  }

  const headersList = await headers()
  const ip = ipAddress || headersList.get('x-forwarded-for') || undefined

  try {
    await enforceRateLimit(`signup:${email}`, 'authentication')

    const supabase = await createClient()
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    })

    if (error) {
      await logAuthAttempt(
        (data as any)?.user?.id || undefined,
        false,
        'email_signup',
        ip,
        headersList.get('user-agent') || undefined,
        error.message
      )

      return {
        success: false,
        error: error.message,
      }
    }

    await logAuthAttempt(
      data.user?.id,
      true,
      'email_signup',
      ip,
      headersList.get('user-agent') || undefined
    )

    return {
      success: true,
      user: data.user ? {
        id: data.user.id,
        email: data.user.email || '',
        role: 'user',
      } : undefined,
    }
  } catch (error) {
    if (error instanceof Error && error.name === 'RateLimitError') {
      return {
        success: false,
        error: 'Too many sign-up attempts. Please try again later.',
      }
    }

    return {
      success: false,
      error: 'An unexpected error occurred. Please try again.',
    }
  }
}

export async function signOut(): Promise<void> {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/')
}

export async function signInWithDiscord(): Promise<void> {
  const supabase = await createClient()
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'discord',
    options: {
      redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/callback`,
    },
  })

  if (error) {
    throw new Error(error.message)
  }

  redirect(data.url)
}

export async function signInWithGoogle(): Promise<void> {
  const supabase = await createClient()
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/callback`,
    },
  })

  if (error) {
    throw new Error(error.message)
  }

  redirect(data.url)
}

export async function updatePassword(
  currentPassword: string,
  newPassword: string
): Promise<AuthResult> {
  const { success: authSuccess, user } = await getSession()

  if (!authSuccess || !user) {
    return {
      success: false,
      error: 'You must be logged in to update your password',
    }
  }

  if (newPassword.length < 8) {
    return {
      success: false,
      error: 'Password must be at least 8 characters long',
    }
  }

  try {
    await enforceRateLimit(`password_update:${user.id}`, 'authentication')

    const supabase = await createClient()
    
    const { error: updateError } = await supabase.auth.updateUser({
      password: newPassword,
    })

    if (updateError) {
      return {
        success: false,
        error: updateError.message,
      }
    }

    return {
      success: true,
      user,
    }
  } catch (error) {
    if (error instanceof Error && error.name === 'RateLimitError') {
      return {
        success: false,
        error: 'Too many password update attempts. Please try again later.',
      }
    }

    return {
      success: false,
      error: 'An unexpected error occurred. Please try again.',
    }
  }
}

export async function resetPassword(email: string): Promise<AuthResult> {
  try {
    await enforceRateLimit(`password_reset:${email}`, 'authentication')

    const supabase = await createClient()
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/settings?passwordReset=true`,
    })

    if (error) {
      return {
        success: false,
        error: error.message,
      }
    }

    return {
      success: true,
    }
  } catch (error) {
    if (error instanceof Error && error.name === 'RateLimitError') {
      return {
        success: false,
        error: 'Too many reset attempts. Please try again later.',
      }
    }

    return {
      success: false,
      error: 'An unexpected error occurred. Please try again.',
    }
  }
}
