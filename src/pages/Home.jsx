import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import Carousel from '../components/home/Carousel'
import About from '../components/home/About'

const Home = () => {
  const [scrollY, setScrollY] = useState(0)
  const [navBackground, setNavBackground] = useState(false)

  useEffect(() => {
    const handleScroll = () => {
      setScrollY(window.scrollY)
      setNavBackground(window.scrollY > 50)
    }

    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  return (
    <div className="min-h-screen bg-white">
      {/* Navigation Bar */}
      <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
        navBackground ? 'bg-white shadow-lg' : 'bg-transparent'
      }`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            <div className="flex items-center gap-3">
              <div className="relative">
                <span className="text-3xl">♻️</span>
                <div className="absolute -inset-1 bg-primary-400 rounded-full blur opacity-30"></div>
              </div>
              <span className={`text-2xl font-bold transition-colors ${
                navBackground ? 'text-primary-600' : 'text-white'
              }`}>TrashPoint</span>
            </div>
            
            <div className="hidden md:flex items-center space-x-8">
              <a 
                href="#home" 
                className={`font-medium transition-all hover:scale-105 ${
                  navBackground ? 'text-gray-700 hover:text-primary-600' : 'text-white hover:text-primary-200'
                }`}
              >
                Home
              </a>
              <a 
                href="#about" 
                className={`font-medium transition-all hover:scale-105 ${
                  navBackground ? 'text-gray-700 hover:text-primary-600' : 'text-white hover:text-primary-200'
                }`}
              >
                About
              </a>
              <a 
                href="#features" 
                className={`font-medium transition-all hover:scale-105 ${
                  navBackground ? 'text-gray-700 hover:text-primary-600' : 'text-white hover:text-primary-200'
                }`}
              >
                Features
              </a>
              <Link 
                to="/login" 
                className="bg-primary-600 text-white px-6 py-3 rounded-xl hover:bg-primary-700 transition-all shadow-lg hover:shadow-xl hover:scale-105 font-medium"
              >
                Admin Login
              </Link>
            </div>
            
            <div className="md:hidden">
              <Link 
                to="/login" 
                className={`px-5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  navBackground 
                    ? 'bg-primary-600 text-white hover:bg-primary-700' 
                    : 'bg-white text-primary-600 hover:bg-gray-100'
                }`}
              >
                Login
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section with Carousel */}
      <section id="home" className="relative">
        <Carousel />
      </section>

      {/* Stats Section */}
      <section className="py-16 bg-gradient-to-b from-white to-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <div className="text-center">
              <div className="text-4xl md:text-5xl font-bold text-primary-600 mb-2">500+</div>
              <div className="text-gray-600 font-medium">Active Users</div>
            </div>
            <div className="text-center">
              <div className="text-4xl md:text-5xl font-bold text-primary-600 mb-2">2K+</div>
              <div className="text-gray-600 font-medium">Collections</div>
            </div>
            <div className="text-center">
              <div className="text-4xl md:text-5xl font-bold text-primary-600 mb-2">50+</div>
              <div className="text-gray-600 font-medium">Locations</div>
            </div>
            <div className="text-center">
              <div className="text-4xl md:text-5xl font-bold text-primary-600 mb-2">98%</div>
              <div className="text-gray-600 font-medium">Satisfaction</div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-24 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-20">
            <div className="inline-block mb-4">
              <span className="bg-primary-100 text-primary-600 px-4 py-2 rounded-full text-sm font-semibold">
                Our Features
              </span>
            </div>
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
              Everything You Need for Smart Waste Management
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Powerful features designed to revolutionize how communities manage waste collection
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div className="group bg-white p-8 rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2">
              <div className="bg-gradient-to-br from-primary-50 to-primary-100 w-16 h-16 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <span className="text-3xl">📱</span>
              </div>
              <h3 className="text-2xl font-bold mb-4 text-gray-900">QR Code System</h3>
              <p className="text-gray-600 leading-relaxed">
                Each resident receives a unique QR code for seamless identification and efficient tracking of waste collection activities.
              </p>
              <div className="mt-6 flex items-center text-primary-600 font-semibold group-hover:gap-2 transition-all">
                Learn more
                <svg className="w-5 h-5 transform group-hover:translate-x-2 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </div>

            {/* Feature 2 */}
            <div className="group bg-white p-8 rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2">
              <div className="bg-gradient-to-br from-blue-50 to-blue-100 w-16 h-16 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <span className="text-3xl">📊</span>
              </div>
              <h3 className="text-2xl font-bold mb-4 text-gray-900">Real-time Analytics</h3>
              <p className="text-gray-600 leading-relaxed">
                Monitor waste collection in real-time with comprehensive dashboards and detailed analytics for data-driven decisions.
              </p>
              <div className="mt-6 flex items-center text-primary-600 font-semibold group-hover:gap-2 transition-all">
                Learn more
                <svg className="w-5 h-5 transform group-hover:translate-x-2 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </div>

            {/* Feature 3 */}
            <div className="group bg-white p-8 rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2">
              <div className="bg-gradient-to-br from-purple-50 to-purple-100 w-16 h-16 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <span className="text-3xl">🗺️</span>
              </div>
              <h3 className="text-2xl font-bold mb-4 text-gray-900">Interactive Maps</h3>
              <p className="text-gray-600 leading-relaxed">
                Visualize all garbage bins and collection points on an interactive map with real-time status updates and locations.
              </p>
              <div className="mt-6 flex items-center text-primary-600 font-semibold group-hover:gap-2 transition-all">
                Learn more
                <svg className="w-5 h-5 transform group-hover:translate-x-2 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </div>

            {/* Feature 4 */}
            <div className="group bg-white p-8 rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2">
              <div className="bg-gradient-to-br from-green-50 to-green-100 w-16 h-16 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <span className="text-3xl">♻️</span>
              </div>
              <h3 className="text-2xl font-bold mb-4 text-gray-900">Smart Categorization</h3>
              <p className="text-gray-600 leading-relaxed">
                Efficiently categorize waste into biodegradable, recyclable, and non-biodegradable for better environmental impact.
              </p>
              <div className="mt-6 flex items-center text-primary-600 font-semibold group-hover:gap-2 transition-all">
                Learn more
                <svg className="w-5 h-5 transform group-hover:translate-x-2 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </div>

            {/* Feature 5 */}
            <div className="group bg-white p-8 rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2">
              <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 w-16 h-16 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <span className="text-3xl">👥</span>
              </div>
              <h3 className="text-2xl font-bold mb-4 text-gray-900">Resident Portal</h3>
              <p className="text-gray-600 leading-relaxed">
                Easy registration and management system with searchable database for quick access to resident information.
              </p>
              <div className="mt-6 flex items-center text-primary-600 font-semibold group-hover:gap-2 transition-all">
                Learn more
                <svg className="w-5 h-5 transform group-hover:translate-x-2 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </div>

            {/* Feature 6 */}
            <div className="group bg-white p-8 rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2">
              <div className="bg-gradient-to-br from-red-50 to-red-100 w-16 h-16 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <span className="text-3xl">📈</span>
              </div>
              <h3 className="text-2xl font-bold mb-4 text-gray-900">Performance Reports</h3>
              <p className="text-gray-600 leading-relaxed">
                Generate comprehensive reports with visual charts and statistics to track performance and improvement areas.
              </p>
              <div className="mt-6 flex items-center text-primary-600 font-semibold group-hover:gap-2 transition-all">
                Learn more
                <svg className="w-5 h-5 transform group-hover:translate-x-2 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* About Section with Parallax */}
      <About />

      {/* CTA Section */}
      <section className="py-24 bg-gradient-to-br from-primary-600 to-primary-800 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 left-0 w-96 h-96 bg-white rounded-full blur-3xl"></div>
          <div className="absolute bottom-0 right-0 w-96 h-96 bg-white rounded-full blur-3xl"></div>
        </div>
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
            Ready to Transform Your Waste Management?
          </h2>
          <p className="text-xl text-primary-100 mb-10">
            Join hundreds of communities already using TrashPoint for smarter, cleaner cities
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              to="/login"
              className="bg-white text-primary-600 px-8 py-4 rounded-xl font-semibold hover:bg-gray-100 transition-all shadow-xl hover:shadow-2xl hover:scale-105"
            >
              Get Started Now
            </Link>
            <a
              href="#features"
              className="bg-transparent border-2 border-white text-white px-8 py-4 rounded-xl font-semibold hover:bg-white hover:text-primary-600 transition-all"
            >
              Learn More
            </a>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-12 mb-12">
            <div className="md:col-span-2">
              <div className="flex items-center gap-3 mb-4">
                <span className="text-3xl">♻️</span>
                <span className="text-2xl font-bold">TrashPoint</span>
              </div>
              <p className="text-gray-400 leading-relaxed mb-6">
                Making waste management smarter, one QR code at a time. Building sustainable communities for a cleaner future.
              </p>
              <div className="flex gap-4">
                <a href="#" className="w-10 h-10 bg-gray-800 rounded-full flex items-center justify-center hover:bg-primary-600 transition">
                  <span>📘</span>
                </a>
                <a href="#" className="w-10 h-10 bg-gray-800 rounded-full flex items-center justify-center hover:bg-primary-600 transition">
                  <span>🐦</span>
                </a>
                <a href="#" className="w-10 h-10 bg-gray-800 rounded-full flex items-center justify-center hover:bg-primary-600 transition">
                  <span>📷</span>
                </a>
              </div>
            </div>
            <div>
              <h4 className="text-lg font-semibold mb-4">Quick Links</h4>
              <ul className="space-y-3">
                <li><a href="#home" className="text-gray-400 hover:text-white transition">Home</a></li>
                <li><a href="#about" className="text-gray-400 hover:text-white transition">About</a></li>
                <li><a href="#features" className="text-gray-400 hover:text-white transition">Features</a></li>
                <li><Link to="/login" className="text-gray-400 hover:text-white transition">Admin Login</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="text-lg font-semibold mb-4">Contact Us</h4>
              <ul className="space-y-3 text-gray-400">
                <li className="flex items-center gap-2">
                  <span>📧</span>
                  <span>info@trashpoint.com</span>
                </li>
                <li className="flex items-center gap-2">
                  <span>📱</span>
                  <span>+1 234 567 8900</span>
                </li>
                <li className="flex items-center gap-2">
                  <span>📍</span>
                  <span>123 Green St, City</span>
                </li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-800 pt-8 text-center text-gray-400">
            <p>&copy; 2025 TrashPoint. All rights reserved. Built with 💚 for a sustainable future.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}

export default Home