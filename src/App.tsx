import { useLenisInit } from '@/hooks/useLenis'
import Navigation from '@/sections/Navigation'
import WorkListSection from '@/sections/WorkListSection'
import GallerySection from '@/sections/GallerySection'
import AboutSection from '@/sections/AboutSection'
import FluidContactSection from '@/sections/FluidContactSection'

function App() {
  useLenisInit()

  return (
    <div className="relative">
      <Navigation />
      <main>
        <WorkListSection />
        <GallerySection />
        <AboutSection />
        <FluidContactSection />
      </main>
    </div>
  )
}

export default App
