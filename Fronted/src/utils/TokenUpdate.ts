'use client'

import axios from 'axios'
import { useRouter } from 'next/navigation'

const apiUrl = process.env.NEXT_PUBLIC_API_URL

function handleInvalidToken(router: ReturnType<typeof useRouter>) {
    localStorage.removeItem('token')
    localStorage.removeItem('refreshToken')
    router.push('/autorization')
}

export async function tokenUpdate(refreshToken: string | null, router: ReturnType<typeof useRouter>) {
    if (refreshToken) {
        try {
            const response = await axios.post(`${apiUrl}/api/refresh`, { refreshToken })
            const { token } = response.data
            localStorage.setItem('token', token)
            console.log('Token updated')
        } catch (error: unknown) {
            if (axios.isAxiosError(error) && error.response?.status === 403) {
                console.error('Error 403: Access denied. Token might be expired.')
                handleInvalidToken(router)
            } else if (error instanceof Error) {
                console.error('Error updating token', error.message)
            } else {
                console.error('Error updating token', error)
            }
        }
    } else {
        console.log('Refresh token is not available')
        handleInvalidToken(router)
    }
}