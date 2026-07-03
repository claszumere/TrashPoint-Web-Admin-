import React, { useState, useEffect } from 'react'

const About = () => {
  const [scrollY, setScrollY] = useState(0)

  useEffect(() => {
    const handleScroll = () => {
      setScrollY(window.scrollY)
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  return (
    <section id="about" className="relative min-h-screen overflow-hidden bg-gray-900">
      {/* Parallax Background Container */}
      <div className="absolute inset-0 overflow-hidden">
        <div
          className="absolute inset-0 w-full h-[120%] bg-cover bg-center"
          style={{
            backgroundImage: 'url(https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?w=1920&h=1280&fit=crop&q=80)',
            transform: `translateY(${scrollY * 0.3}px)`,
            top: '-10%'
          }}
        >
          {/* Gradient Overlays for better text readability */}
          <div className="absolute inset-0 bg-gradient-to-b from-black/80 via-black/70 to-black/80"></div>
          <div className="absolute inset-0 bg-gradient-to-r from-primary-900/40 to-transparent"></div>
        </div>
      </div>

      {/* Content */}
      <div className="relative z-10 py-24 md:py-32">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Section Header */}
          <div className="text-center mb-20">
            <div className="inline-block mb-4">
              <span className="bg-primary-500/20 backdrop-blur-sm text-primary-300 px-6 py-2 rounded-full text-sm font-semibold border border-primary-500/30">
                About TrashPoint
              </span>
            </div>
            <h2 className="text-4xl md:text-6xl font-bold text-white mb-6">
              Revolutionizing Waste Management
            </h2>
            <p className="text-xl md:text-2xl text-gray-300 max-w-4xl mx-auto leading-relaxed">
              Building a sustainable future through innovative technology and community engagement
            </p>
          </div>

          <div className="grid lg:grid-cols-2 gap-16 items-center">
            {/* Left Content - Story */}
            <div className="space-y-8">
              <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 border border-white/20 shadow-2xl hover:bg-white/15 transition-all">
                <h3 className="text-3xl font-bold text-white mb-4">Our Story</h3>
                <p className="text-gray-300 leading-relaxed text-lg mb-4">
                  TrashPoint was born from a simple observation: waste management needed a technological revolution. 
                  We saw communities struggling with inefficient collection systems and decided to create a solution.
                </p>
                <p className="text-gray-300 leading-relaxed text-lg">
                  Using cutting-edge QR code technology, we've transformed how residents and administrators 
                  interact with waste collection services, making it seamless, transparent, and eco-friendly.
                </p>
              </div>

              {/* Statistics */}
              <div className="grid grid-cols-3 gap-6">
                <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 text-center border border-white/20 hover:scale-105 transition-transform">
                  <div className="text-4xl font-bold text-primary-400 mb-2">500+</div>
                  <div className="text-sm text-gray-300 font-medium">Active Residents</div>
                </div>
                <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 text-center border border-white/20 hover:scale-105 transition-transform">
                  <div className="text-4xl font-bold text-primary-400 mb-2">1000+</div>
                  <div className="text-sm text-gray-300 font-medium">Collections</div>
                </div>
                <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 text-center border border-white/20 hover:scale-105 transition-transform">
                  <div className="text-4xl font-bold text-primary-400 mb-2">98%</div>
                  <div className="text-sm text-gray-300 font-medium">Satisfaction</div>
                </div>
              </div>
            </div>

            {/* Right Content - Mission, Vision, Values */}
            <div className="space-y-6">
              {/* Mission Card */}
              <div className="group bg-white rounded-2xl p-8 shadow-2xl hover:shadow-primary-500/20 transform hover:-translate-y-2 transition-all duration-300">
                <div className="flex items-start gap-6">
                  <div className="bg-gradient-to-br from-primary-500 to-primary-600 w-16 h-16 rounded-2xl flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform shadow-lg">
                    <span className="text-3xl">🎯</span>
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-gray-900 mb-3">Our Mission</h3>
                    <p className="text-gray-600 leading-relaxed">
                      To create a sustainable waste management ecosystem that benefits communities and 
                      the environment through innovative technology and responsible practices.
                    </p>
                  </div>
                </div>
              </div>

              {/* Vision Card */}
              <div className="group bg-white rounded-2xl p-8 shadow-2xl hover:shadow-blue-500/20 transform hover:-translate-y-2 transition-all duration-300">
                <div className="flex items-start gap-6">
                  <div className="bg-gradient-to-br from-blue-500 to-blue-600 w-16 h-16 rounded-2xl flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform shadow-lg">
                    <span className="text-3xl">👁️</span>
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-gray-900 mb-3">Our Vision</h3>
                    <p className="text-gray-600 leading-relaxed">
                      A world where waste management is smart, efficient, and accessible to all, 
                      contributing to cleaner cities and a healthier planet for future generations.
                    </p>
                  </div>
                </div>
              </div>

              {/* Values Card */}
              <div className="group bg-white rounded-2xl p-8 shadow-2xl hover:shadow-green-500/20 transform hover:-translate-y-2 transition-all duration-300">
                <div className="flex items-start gap-6">
                  <div className="bg-gradient-to-br from-green-500 to-green-600 w-16 h-16 rounded-2xl flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform shadow-lg">
                    <span className="text-3xl">💚</span>
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-gray-900 mb-3">Our Values</h3>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-gray-700">
                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                        <span className="font-medium">Sustainability</span>
                      </div>
                      <div className="flex items-center gap-2 text-gray-700">
                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                        <span className="font-medium">Innovation</span>
                      </div>
                      <div className="flex items-center gap-2 text-gray-700">
                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                        <span className="font-medium">Transparency</span>
                      </div>
                      <div className="flex items-center gap-2 text-gray-700">
                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                        <span className="font-medium">Community</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom CTA */}
          <div className="mt-20 text-center">
            <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-12 border border-white/20">
              <h3 className="text-3xl md:text-4xl font-bold text-white mb-4">
                Join Our Green Revolution
              </h3>
              <p className="text-xl text-gray-300 mb-8 max-w-2xl mx-auto">
                Be part of the solution. Together, we can create cleaner, more sustainable communities.
              </p>
              <a
                href="#features"
                className="inline-flex items-center bg-primary-600 text-white px-8 py-4 rounded-xl font-semibold hover:bg-primary-700 transition-all shadow-xl hover:shadow-2xl hover:scale-105 group"
              >
                Discover How It Works
                <svg className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Wave Divider */}
      <div className="absolute bottom-0 left-0 right-0 z-20">
        <svg
          className="fill-white"
          viewBox="0 0 1200 120"
          preserveAspectRatio="none"
          style={{ width: '100%', height: '120px', display: 'block' }}
        >
          <path d="M0,0V46.29c47.79,22.2,103.59,32.17,158,28,70.36-5.37,136.33-33.31,206.8-37.5C438.64,32.43,512.34,53.67,583,72.05c69.27,18,138.3,24.88,209.4,13.08,36.15-6,69.85-17.84,104.45-29.34C989.49,25,1113-14.29,1200,52.47V0Z" 
            opacity=".25" 
          />
          <path d="M0,0V15.81C13,36.92,27.64,56.86,47.69,72.05,99.41,111.27,165,111,224.58,91.58c31.15-10.15,60.09-26.07,89.67-39.8,40.92-19,84.73-46,130.83-49.67,36.26-2.85,70.9,9.42,98.6,31.56,31.77,25.39,62.32,62,103.63,73,40.44,10.79,81.35-6.69,119.13-24.28s75.16-39,116.92-43.05c59.73-5.85,113.28,22.88,168.9,38.84,30.2,8.66,59,6.17,87.09-7.5,22.43-10.89,48-26.93,60.65-49.24V0Z" 
            opacity=".5" 
          />
          <path d="M0,0V5.63C149.93,59,314.09,71.32,475.83,42.57c43-7.64,84.23-20.12,127.61-26.46,59-8.63,112.48,12.24,165.56,35.4C827.93,77.22,886,95.24,951.2,90c86.53-7,172.46-45.71,248.8-84.81V0Z" />
        </svg>
      </div>
    </section>
  )
}

export default About