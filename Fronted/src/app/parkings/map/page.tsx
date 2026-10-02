'use client'

import React, { Suspense } from 'react'
import ParkingMap from '@/components/ParkingMap'
import { useSearchParams, useRouter } from 'next/navigation'
import Loader from '@/components/Loader'
import { Button } from "@/components/ui/button"
import { ChevronLeft } from "lucide-react"

export default function Page() {
    const router = useRouter()

    return (
        <div className="container mx-auto py-8">
            <Button
                className="absolute top-8 left-4 h-11 w-11"
                onClick={() => router.back()}
            >
                <ChevronLeft />
            </Button>
            <Suspense fallback={<Loader />}>
                <SearchParamsWrapper />
            </Suspense>
        </div>
    )
}

function SearchParamsWrapper() {
    const searchParams = useSearchParams()
    const id = searchParams.get('id')

    return (
        <ParkingMap
            mapNumber={Number(id)}
        />
    )
}
