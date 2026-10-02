'use client'

import React, { useEffect, useState } from 'react'
import ParkingCard from '@/components/ParkingCard'
import axios from 'axios'
import withAuth from "@/hoc/WithAuth"
import Loader from '@/components/Loader'

const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'

interface Parking {
    id: number
    location: string
    parking_average: number
    parking_free: number
}

function Page() {
    const [parkings, setParkings] = useState<Parking[]>([])
    const [loading, setLoading] = useState(true)

    const fetchParkings = async () => {
        try {
            const response = await axios.get<Parking[]>(`${apiUrl}/api/parkingList`, {
                headers: {
                    Authorization: `Bearer ${localStorage.getItem('token')}`,
                },
            })
            setParkings(response.data)
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
        fetchParkings()
    }, [])

    if (loading) {
        return <Loader/>
    }

    return (
        <div>
            <div className="flex justify-around mt-6">
                <div className="flex flex-col align-center w-20 text-xl">
                    <div className="text-center">Парковки</div>
                    <div className="text-center">{parkings.length}</div>
                </div>
                <div className="flex flex-col align-center w-20 text-xl">
                    <div className="text-center">Места</div>
                    <div className="text-center">{parkings.reduce((sum, parking) => sum + parking.parking_free, 0)}</div>
                </div >
            </div>
            <div className="flex flex-col justify-center mt-7 ml-4 mr-4">
                {parkings.map((parking, index) => (
                    <React.Fragment key={index}>
                        <ParkingCard
                            id={parking.id}
                            location={parking.location}
                            parkingsAverage={parking.parking_average}
                            parkingsFree={parking.parking_free}
                        />
                    </React.Fragment>
                ))}
            </div>
            <div className="h-20"></div>
        </div>
    )
}

export default withAuth(Page)
