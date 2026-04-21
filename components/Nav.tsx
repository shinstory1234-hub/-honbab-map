'use client'

type Props = {
  onAddRestaurant: () => void
  onMyPage: () => void
}

export default function Nav({ onAddRestaurant, onMyPage }: Props) {
  return (
    <nav className="flex items-center h-14 px-4 bg-white border-b border-gray-100 shadow-sm shrink-0 z-30">
      {/* 로고 */}
      <div className="flex items-center gap-1.5 flex-1">
        <span className="text-xl">🍱</span>
        <span className="font-black text-[#FF6B35] text-lg tracking-tight">혼밥맵</span>
      </div>

      {/* 우측 버튼 */}
      <div className="flex items-center gap-2 shrink-0">
        <button
          onClick={onMyPage}
          className="w-9 h-9 flex items-center justify-center rounded-xl text-gray-500 hover:bg-gray-100 transition-colors"
          title="마이페이지"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
        </button>
        <button
          onClick={onAddRestaurant}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#FF6B35] text-white text-sm font-semibold hover:bg-orange-500 transition-colors shadow-sm"
        >
          <span>+</span>
          <span>식당 제보</span>
        </button>
      </div>
    </nav>
  )
}
