import React from 'react'
import {
    Card,
    CardContent,
} from "@/components/ui/card"
import { useRouter } from 'next/navigation'

interface Props {
    location: string
    parkingsAverage: number
    parkingsFree: number
    id: number
}

export default function ParkingCard({ location, parkingsAverage, parkingsFree, id } : Props) {
    const router = useRouter()

    const handleCardClick = () => {
        console.log('Card clicked')
        router.push(`/parkings/map?id=${id}`)
    }

    return (
        <Card
            onClick={handleCardClick}
            className="w-full mb-4"
        >
            <CardContent className="flex justify-between items-center mr-4">
                <div className="text-xl">
                    {location}
                </div>
                <div className="text-gray-500">
                    Места: {parkingsFree}/{parkingsAverage}
                </div>
            </CardContent>
        </Card>
    )
}