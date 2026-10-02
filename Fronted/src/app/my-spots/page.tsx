'use client'

import React, { useEffect, useState } from "react"
import SpotCard from "@/components/SpotCard"
import axios from "axios"
import withAuth from "@/hoc/WithAuth"
import Loader from '@/components/Loader'

const apiUrl = process.env.NEXT_PUBLIC_API_URL

interface Spot {
    title: string
    location: string
    spotId: number
    parkingId: number
    startTime: Date
    endTime: Date
}

function Page() {
    const [spots, setSpots] = useState<Spot[]>([])
    const [loading, setLoading] = useState(true)

    const removeExpiredSpots = (spots: Spot[]) => {
        const now = new Date()
        return spots.filter(spot => spot.endTime > now)
    }

    const fetchSpots = async () => {
        try {
            const response = await axios.get<Spot[]>(`${apiUrl}/api/spotsList`, {
                headers: {
                    Authorization: `Bearer ${localStorage.getItem('token')}`,
                },
            })

            const spotsWithDates = response.data.map(spot => ({
                ...spot,
                startTime: new Date(spot.startTime),
                endTime: new Date(spot.endTime),
            }))

            const validSpots = removeExpiredSpots(spotsWithDates)
            setSpots(validSpots)
        } catch (error: unknown) {
            if (error instanceof Error) {
                console.error(error.message)
            } else {
                console.error("An unknown error occurred")
            }
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchSpots()
    }, [])

    if (loading) {
        return <Loader />
    }

    return (
        <div className="mt-6 ml-6 mr-4">
            <div>
                <div className="text-4xl text-white">Мои места</div>
                <div className="flex flex-wrap mt-7">
                    <div className={spots.length > 0 ? "hidden" : "text-2xl text-center w-full"}>
                        Брони отсутствуют
                    </div>
                    {spots.map((spot, index) => (
                        <React.Fragment key={index}>
                            <SpotCard
                                title={spot.title}
                                location={spot.location}
                                startTime={spot.startTime}
                                endTime={spot.endTime}
                                spotId={spot.spotId}
                                parkingId={spot.parkingId}
                                onDelete={fetchSpots}
                            />
                        </React.Fragment>
                    ))}
                </div>
                <div className="h-20"></div>
            </div>
        </div>
    )
}

export default withAuth(Page)