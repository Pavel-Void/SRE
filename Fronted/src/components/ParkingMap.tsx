import React, { useEffect } from 'react'
import { ReactSVG } from 'react-svg'
import BookingForm from './BookingForm'
import withAuth from "@/hoc/WithAuth"
import axios from "axios"
import Loader from '@/components/Loader'

const apiUrl = process.env.NEXT_PUBLIC_API_URL

interface Spot {
    id: number
    isOccupied: 'free' | 'occupied' | 'mine' // occupied, если место занято прямо сейчас
    parkingEndTime: Date | null // время окончания брони, если место занято
}

interface ParkingMapProps {
    mapNumber: number
}

function ParkingMap({ mapNumber }: ParkingMapProps) {
    const mapFile = `/parking_maps/${mapNumber}.svg`
    const [selectedPlace, setSelectedPlace] = React.useState<number | null>(null)
    const [parkingSpots, setParkingSpots] = React.useState<Spot[]>([])
    const [loading, setLoading] = React.useState(true)

    const fetchSpots = async () => {
        try {
            const response = await axios.get<Spot[]>(`${apiUrl}/api/spotsForMapList`, { // !!Места должна быть отсортированы по id!
                headers: {
                    Authorization: `Bearer ${localStorage.getItem('token')}`,
                },
                params: { parkingId: mapNumber }
            })
            setParkingSpots(response.data)
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

    const handlePlaceClick = (spot: Spot) => {
        // if (spot.isOccupied === 'occupied') {
        //     toast(`Место ${spot.id} занято`)
        // } else {
        //     toast(`Вы выбрали место: ${spot.id}`)
        // }

        setSelectedPlace(spot.id)
    }

    useEffect(() => {
        const preventScroll = (e: WheelEvent) => e.preventDefault()
        window.addEventListener('wheel', preventScroll, { passive: false })

        return () => {
            window.removeEventListener('wheel', preventScroll)
        }
    }, [])

    useEffect(() => {
        if (selectedPlace !== null) {
            document.body.style.overflow = 'hidden'
        } else {
            document.body.style.overflow = ''
        }
        return () => {
            document.body.style.overflow = ''
        }
    }, [selectedPlace])

    if (loading) {
        return <Loader />
    }

    return (
        <div className="flex flex-col items-center">
            <div className={`w-full h-screen overflow-auto ${selectedPlace ? 'pointer-events-none blur-sm' : ''}`}>
                <ReactSVG
                    src={mapFile}
                    beforeInjection={(svg) => {
                        const spots = Array.from(svg.querySelectorAll('.spot'))

                        spots.forEach((svgSpot) => {
                            const spotIndex = parseInt(svgSpot.id, 10) - 1
                            const spot = parkingSpots[spotIndex]

                            if (spot) {
                                svgSpot.addEventListener('click', () => {
                                    handlePlaceClick(spot)
                                    console.log(`Clicked on spot with id: ${svgSpot.id}`)
                                })

                                if (spot.isOccupied === 'occupied') {
                                    svgSpot.setAttribute('fill', 'gray')
                                } else if (spot.isOccupied === 'mine') {
                                    svgSpot.setAttribute('fill', 'black')
                                } else {
                                    svgSpot.setAttribute('fill', 'white')
                                }
                            }
                        })
                    }}
                />
                <div className="h-20"></div>
            </div>
            {selectedPlace && (
                <div
                    className="fixed inset-0 flex justify-center items-center bg-opacity-50 z-50 backdrop-blur-sm"
                    onClick={() => setSelectedPlace(null)}
                >
                    <div onClick={(e) => e.stopPropagation()} >
                        <BookingForm placeId={selectedPlace} parkingId={mapNumber} />
                    </div>
                </div>
            )}
        </div>
    )
}

export default withAuth(ParkingMap)
