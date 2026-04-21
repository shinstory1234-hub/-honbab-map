'use client'

import { useState } from 'react'
import dynamicImport from 'next/dynamic'
import Nav from '@/components/Nav'
import AddRestaurantModal from '@/components/AddRestaurantModal'
import MyPageModal from '@/components/MyPageModal'

const MapTab = dynamicImport(() => import('@/components/MapTab'), { ssr: false })

export default function HomePage() {
  const [addModalOpen, setAddModalOpen] = useState(false)
  const [myPageOpen, setMyPageOpen] = useState(false)

  return (
    <div className="flex flex-col h-[100dvh] overflow-hidden bg-gray-50">
      <Nav
        onAddRestaurant={() => setAddModalOpen(true)}
        onMyPage={() => setMyPageOpen(true)}
      />

      <div className="flex-1 overflow-hidden">
        <MapTab />
      </div>

      <AddRestaurantModal isOpen={addModalOpen} onClose={() => setAddModalOpen(false)} />
      <MyPageModal isOpen={myPageOpen} onClose={() => setMyPageOpen(false)} />
    </div>
  )
}
