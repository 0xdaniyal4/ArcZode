/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Web3Provider } from './Web3Provider';
import { ToastProvider } from './components/Toast';
import AnimatedBackground from './components/AnimatedBackground';
import Navbar from './components/Navbar';
import Footer from './components/Footer';

// Pages
import Home from './pages/Home';
import Swap from './pages/Swap';
import Liquidity from './pages/Liquidity';
import Stake from './pages/Stake';
import Faucet from './pages/Faucet';
import Analytics from './pages/Analytics';
import Portfolio from './pages/Portfolio';
import Admin from './pages/Admin';

export default function App() {
  return (
    <Router>
      <ToastProvider>
        <Web3Provider>
          {/* Core Layout with Canvas background */}
          <div className="min-h-screen flex flex-col font-sans relative text-white bg-dark-bg">
            {/* Layered Floating Canvas */}
            <AnimatedBackground />

            {/* Navigation Header */}
            <Navbar />

            {/* Main Application Canvas stage */}
            <main className="flex-grow mx-auto max-w-7xl w-full px-4 sm:px-6 lg:px-8 py-8 relative z-10">
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/swap" element={<Swap />} />
                <Route path="/liquidity" element={<Liquidity />} />
                <Route path="/stake" element={<Stake />} />
                <Route path="/faucet" element={<Faucet />} />
                <Route path="/analytics" element={<Analytics />} />
                <Route path="/portfolio" element={<Portfolio />} />
                <Route path="/admin" element={<Admin />} />
              </Routes>
            </main>

            {/* Application Footer */}
            <Footer />
          </div>
        </Web3Provider>
      </ToastProvider>
    </Router>
  );
}
