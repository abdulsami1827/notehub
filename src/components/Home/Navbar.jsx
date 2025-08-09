import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Menu, X, User } from "lucide-react";
import Lenis from "lenis";
import { useAuth } from '../../contexts/AuthContext'; 

const Navbar = ({ onLoginClick }) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const navigate = useNavigate();
  const { isLoggedIn, loading } = useAuth();
  if (loading) return null;

  const [lenis, setLenis] = useState(null);

  useEffect(() => {
    const lenisInstance = new Lenis({
      duration: 1.2,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smooth: true,
    });

    const raf = (time) => {
      lenisInstance.raf(time);
      requestAnimationFrame(raf);
    };

    requestAnimationFrame(raf);
    setLenis(lenisInstance);
  }, []);

  // Close menu when clicking outside or on escape
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (isMenuOpen && !event.target.closest('nav')) {
        setIsMenuOpen(false);
      }
    };

    const handleEscape = (event) => {
      if (event.key === 'Escape' && isMenuOpen) {
        setIsMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isMenuOpen]);

  // Prevent body scroll when menu is open on mobile
  useEffect(() => {
    if (isMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isMenuOpen]);

  const scrollToTop = () => {
    lenis?.scrollTo(0, { offset: 0 });
  };

  const scrollToSection = (id) => {
    const target = document.querySelector(id);
    if (target && lenis) {
      lenis.scrollTo(target);
    }
  };

  const handleAuthClick = () => {
    if (isLoggedIn) {
      navigate("/dashboard");
    } else {
      onLoginClick();
    }
    setIsMenuOpen(false); // Close menu after navigation
  };

  const handleNavigation = (sectionId) => {
    scrollToSection(sectionId);
    setIsMenuOpen(false);
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-black/10 backdrop-blur-2xl border-b border-white/10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-20">
          {/* Logo */}
          <div
            onClick={() => {
              navigate("/");
              scrollToTop();
              setIsMenuOpen(false);
            }}
            className="flex items-center space-x-2 cursor-pointer group"
          >
            <img
              src="/notehub-logo.png"
              alt="NoteHub Logo"
              className="w-7 h-7 sm:w-8 sm:h-8 rounded-md transition-transform group-hover:scale-105"
            />
            <span className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-violet-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
              NoteHub
            </span>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden lg:flex items-center space-x-6 xl:space-x-8">
            <button
              onClick={() => scrollToSection("#features")}
              className="text-white/70 hover:text-white transition-all duration-300 font-medium hover:scale-105 px-3 py-2 rounded-lg hover:bg-white/5"
            >
              Features
            </button>
            <button
              onClick={() => scrollToSection("#how-it-works")}
              className="text-white/70 hover:text-white transition-all duration-300 font-medium hover:scale-105 px-3 py-2 rounded-lg hover:bg-white/5"
            >
              How it Works
            </button>
            <button
              onClick={() => scrollToSection("#testimonials")}
              className="text-white/70 hover:text-white transition-all duration-300 font-medium hover:scale-105 px-3 py-2 rounded-lg hover:bg-white/5"
            >
              Reviews
            </button>
            <button
              onClick={() => scrollToSection("#contact")}
              className="text-white/70 hover:text-white transition-all duration-300 font-medium hover:scale-105 px-3 py-2 rounded-lg hover:bg-white/5"
            >
              Contact Us
            </button>
          </div>

          {/* Desktop Auth Section */}
          <div className="hidden lg:flex items-center space-x-4">
            {isLoggedIn ? (
              <div className="flex items-center space-x-3">
                <div className="flex items-center space-x-2 px-3 py-2 bg-white/10 backdrop-blur-sm rounded-full border border-white/20">
                  <div className="w-7 h-7 bg-gradient-to-r from-violet-500 to-purple-600 rounded-full flex items-center justify-center">
                    <User className="w-4 h-4 text-white" />
                  </div>
                  <span className="text-white/90 text-sm font-medium">
                    Student
                  </span>
                </div>

                <button
                  onClick={handleAuthClick}
                  className="group relative px-6 py-2.5 bg-gradient-to-r from-violet-500 to-purple-600 text-white rounded-full font-semibold text-sm transition-all duration-300 hover:from-violet-600 hover:to-purple-700 hover:scale-105 shadow-lg shadow-purple-500/25 hover:shadow-purple-500/40"
                >
                  <span className="flex items-center space-x-2">
                    <span>Dashboard</span>
                    <User className="w-4 h-4 group-hover:scale-110 transition-transform" />
                  </span>
                </button>
              </div>
            ) : (
              <button
                onClick={handleAuthClick}
                className="group relative px-6 xl:px-8 py-2.5 bg-gradient-to-r from-violet-500 to-purple-600 text-white rounded-full font-semibold text-sm transition-all duration-300 hover:from-violet-600 hover:to-purple-700 hover:scale-105 shadow-lg shadow-purple-500/25 hover:shadow-purple-500/40"
              >
                <span className="flex items-center space-x-2">
                  <span>Get Started</span>
                  <User className="w-4 h-4 group-hover:scale-110 transition-transform" />
                </span>
                <div className="absolute inset-0 bg-gradient-to-r from-violet-400 to-purple-500 rounded-full opacity-0 group-hover:opacity-20 transition-opacity duration-300"></div>
              </button>
            )}
          </div>

          {/* Mobile Auth Button (visible on tablet) */}
          <div className="hidden md:flex lg:hidden">
            <button
              onClick={handleAuthClick}
              className="px-4 py-2 bg-gradient-to-r from-violet-500 to-purple-600 text-white rounded-full font-semibold text-sm transition-all duration-300 hover:from-violet-600 hover:to-purple-700 shadow-lg shadow-purple-500/25"
            >
              {isLoggedIn ? "Dashboard" : "Get Started"}
            </button>
          </div>

          {/* Mobile Menu Button */}
          <button
            className="lg:hidden p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-all duration-300 touch-manipulation"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            aria-label={isMenuOpen ? "Close menu" : "Open menu"}
            aria-expanded={isMenuOpen}
          >
            {isMenuOpen ? (
              <X className="w-6 h-6" />
            ) : (
              <Menu className="w-6 h-6" />
            )}
          </button>
        </div>

        {/* Mobile Menu Overlay */}
        {isMenuOpen && (
          <div className="lg:hidden fixed inset-x-0 top-16 sm:top-20 bottom-0 bg-black/50 backdrop-blur-sm">
            <div className="bg-black/90 backdrop-blur-xl border-b border-white/10 shadow-2xl">
              <div className="px-4 sm:px-6 py-6 space-y-1">
                {/* Navigation Links */}
                <button
                  onClick={() => handleNavigation("#features")}
                  className="block w-full text-left px-4 py-4 text-white/70 hover:text-white hover:bg-white/10 transition-all duration-300 font-medium rounded-xl touch-manipulation"
                >
                  Features
                </button>
                <button
                  onClick={() => handleNavigation("#how-it-works")}
                  className="block w-full text-left px-4 py-4 text-white/70 hover:text-white hover:bg-white/10 transition-all duration-300 font-medium rounded-xl touch-manipulation"
                >
                  How it Works
                </button>
                <button
                  onClick={() => handleNavigation("#testimonials")}
                  className="block w-full text-left px-4 py-4 text-white/70 hover:text-white hover:bg-white/10 transition-all duration-300 font-medium rounded-xl touch-manipulation"
                >
                  Reviews
                </button>
                <button
                  onClick={() => handleNavigation("#contact")}
                  className="block w-full text-left px-4 py-4 text-white/70 hover:text-white hover:bg-white/10 transition-all duration-300 font-medium rounded-xl touch-manipulation"
                >
                  Contact Us
                </button>

                {/* Mobile Auth Section */}
                <div className="pt-6 border-t border-white/20 mt-6">
                  {isLoggedIn ? (
                    <div className="space-y-4">
                      <div className="flex items-center space-x-3 px-4 py-4 bg-white/10 rounded-xl border border-white/20">
                        <div className="w-10 h-10 bg-gradient-to-r from-violet-500 to-purple-600 rounded-full flex items-center justify-center flex-shrink-0">
                          <User className="w-5 h-5 text-white" />
                        </div>
                        <div>
                          <div className="text-white font-medium text-base">
                            Student
                          </div>
                          <div className="text-white/60 text-sm">
                            Logged in
                          </div>
                        </div>
                      </div>

                      <button
                        onClick={handleAuthClick}
                        className="w-full py-4 bg-gradient-to-r from-violet-500 to-purple-600 text-white rounded-xl font-semibold text-base hover:from-violet-600 hover:to-purple-700 transition-all duration-300 shadow-lg shadow-purple-500/25 touch-manipulation"
                      >
                        Go to Dashboard
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={handleAuthClick}
                      className="w-full py-4 bg-gradient-to-r from-violet-500 to-purple-600 text-white rounded-xl font-semibold text-base hover:from-violet-600 hover:to-purple-700 transition-all duration-300 shadow-lg shadow-purple-500/25 touch-manipulation"
                    >
                      Get Started
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar;