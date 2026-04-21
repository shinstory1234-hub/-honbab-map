declare namespace kakao {
  namespace maps {
    function load(callback: () => void): void
    class Map {
      constructor(container: HTMLElement, options: MapOptions)
      setCenter(latlng: LatLng): void
      getCenter(): LatLng
      setLevel(level: number): void
      relayout(): void
    }
    class LatLng {
      constructor(lat: number, lng: number)
      getLat(): number
      getLng(): number
    }
    class Marker {
      constructor(options: MarkerOptions)
      setMap(map: Map | null): void
      getPosition(): LatLng
    }
    class CustomOverlay {
      constructor(options: CustomOverlayOptions)
      setMap(map: Map | null): void
    }
    class InfoWindow {
      constructor(options: InfoWindowOptions)
      open(map: Map, marker: Marker): void
      close(): void
    }
    namespace event {
      function addListener(target: Marker | Map, type: string, handler: () => void): void
    }
    interface MapOptions {
      center: LatLng
      level: number
    }
    interface MarkerOptions {
      position: LatLng
      map?: Map
      image?: MarkerImage
    }
    interface CustomOverlayOptions {
      position: LatLng
      content: string | HTMLElement
      map?: Map
      yAnchor?: number
    }
    interface InfoWindowOptions {
      content: string
      removable?: boolean
    }
    class MarkerImage {
      constructor(src: string, size: Size, options?: MarkerImageOptions)
    }
    class Size {
      constructor(width: number, height: number)
    }
    interface MarkerImageOptions {
      offset?: Point
    }
    class Point {
      constructor(x: number, y: number)
    }
  }
}
