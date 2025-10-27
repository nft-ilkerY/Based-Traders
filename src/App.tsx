import { useState } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthKitProvider } from '@farcaster/auth-kit'
import TradingInterface from './components/TradingInterface'
import Profile from './components/Profile'
import Leaderboard from './components/Leaderboard'
import '@farcaster/auth-kit/styles.css'

const queryClient = new QueryClient()

const authKitConfig = {
  rpcUrl: 'https://mainnet.optimism.io',
  domain: window.location.host,
  siweUri: window.location.origin,
}

// Debug: Log configuration
console.log('AuthKit Config:', authKitConfig)

function App() {
  const [currentPage, setCurrentPage] = useState<'trading' | 'profile' | 'leaderboard'>('trading')

  return (
    <AuthKitProvider config={authKitConfig}>
      <QueryClientProvider client={queryClient}>
        <div className="min-h-screen bg-gradient-to-br from-[#090a0f] via-[#0a0b10] to-[#0b0c11] text-white">
            {/* Modern Navigation with Glassmorphism */}
            <nav className="border-b border-gray-700/30 bg-gradient-to-r from-[#0f1117]/80 to-[#0a0c12]/80 backdrop-blur-xl sticky top-0 z-50 shadow-lg">
              <div className="max-w-7xl mx-auto px-4">
                <div className="flex gap-2">
                  <button
                    onClick={() => setCurrentPage('trading')}
                    className={`py-4 px-6 border-b-2 transition-all duration-300 font-medium relative group ${
                      currentPage === 'trading'
                        ? 'border-[#0000FF] text-white'
                        : 'border-transparent text-gray-400 hover:text-white'
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <span className="text-lg">📈</span>
                      Trading
                    </span>
                    {currentPage === 'trading' && (
                      <div className="absolute inset-0 bg-[#0000FF]/5 rounded-t-lg"></div>
                    )}
                  </button>
                  <button
                    onClick={() => setCurrentPage('profile')}
                    className={`py-4 px-6 border-b-2 transition-all duration-300 font-medium relative group ${
                      currentPage === 'profile'
                        ? 'border-[#0000FF] text-white'
                        : 'border-transparent text-gray-400 hover:text-white'
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <span className="text-lg">👤</span>
                      Profile
                    </span>
                    {currentPage === 'profile' && (
                      <div className="absolute inset-0 bg-[#0000FF]/5 rounded-t-lg"></div>
                    )}
                  </button>
                  <button
                    onClick={() => setCurrentPage('leaderboard')}
                    className={`py-4 px-6 border-b-2 transition-all duration-300 font-medium relative group ${
                      currentPage === 'leaderboard'
                        ? 'border-[#0000FF] text-white'
                        : 'border-transparent text-gray-400 hover:text-white'
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <span className="text-lg">🏆</span>
                      Leaderboard
                    </span>
                    {currentPage === 'leaderboard' && (
                      <div className="absolute inset-0 bg-[#0000FF]/5 rounded-t-lg"></div>
                    )}
                  </button>
                </div>
              </div>
            </nav>

            {/* Page Content */}
            {currentPage === 'trading' ? (
              <TradingInterface />
            ) : currentPage === 'profile' ? (
              <Profile />
            ) : (
              <Leaderboard />
            )}
        </div>
      </QueryClientProvider>
    </AuthKitProvider>
  )
}

export default App
