import { useRouter } from 'next/navigation'
import React, { useEffect, useState } from 'react'
import { tokenUpdate } from '@/utils/TokenUpdate'

export default function withAuth<P extends object>(Component: React.ComponentType<P>) {
    return function AuthenticatedComponent(props: P) {
        const router = useRouter()
        const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null)

        useEffect(() => {
            const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
            const refreshToken = typeof window !== 'undefined' ? localStorage.getItem('refreshToken') : null

            if (!token) {
                console.log('Token not found')
                router.push('/autorization')
                return
            }

            try {
                const payloadBase64 = token.split('.')[1]
                const decodedPayload = JSON.parse(atob(payloadBase64)) as { exp?: number }

                if (!decodedPayload || (decodedPayload.exp && decodedPayload.exp * 1000 < Date.now())) {
                    console.log('Token is expired')
                    tokenUpdate(refreshToken, router)
                        .then(() => setIsAuthenticated(true))
                        .catch((error) => {
                            console.error('Error updating token:', error)
                            setIsAuthenticated(false)
                        })
                }
                else {
                    setIsAuthenticated(true)
                    console.log('Token is valid')
                }
            } catch (error) {
                console.error('Error decoding token:', error)
                router.push('/autorization')
                return
            }
        }, [router])

        useEffect(() => {
            if (isAuthenticated === false) {
                router.push('/autorization')
            }
        }, [isAuthenticated, router])

        if (isAuthenticated === null) {
            return null
        }

        return <Component {...props} />
    }
}
